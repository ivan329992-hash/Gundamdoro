import type { HangarGroup } from '../../domain/hangar'
import { findMechaManifest, getFinalAsset } from '../../mecha/loader'
import { mechaProfiles } from '../../mecha/profiles'
import { AssetImage } from '../Mecha/AssetImage'
import { CompositeMecha } from '../Mecha/CompositeMecha'
import { getPartDefinitions, PART_SLOTS, PART_SLOT_LABELS } from '../../domain/inventory'
import { appDependencies } from '../../app/dependencies'

const date = (value: number | null) => value === null ? '未记录' : new Date(value).toLocaleDateString('zh-CN')
const minutes = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 })

export function MechaDetail({ group }: { group: HangarGroup }) {
  const entry = group.latest
  const custom = entry.kind === 'custom'
  const profile = custom ? undefined : mechaProfiles[entry.mechaId]
  const manifest = custom ? null : findMechaManifest(entry.mechaId)
  const asset = getFinalAsset(entry.mechaId)
  const parts = getPartDefinitions(appDependencies.catalog)
  return <article className="dossier" aria-labelledby="dossier-title">
    <div className="dossier-visual">
      <span className="dossier-stamp">ARCHIVE / VERIFIED BUILD</span>
      {custom && entry.composition ? <CompositeMecha parts={entry.composition} label={`${entry.mechaName} 自定义成品`} />
        : asset ? <AssetImage key={entry.mechaId} src={asset} alt={`${entry.mechaName} 整机详情`} className="mecha-image" />
          : <p className="hangar-unavailable">机型资源暂不可用，制作记录已保留</p>}
      <span className="dossier-serial">{custom ? 'CUSTOM UNIT' : entry.mechaId.toUpperCase()}</span>
    </div>
    <div className="dossier-information">
      <header className="dossier-title"><p className="eyebrow">UNIT DOSSIER / 机体档案</p><h2 id="dossier-title">{entry.mechaName}</h2><p>{profile?.codename ?? (custom ? '自定义机体' : '档案待补充')}</p></header>
      <section className="dossier-panel" aria-labelledby="parameters-title">
        <h3 id="parameters-title">01 / 机体参数</h3>
        <dl className="dossier-facts"><div><dt>任务定位</dt><dd>{profile?.role ?? (custom ? '混合配件展示' : manifest?.description ?? '暂无资料')}</dd></div><div><dt>收藏配件</dt><dd>{custom ? '5 个混合配件' : manifest ? `${manifest.totalStages} 个 · ${manifest.totalStages} 次专注` : '机型未注册'}</dd></div></dl>
        {profile && <><p className="dossier-disclaimer">{profile.origin}。以下为 0–100 概念能力指数，不代表官方性能或实际物理参数。</p>
          <div className="dossier-ratings">{([['armor', '装甲'], ['mobility', '机动'], ['firepower', '火力']] as const).map(([key, label]) => <div key={key}><span>{label}</span><meter min={0} max={100} value={profile.ratings[key]} aria-label={`${label}概念指数`} /><strong>{profile.ratings[key]}</strong></div>)}</div></>}
        {custom && entry.composition && <dl className="hangar-stats">{PART_SLOTS.map((slot) => <div key={slot}><dt>{PART_SLOT_LABELS[slot]}</dt><dd>{parts.find((part) => part.id === entry.composition?.[slot])?.mechaName ?? '配件资源暂不可用'}</dd></div>)}</dl>}
      </section>
      <section className="dossier-panel" aria-labelledby="story-title"><h3 id="story-title">02 / 背景档案</h3><p className="dossier-story">{profile?.story ?? '此机体尚无背景资料。已有成品与制作记录不受影响。'}</p>{profile && <ul className="dossier-features">{profile.features.map((feature) => <li key={feature}>{feature}</li>)}</ul>}</section>
      <section className="dossier-panel" aria-labelledby="record-title"><h3 id="record-title">03 / 我的制作记录</h3><dl className="dossier-facts"><div><dt>累计完成</dt><dd>{group.count} 次</dd></div><div><dt>累计专注</dt><dd>{group.sessions} 次 · {minutes.format(group.minutes)} 分钟</dd></div><div><dt>{group.hasUnknownDate ? '最早已知完成' : '首次完成'}</dt><dd>{date(group.firstCompletedAt)}</dd></div><div><dt>最近已知完成</dt><dd>{date(entry.completedAt)}</dd></div></dl>{group.hasUnknownDate && <p className="dossier-disclaimer">部分历史记录没有完成时间，无法确定实际首次完成日期。</p>}</section>
    </div>
  </article>
}
