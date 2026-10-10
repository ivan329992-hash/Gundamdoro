/** 【适配器·资源】用 Vite glob 打包本地 PNG，实现 AssetResolver.resolve(mechaId, path)。 */
import type { AssetResolver } from '../../application/ports'

const assets = import.meta.glob([
  '../../assets/mecha/*/parts/*.png',
  '../../assets/mecha/*/stages/stage-06.png',
  '../../assets/mecha/*/final/*.png',
  '../../assets/mecha/*/break/*.png',
], { eager: true, import: 'default', query: '?url' }) as Record<string, string>

export const bundledAssets: AssetResolver = {
  resolve: (mechaId, path) => assets[`../../assets/mecha/${mechaId}/${path}`] ?? null,
}
