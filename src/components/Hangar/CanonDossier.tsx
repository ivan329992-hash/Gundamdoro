import type { MechaCanon } from '../../mecha/profiles'

/** 展示当前形态的原作人物与剧情资料；不读取或改写个人制作记录。 */
export function CanonDossier({ canon }: { canon: MechaCanon }) {
  return (
    <>
      <section className="dossier-panel" aria-labelledby="pilot-title">
        <h3 id="pilot-title">03 / 驾驶员与首次登场</h3>
        <div className="dossier-pilot">
          <span className="dossier-pilot-label">PILOT PROFILE</span>
          <h4>{canon.pilot.name}</h4>
          <p className="dossier-affiliation">{canon.pilot.affiliation}</p>
          <p className="dossier-story">{canon.pilot.brief}</p>
        </div>
        <dl className="dossier-debut">
          <dt>首次登场</dt>
          <dd>
            <strong>{canon.debut.work}</strong>
            <p>{canon.debut.detail}</p>
          </dd>
        </dl>
      </section>
      <section className="dossier-panel" aria-labelledby="highlights-title">
        <h3 id="highlights-title">04 / 光辉事迹</h3>
        <ol className="dossier-timeline">
          {canon.highlights.map((event) => (
            <li key={event.title}>
              <span className="dossier-event-context">{event.context}</span>
              <h4>{event.title}</h4>
              <p className="dossier-story">{event.detail}</p>
            </li>
          ))}
        </ol>
        <p className="dossier-disclaimer">原作剧情摘要，包含剧情内容。</p>
      </section>
    </>
  )
}
