import type { HangarGroup } from '../../domain/hangar'
import { findMechaManifest, getFinalAsset } from '../../mecha/loader'
import { mechaProfiles } from '../../mecha/profiles'
import { AssetImage } from '../Mecha/AssetImage'
import { CompositeMecha } from '../Mecha/CompositeMecha'
import { getCompositionSlots, getPartDefinitions, PART_SLOT_LABELS } from '../../domain/inventory'
import { appDependencies } from '../../app/dependencies'
import { CanonDossier } from './CanonDossier'

const date = (value: number | null) =>
  value === null ? '未记录' : new Date(value).toLocaleDateString('zh-CN')
const minutes = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })
const ratings = [
  ['armor', '装甲'],
  ['mobility', '机动'],
  ['firepower', '火力'],
] as const

/** 只读机体档案；固定机型读取设定，自定义机型显示实际配件来源。 */
export function MechaDetail({ group }: { group: HangarGroup }) {
  const entry = group.latest
  const custom = entry.kind === 'custom'
  const composition = custom ? entry.composition : undefined
  const profile = custom ? undefined : mechaProfiles[entry.mechaId]
  const manifest = custom ? null : findMechaManifest(entry.mechaId)
  const asset = getFinalAsset(entry.mechaId)
  const parts = composition ? getPartDefinitions(appDependencies.catalog, true) : []
  const codename = profile?.codename ?? (custom ? '自定义机体' : '档案待补充')
  const role = profile?.role ?? manifest?.description ?? (custom ? '混合配件展示' : '暂无资料')

  let componentSummary = '机型未注册'
  if (custom) componentSummary = getCompositionSlots(composition ?? {}).length + ' 个混合配件'
  else if (manifest)
    componentSummary = manifest.totalStages + ' 个 · ' + manifest.totalStages + ' 次专注'

  let visual = <p className="hangar-unavailable">机型资源暂不可用，制作记录已保留</p>
  if (composition) {
    visual = (
      <CompositeMecha
        parts={composition}
        profile={entry.assemblyProfile}
        label={entry.mechaName + ' 自定义成品'}
      />
    )
  } else if (asset) {
    visual = (
      <AssetImage
        key={entry.mechaId}
        src={asset}
        alt={entry.mechaName + ' 整机详情'}
        className="mecha-image"
      />
    )
  }

  return (
    <article className="dossier" aria-labelledby="dossier-title">
      <div className="dossier-visual">
        <span className="dossier-stamp">ARCHIVE / VERIFIED BUILD</span>
        {visual}
        <span className="dossier-serial">
          {custom ? 'CUSTOM UNIT' : entry.mechaId.toUpperCase()}
        </span>
      </div>
      <div className="dossier-information">
        <header className="dossier-title">
          <p className="eyebrow">UNIT DOSSIER / 机体档案</p>
          <h2 id="dossier-title">{entry.mechaName}</h2>
          <p>{codename}</p>
        </header>
        <section className="dossier-panel" aria-labelledby="parameters-title">
          <h3 id="parameters-title">01 / 机体参数</h3>
          <dl className="dossier-facts">
            <div>
              <dt>任务定位</dt>
              <dd>{role}</dd>
            </div>
            <div>
              <dt>收藏配件</dt>
              <dd>{componentSummary}</dd>
            </div>
          </dl>
          {profile && (
            <>
              <p className="dossier-disclaimer">
                {profile.origin}。以下为 0–100 概念能力指数，不代表官方性能或实际物理参数。
              </p>
              <div className="dossier-ratings">
                {ratings.map(([key, label]) => (
                  <div key={key}>
                    <span>{label}</span>
                    <meter
                      min={0}
                      max={100}
                      value={profile.ratings[key]}
                      aria-label={label + '概念指数'}
                    />
                    <strong>{profile.ratings[key]}</strong>
                  </div>
                ))}
              </div>
            </>
          )}
          {composition && (
            <dl className="hangar-stats">
              {getCompositionSlots(composition).map((slot) => (
                <div key={slot}>
                  <dt>{PART_SLOT_LABELS[slot]}</dt>
                  <dd>
                    {parts.find((part) => part.id === composition[slot])?.mechaName ??
                      '配件资源暂不可用'}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </section>
        <section className="dossier-panel" aria-labelledby="story-title">
          <h3 id="story-title">02 / 背景档案</h3>
          <p className="dossier-story">
            {profile?.story ?? '此机体尚无背景资料。已有成品与制作记录不受影响。'}
          </p>
          {profile && (
            <ul className="dossier-features">
              {profile.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
          )}
        </section>
        {profile?.canon && <CanonDossier canon={profile.canon} />}
        <section className="dossier-panel" aria-labelledby="record-title">
          <h3 id="record-title">{profile?.canon ? '05' : '03'} / 我的制作记录</h3>
          <dl className="dossier-facts">
            <div>
              <dt>累计完成</dt>
              <dd>{group.count} 次</dd>
            </div>
            <div>
              <dt>累计专注</dt>
              <dd>
                {group.sessions} 次 · {minutes.format(group.minutes)} 分钟
              </dd>
            </div>
            <div>
              <dt>{group.hasUnknownDate ? '最早已知完成' : '首次完成'}</dt>
              <dd>{date(group.firstCompletedAt)}</dd>
            </div>
            <div>
              <dt>最近已知完成</dt>
              <dd>{date(entry.completedAt)}</dd>
            </div>
          </dl>
          {group.hasUnknownDate && (
            <p className="dossier-disclaimer">
              部分历史记录没有完成时间，无法确定实际首次完成日期。
            </p>
          )}
        </section>
      </div>
    </article>
  )
}
