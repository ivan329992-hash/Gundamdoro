import { readFile } from 'node:fs/promises'
import type { Page, TestInfo } from '@playwright/test'
import {
  test,
  expect,
  assetPath,
  openApp,
  configureTimer,
  savedState,
  seedOwnedParts,
  failProgressWrites,
} from './helpers'

declare global {
  interface Window {
    __backupCopyFailure?: boolean
  }
}

async function openBackup(page: Page) {
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '备份与恢复', exact: true }).click()
  await expect(page.getByRole('heading', { name: '备份与恢复', exact: true })).toBeVisible()
}

async function downloadBackup(page: Page, info: TestInfo) {
  const pending = page.waitForEvent('download')
  await page.getByRole('button', { name: '导出完整备份', exact: true }).click()
  const download = await pending
  expect(download.suggestedFilename()).toMatch(/^gundamdoro-.*\.gundamdoro$/)
  const path = info.outputPath('full.gundamdoro')
  await download.saveAs(path)
  return path
}

async function confirmRestore(page: Page) {
  await page
    .getByRole('checkbox', { name: '我已备份当前数据，确认覆盖进度和仓库', exact: true })
    .check()
  await page.getByRole('button', { name: '确认恢复备份', exact: true }).click()
}

test('完整备份跨独立浏览器恢复图片、草稿与仓库，素材写入中断可以重试', async ({
  page,
  browser,
  baseURL,
}, info) => {
  await seedOwnedParts(page, true)
  await openApp(page)
  await configureTimer(page)
  await page.getByRole('button', { name: '选择机型', exact: true }).click()
  await page.getByRole('button', { name: '添加我的机型', exact: true }).click()
  await page.getByRole('textbox', { name: '机型名称', exact: true }).fill('备份素材机型')
  await page.getByRole('textbox', { name: '配件 1 名称', exact: true }).fill('备份头部')
  await page.getByLabel('整机图片', { exact: true }).setInputFiles(assetPath('stages/stage-06.png'))
  await expect(page.getByRole('button', { name: '取消导入', exact: true })).toBeEnabled()
  await page.getByLabel('配件 1 图片', { exact: true }).setInputFiles(assetPath('parts/head.png'))
  await expect(page.getByRole('button', { name: '取消导入', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '保存机型', exact: true }).click()
  await page.getByRole('button', { name: '制作 备份素材机型', exact: true }).click()
  await page.getByRole('button', { name: '开始专注', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'PART SECURED', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '开始拼装', exact: true }).click()
  await expect(page.getByRole('heading', { name: '机体组装完成', exact: true })).toBeVisible()
  const source = await savedState(page)
  expect(source.hangar).toHaveLength(2)
  await openBackup(page)
  const path = await downloadBackup(page, info)

  const context = await browser.newContext({ baseURL, viewport: page.viewportSize()! })
  const target = await context.newPage()
  const errors: string[] = []
  target.on('pageerror', (error) => errors.push(error.message))
  try {
    await openApp(target)
    const original = await savedState(target)
    await openBackup(target)
    await target.getByLabel('选择备份文件', { exact: true }).setInputFiles(path)
    await expect(target.getByRole('button', { name: '确认恢复备份', exact: true })).toBeDisabled()
    await expect(target.locator('.backup-summary')).toContainText('备份素材机型')
    expect(await savedState(target)).toEqual(original)
    // 在真实 OPFS 的清单提交处制造失败，重试必须复用同一模型 ID。
    await target.evaluate(() => {
      window.__backupCopyFailure = true
      const originalWrite = FileSystemWritableFileStream.prototype.write
      FileSystemWritableFileStream.prototype.write = function (data) {
        if (window.__backupCopyFailure && typeof data === 'string' && data.includes('备份素材机型'))
          throw new DOMException('模拟素材写入失败', 'QuotaExceededError')
        return originalWrite.call(this, data)
      }
    })
    await confirmRestore(target)
    await expect(target.getByRole('main').getByRole('alert')).toContainText('当前进度未替换')
    expect(await savedState(target)).toEqual(original)
    await target.evaluate(() => {
      window.__backupCopyFailure = false
    })
    await target.getByRole('button', { name: '确认恢复备份', exact: true }).click()
    await expect(target.getByRole('status')).toContainText('恢复完成')
    expect(await savedState(target)).toEqual(source)
    await target.getByRole('button', { name: '返回应用', exact: true }).click()
    await expect(target.getByRole('heading', { name: '机体组装完成', exact: true })).toBeVisible()
    await expect
      .poll(() =>
        target
          .locator('.complete-canvas img')
          .evaluate((image) => (image as HTMLImageElement).naturalWidth),
      )
      .toBeGreaterThan(0)
    await target.reload()
    await expect(target.getByRole('heading', { name: '机体组装完成', exact: true })).toBeVisible()
    expect(await savedState(target)).toEqual(source)
    await openBackup(target)
    await target.getByLabel('选择备份文件', { exact: true }).setInputFiles(path)
    await confirmRestore(target)
    await expect(target.getByRole('status')).toContainText('恢复完成')
    expect((await savedState(target)).hangar).toHaveLength(2)
    expect(errors).toEqual([])
  } finally {
    await context.close()
  }
})

test('损坏备份被拒绝，预览后返回不会覆盖当前数据', async ({ page }, info) => {
  await seedOwnedParts(page)
  await openApp(page)
  await openBackup(page)
  const original = await savedState(page)
  const path = await downloadBackup(page, info)
  const buffer = await readFile(path)
  buffer[buffer.length - 1] ^= 1
  await page
    .getByLabel('选择备份文件', { exact: true })
    .setInputFiles({ name: 'damaged.gundamdoro', mimeType: 'application/octet-stream', buffer })
  await expect(page.getByRole('alert')).toContainText('完整性校验失败')
  await expect(page.getByRole('button', { name: '确认恢复备份', exact: true })).toHaveCount(0)
  expect(await savedState(page)).toEqual(original)
  await page.getByLabel('选择备份文件', { exact: true }).setInputFiles(path)
  await expect(page.getByRole('button', { name: '确认恢复备份', exact: true })).toBeDisabled()
  await page.getByRole('button', { name: '返回应用', exact: true }).click()
  expect(await savedState(page)).toEqual(original)
})

test('恢复进度写入失败保留原设置，解除故障后重试覆盖', async ({ page }, info) => {
  await seedOwnedParts(page)
  await openApp(page)
  await configureTimer(page, 1)
  const source = await savedState(page)
  await openBackup(page)
  const path = await downloadBackup(page, info)
  await page.getByRole('button', { name: '返回应用', exact: true }).click()
  await configureTimer(page, 13)
  const original = await savedState(page)
  await openBackup(page)
  await page.getByLabel('选择备份文件', { exact: true }).setInputFiles(path)
  await expect(page.getByRole('button', { name: '确认恢复备份', exact: true })).toBeDisabled()
  await failProgressWrites(page, true)
  await confirmRestore(page)
  await expect(page.getByRole('main').getByRole('alert')).toContainText('当前进度未替换')
  expect(await savedState(page)).toEqual(original)
  await failProgressWrites(page, false)
  await page.getByRole('button', { name: '确认恢复备份', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('恢复完成')
  expect(await savedState(page)).toEqual(source)
})
