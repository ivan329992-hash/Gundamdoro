import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { test as base, expect, type Page } from '@playwright/test'
import { APP_STORAGE_KEY, APP_STORAGE_VERSION } from '../../src/application/snapshot'
import { createDefaultData } from '../../src/application/state'
import { createMechaCatalog } from '../../src/domain/catalog'
import { getPartDefinitions } from '../../src/domain/inventory'
import type { AppData, MechaManifest } from '../../src/domain/types'
import { createFakeApp } from '../../src/test/fakeApp'

declare global {
  interface Window {
    __gundamdoroE2E?: { failWrites: boolean }
  }
}

export const test = base.extend<{ noUncaughtErrors: void }>({
  noUncaughtErrors: [
    async ({ page }, use) => {
      const errors: string[] = []
      page.on('pageerror', (error) => errors.push(error.message))
      await use()
      expect(errors, '页面不应出现未处理的 JavaScript 错误').toEqual([])
    },
    { auto: true },
  ],
})
export { expect }

export function assetPath(relative: string): string {
  return fileURLToPath(new URL('../../src/assets/mecha/mecha-01/' + relative, import.meta.url))
}

export async function openApp(page: Page): Promise<void> {
  await page.goto('/?fast=1')
  await expect(page.getByRole('button', { name: '开始专注', exact: true })).toBeVisible()
}

/** 所有快照读取只作用于本测试上下文，不导入浏览器内的 store 模块。 */
export async function savedState(page: Page): Promise<AppData> {
  return page.evaluate((key) => {
    const saved = localStorage.getItem(key)
    if (!saved) throw new Error('测试存档尚未建立')
    return JSON.parse(saved).state as AppData
  }, APP_STORAGE_KEY)
}

export async function configureTimer(page: Page, focusMinutes = 1): Promise<void> {
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page
    .getByRole('spinbutton', { name: '专注时长（分钟）', exact: true })
    .fill(String(focusMinutes))
  await page.getByRole('spinbutton', { name: '休息时长（分钟）', exact: true }).fill('60')
  await page.getByRole('checkbox', { name: '完成提示音', exact: true }).uncheck()
  await page.getByRole('checkbox', { name: '完成时发送系统通知', exact: true }).uncheck()
  await page.getByRole('button', { name: '保存设置', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '计时设置', exact: true })).not.toBeVisible()
}

/** 仅为工作台测试准备已有永久库存；专注解锁另由完整循环用例实走验证。 */
export async function seedOwnedParts(page: Page): Promise<void> {
  const manifest = JSON.parse(
    readFileSync(new URL('../../src/mecha/mecha-01/manifest.json', import.meta.url), 'utf8'),
  ) as MechaManifest
  const catalog = createMechaCatalog([manifest], manifest.id)
  const state = createDefaultData({ ...createFakeApp(1000).dependencies, catalog })
  state.unlockedParts = getPartDefinitions(catalog).map((part) => part.id)
  state.settings = {
    focusMinutes: 1,
    breakMinutes: 60,
    soundEnabled: false,
    notificationsEnabled: false,
  }
  await page.addInitScript(
    ({ key, snapshot }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(snapshot))
    },
    { key: APP_STORAGE_KEY, snapshot: { state, version: APP_STORAGE_VERSION } },
  )
}

/** 模拟进度写入失败，不拦截机型文件库，也不清空已成功保存的快照。 */
export async function failProgressWrites(page: Page, fail: boolean): Promise<void> {
  await page.evaluate(
    ({ key, fail }) => {
      if (!window.__gundamdoroE2E) {
        window.__gundamdoroE2E = { failWrites: false }
        const original = Storage.prototype.setItem
        Storage.prototype.setItem = function (storageKey, value) {
          if (this === localStorage && storageKey === key && window.__gundamdoroE2E?.failWrites)
            throw new DOMException('模拟测试配额不足', 'QuotaExceededError')
          return original.call(this, storageKey, value)
        }
      }
      window.__gundamdoroE2E.failWrites = fail
    },
    { key: APP_STORAGE_KEY, fail },
  )
}
