import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect, openApp } from './helpers'

test('构建和测试产物不会触发页面刷新或关闭设置弹窗', async ({ page }) => {
  await openApp(page)
  await page.getByRole('button', { name: '设置', exact: true }).click()
  const directories: string[] = []
  try {
    for (const relative of ['src-tauri/target', 'src-tauri/gen', 'output', '.playwright-cli']) {
      const root = fileURLToPath(new URL('../../' + relative + '/', import.meta.url))
      await mkdir(root, { recursive: true })
      // 只创建、清理本测试独占的随机临时目录，不修改已有构建文件。
      const directory = await mkdtemp(join(root, 'gundamdoro-e2e-'))
      directories.push(directory)
      await writeFile(join(directory, 'index.html'), '<!doctype html><title>watch probe</title>')
    }
    // 覆盖 watcher 的防抖窗口；这是检查“不发生刷新”，不能用瞬时断言代替。
    await page.waitForTimeout(1500)
    await expect(page.getByRole('dialog', { name: '计时设置', exact: true })).toBeVisible()
  } finally {
    await Promise.all(
      directories.map((directory) => rm(directory, { recursive: true, force: true })),
    )
  }
})
