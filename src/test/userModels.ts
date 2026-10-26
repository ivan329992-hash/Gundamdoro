import type { UserModelDraft } from '../domain/userModels'

export const draftModel = (): UserModelDraft => ({
  name: ' 我的机型 ',
  description: ' 用户创作 ',
  finalImage: {
    bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    width: 1080,
    height: 1440,
  },
  parts: ['核心', '护盾', '武器'].map((name) => ({
    name,
    image: { bytes: new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), width: 500, height: 500 },
  })),
})
