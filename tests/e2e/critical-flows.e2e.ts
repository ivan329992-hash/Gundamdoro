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

test('暂停自定义拼装后配件仍可浏览，历史作品与草稿保留但不展示', async ({ page }) => {
  await seedOwnedParts(page, true)
  await openApp(page)
  const before = await savedState(page)
  await page.getByRole('button', { name: /配件仓库（/ }).click()
  await expect(page.getByRole('heading', { name: '配件仓库', exact: true })).toBeVisible()
  await expect(page.getByRole('tab', { name: '自定义拼装', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '随机搭配', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '保存到成品仓库', exact: true })).toHaveCount(0)
  expect((await savedState(page)).workbench).toEqual(before.workbench)
  await page.getByRole('checkbox', { name: '显示未解锁', exact: true }).check()
  await page.keyboard.press('End')
  await expect(page.getByRole('tab', { name: '自定义拼装', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '返回', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: '仓库（0）', exact: true }).click()
  await expect(page.getByText('仓库还没有成品', { exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: '历史自定义作品', exact: true })).toHaveCount(0)
  expect((await savedState(page)).hangar).toEqual(before.hangar)
  expect((await savedState(page)).workbench).toEqual(before.workbench)
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
