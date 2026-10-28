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

test('首页主操作可见，设置弹窗隔离键盘并恢复焦点', async ({ page }) => {
  await openApp(page)
  const start = await page.getByRole('button', { name: '开始专注', exact: true }).boundingBox()
  expect(start).not.toBeNull()
  expect(start!.y + start!.height).toBeLessThanOrEqual(page.viewportSize()!.height)
  const settings = page.getByRole('button', { name: '设置', exact: true })
  await settings.click()
  const dialog = page.getByRole('dialog', { name: '计时设置', exact: true })
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab')
    expect(
      await dialog.evaluate(
        (element) => element.contains(document.activeElement) || !document.hasFocus(),
      ),
    ).toBe(true)
  }
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(settings).toBeFocused()
  expect((await savedState(page)).phase).toBe('READY')
})

test('完整专注循环、手动拼装与完成页保存失败重试不重复归档', async ({ page }) => {
  await openApp(page)
  await configureTimer(page, 10)
  await page.getByRole('button', { name: '开始专注', exact: true }).click()
  await page.getByRole('button', { name: '暂停', exact: true }).click()
  const paused = (await savedState(page)).timer
  await page.waitForTimeout(350)
  expect((await savedState(page)).timer.remainingMs).toBe(paused.remainingMs)
  await page.getByRole('button', { name: '继续', exact: true }).click()
  await page.getByRole('button', { name: '取消本次', exact: true }).click()
  expect((await savedState(page)).assembly.currentStage).toBe(0)
  await configureTimer(page)
  const count = (await savedState(page)).assembly.totalStages
  for (let stage = 1; stage <= count; stage++) {
    await page.getByRole('button', { name: '开始专注', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'PART SECURED', exact: true })).toBeVisible()
    expect((await savedState(page)).assembly.currentStage).toBe(stage)
    if (stage < count) await page.getByRole('button', { name: '结束休息', exact: true }).click()
  }
  const assemble = page.getByRole('button', { name: '开始拼装', exact: true })
  await expect(assemble).toBeVisible()
  const collected = await savedState(page)
  expect(collected.phase).toBe('READY')
  expect(collected.assembly.completedFocusSessions).toBe(count)
  expect(collected.unlockedParts).toHaveLength(count)
  expect(collected.hangar).toHaveLength(0)
  await failProgressWrites(page, true)
  await assemble.click()
  await expect(page.getByRole('heading', { name: '机体组装完成', exact: true })).toBeVisible()
  await expect(
    page.getByText('机体已完成，尚未保存到本机，请重试保存。', { exact: true }),
  ).toBeVisible()
  expect((await savedState(page)).hangar).toHaveLength(0)
  await failProgressWrites(page, false)
  await page.getByRole('button', { name: '重试保存', exact: true }).click()
  await expect(page.getByText('已保存到仓库', { exact: true })).toBeVisible()
  const saved = await savedState(page)
  expect(saved.hangar).toHaveLength(1)
  expect(saved.totalFocusedMinutes).toBe(collected.totalFocusedMinutes)
  expect(saved.assembly.completedFocusSessions).toBe(count)
  await page.reload()
  await expect(page.getByRole('heading', { name: '机体组装完成', exact: true })).toBeVisible()
  expect((await savedState(page)).hangar).toHaveLength(1)
  await page.getByRole('button', { name: '再次制作', exact: true }).click()
  const restarted = await savedState(page)
  expect(restarted.assembly.currentStage).toBe(0)
  expect(restarted.hangar).toHaveLength(1)
  expect(restarted.unlockedParts).toHaveLength(count)
})

test('工作台大预览关闭不退出，保存失败重试并刷新后保留作品', async ({ page }) => {
  await seedOwnedParts(page)
  await openApp(page)
  await page.getByRole('button', { name: /配件仓库与拼装/ }).click()
  await page.getByRole('tab', { name: '自定义拼装', exact: true }).click()
  const expand = page.getByRole('button', { name: '放大预览', exact: true })
  await expand.click()
  await expect(page.getByRole('dialog', { name: '机体预览', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: '机体预览', exact: true })).not.toBeVisible()
  await expect(page.getByRole('heading', { name: '配件仓库与拼装台', exact: true })).toBeVisible()
  await expect(expand).toBeFocused()
  await page.getByRole('textbox', { name: /机体名称/ }).fill('回归测试机体')
  await failProgressWrites(page, true)
  await page.getByRole('button', { name: '保存到成品仓库', exact: true }).click()
  await expect(
    page.getByText('作品尚未保存到本机，请重试；成功前请勿关闭或刷新。', { exact: true }),
  ).toBeVisible()
  expect((await savedState(page)).hangar).toHaveLength(0)
  await failProgressWrites(page, false)
  await page
    .getByRole('complementary', { name: '拼装保存', exact: true })
    .getByRole('button', { name: '重试保存', exact: true })
    .click()
  await expect(page.getByRole('button', { name: '已保存到仓库', exact: true })).toBeDisabled()
  const saved = await savedState(page)
  expect(saved.hangar).toHaveLength(1)
  expect(saved.hangar[0].mechaName).toBe('回归测试机体')
  expect(saved.assembly.completedFocusSessions).toBe(0)
  expect(saved.totalFocusedMinutes).toBe(0)
  await page.reload()
  await page.getByRole('button', { name: /仓库（1）/ }).click()
  await expect(page.getByRole('heading', { name: '回归测试机体', exact: true })).toBeVisible()
  expect((await savedState(page)).hangar).toHaveLength(1)
})

test('机型图片上传、配件排序移除及资源库刷新恢复', async ({ page }) => {
  await openApp(page)
  await configureTimer(page)
  await page.getByRole('button', { name: '选择机型', exact: true }).click()
  await page.getByRole('button', { name: '添加我的机型', exact: true }).click()
  await page.getByRole('textbox', { name: '机型名称', exact: true }).fill('导入回归机型')
  await page.getByRole('textbox', { name: '配件 1 名称', exact: true }).fill('测试头部')
  await page.getByLabel('整机图片', { exact: true }).setInputFiles(assetPath('stages/stage-06.png'))
  await expect(page.getByRole('button', { name: '取消导入', exact: true })).toBeEnabled()
  await page.getByLabel('配件 1 图片', { exact: true }).setInputFiles(assetPath('parts/head.png'))
  await expect(page.getByRole('button', { name: '取消导入', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '添加配件', exact: true }).click()
  await page.getByRole('textbox', { name: '配件 2 名称', exact: true }).fill('测试躯干')
  await page.getByLabel('配件 2 图片', { exact: true }).setInputFiles(assetPath('parts/torso.png'))
  await expect(page.getByRole('button', { name: '取消导入', exact: true })).toBeEnabled()
  await page.getByRole('button', { name: '上移配件 2', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '配件 1 名称', exact: true })).toHaveValue(
    '测试躯干',
  )
  await page.getByRole('button', { name: '移除配件 2', exact: true }).click()
  await expect(page.getByRole('textbox', { name: '配件 2 名称', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '保存机型', exact: true }).click()
  await expect(page.getByRole('heading', { name: '选择机型', exact: true })).toBeVisible()
  const before = await savedState(page)
  expect(before.unlockedParts).toHaveLength(0)
  expect(before.hangar).toHaveLength(0)
  await page.reload()
  await page.getByRole('button', { name: '选择机型', exact: true }).click()
  await expect(page.getByRole('heading', { name: '导入回归机型', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '制作 导入回归机型', exact: true }).click()
  const selected = await savedState(page)
  expect(selected.assembly.mechaId).toMatch(/^user-/)
  expect(selected.assembly.totalStages).toBe(1)
  await page.getByRole('button', { name: '开始专注', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'PART SECURED', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '开始拼装', exact: true }).click()
  await expect(page.getByRole('heading', { name: '机体组装完成', exact: true })).toBeVisible()
  expect((await savedState(page)).hangar[0].mechaId).toBe(selected.assembly.mechaId)
})
