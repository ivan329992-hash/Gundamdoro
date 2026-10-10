/** 【适配器·图鉴】加载 src/mecha 下各机型的 manifest.json，默认机型 mecha-01。 */
import { createMechaCatalog } from '../../domain/catalog'

const sources = import.meta.glob('../../mecha/*/manifest.json', { eager: true, import: 'default' })

export const bundledCatalog = createMechaCatalog(Object.values(sources), 'mecha-01')
