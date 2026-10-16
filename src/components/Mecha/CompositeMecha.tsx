import type { DraftComposition } from '../../domain/types'
import { RegisteredMecha } from './RegisteredMecha'
import { registeredAssemblyProfiles } from '../../adapters/assets/registeredAssembly'

export function CompositeMecha({ parts, label = '自定义机体预览', profile }: { parts: DraftComposition; label?: string; profile?: string }) {
  if (profile && registeredAssemblyProfiles[profile]) return <RegisteredMecha parts={parts} label={label} config={registeredAssemblyProfiles[profile]} />
  return <p className="composition-error" role="status">{profile
    ? '该装配版本暂不可用，配方和制作记录已保留。'
    : '旧版装配已停用，配方和制作记录已保留。'}</p>
}
