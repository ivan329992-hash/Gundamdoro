import { useState } from 'react'
import { appAssets } from '../app/dependencies'
import {
  registeredAssembly,
  registeredPartSource,
  type RegisteredAssembly,
} from '../adapters/assets/registeredAssembly'
import { RegisteredMecha } from '../components/Mecha/RegisteredMecha'
import { PART_SLOT_LABELS } from '../domain/inventory'
import type { Composition, PartSlot } from '../domain/types'
import './assembly-lab.css'

export default function AssemblyLab() {
  const [config, setConfig] = useState<RegisteredAssembly>(() =>
    structuredClone(registeredAssembly),
  )
  const modelIds = Object.keys(config.models)
  const slots = config.slots
  const [group, setGroup] = useState(0)
  const [gallery, setGallery] = useState('coverage')
  const [pairA, setPairA] = useState(modelIds[0])
  const [pairB, setPairB] = useState(modelIds[1])
  const [galleryWings, setGalleryWings] = useState(false)
  const [modelId, setModelId] = useState(modelIds[0])
  const [slot, setSlot] = useState<PartSlot>('torso')
  const [field, setField] = useState('segment:0')
  const [parts, setParts] = useState<Composition>(
    () => Object.fromEntries(slots.map((part) => [part, `${modelIds[0]}:${part}`])) as Composition,
  )
  const model = config.models[modelId]
  const part = model.parts[slot]!
  const source = registeredPartSource(model, part)
  const optionalSlots = config.optionalSlots ?? []
  const editableSlots = [...slots, ...optionalSlots].filter((partSlot) => model.parts[partSlot])
  const wingIds = modelIds.filter((id) => config.models[id].parts.wings).map((id) => `${id}:wings`)
  const [kind, key] = field.split(':')
  const current = (
    kind === 'joint'
      ? model.joints[key as keyof typeof model.joints]
      : kind === 'mask'
        ? part.mask[Number(key)]
        : part.segment[Number(key)]
  )!
  const updatePoint = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    const copy = structuredClone(config)
    const point: [number, number] = [
      Math.round(Math.max(0, Math.min(source.image[0], x))),
      Math.round(Math.max(0, Math.min(source.image[1], y))),
    ]
    if (kind === 'segment') {
      const other = part.segment[Number(key) === 0 ? 1 : 0]
      if (Math.hypot(point[0] - other[0], point[1] - other[1]) < 1) return
    }
    if (kind === 'joint') copy.models[modelId].joints[key as keyof typeof model.joints] = point
    else if (kind === 'mask') copy.models[modelId].parts[slot]!.mask[Number(key)] = point
    else copy.models[modelId].parts[slot]!.segment[Number(key)] = point
    setConfig(copy)
  }
  const fromPointer = (event: React.PointerEvent<SVGSVGElement>) => {
    const matrix = event.currentTarget.getScreenCTM()
    if (!matrix) return
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    updatePoint(point.x, point.y)
  }
  const recipes =
    gallery === 'pair'
      ? Array.from(
          { length: 2 ** slots.length },
          (_, index) =>
            Object.fromEntries(
              slots.map((part, bit) => [part, `${[pairA, pairB][(index >> bit) & 1]}:${part}`]),
            ) as Composition,
        )
      : [
          ...modelIds.map(
            (id) => Object.fromEntries(slots.map((part) => [part, `${id}:${part}`])) as Composition,
          ),
          ...Array.from(
            { length: modelIds.length ** 2 },
            (_, index) =>
              Object.fromEntries(
                slots.map((part, offset) => [
                  part,
                  `${modelIds[part === 'torso' ? index % modelIds.length : part === 'hips' ? Math.floor(index / modelIds.length) : (index + offset) % modelIds.length]}:${part}`,
                ]),
              ) as Composition,
          ),
        ]
  const exportConfig = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(config, null, 2) + '\n'], { type: 'application/json' }),
    )
    const link = document.createElement('a')
    link.href = url
    link.download = 'registered-assembly-v4.json'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  return (
    <main className="assembly-lab">
      <header>
        <p className="phase-label">DEVELOPMENT ONLY / STANDARD FRONT V4</p>
        <h1>七机型装配校准与组合验收</h1>
        <p>独立样板，不读取或改变你的解锁、计时、配方与仓库。生产版不提供此入口。</p>
        <a href="/">返回应用</a>
      </header>
      <section className="lab-workspace">
        <div className="lab-controls">
          <h2>原图蒙版与语义连接点</h2>
          <label>
            机型
            <select
              value={modelId}
              onChange={(event) => {
                setModelId(event.target.value)
                if (!config.models[event.target.value].parts[slot]) setSlot('torso')
                setField('segment:0')
              }}
            >
              {modelIds.map((id) => (
                <option key={id}>{id}</option>
              ))}
            </select>
          </label>
          <label>
            部位
            <select
              value={slot}
              onChange={(event) => {
                setSlot(event.target.value as PartSlot)
                setField('segment:0')
              }}
            >
              {editableSlots.map((part) => (
                <option key={part} value={part}>
                  {PART_SLOT_LABELS[part]}
                </option>
              ))}
            </select>
          </label>
          <label>
            编辑点
            <select value={field} onChange={(event) => setField(event.target.value)}>
              <option value="segment:0">连接点 / 骨段起点</option>
              <option value="segment:1">尺寸参考 / 骨段终点</option>
              {part.mask.map((_, index) => (
                <option key={index} value={`mask:${index}`}>
                  蒙版顶点 {index + 1}
                </option>
              ))}
              {slot === 'torso' &&
                Object.keys(model.joints).map((joint) => (
                  <option key={joint} value={`joint:${joint}`}>
                    {PART_SLOT_LABELS[joint as PartSlot]}挂点
                  </option>
                ))}
            </select>
          </label>
          <label>
            X
            <input
              type="number"
              value={current[0]}
              onChange={(event) => updatePoint(event.currentTarget.valueAsNumber, current[1])}
            />
          </label>
          <label>
            Y
            <input
              type="number"
              value={current[1]}
              onChange={(event) => updatePoint(current[0], event.currentTarget.valueAsNumber)}
            />
          </label>
          <p>点击或拖动原图设置选中点，右侧即时预览。只等比缩放和旋转，不拉扁图像。</p>
          <button type="button" onClick={exportConfig}>
            导出校准 JSON
          </button>
          <button
            type="button"
            className="secondary-button"
            onClick={() => setConfig(structuredClone(registeredAssembly))}
          >
            恢复已验收配置
          </button>
        </div>
        <svg
          className="lab-source"
          aria-label="原图校准画布"
          viewBox={`0 0 ${source.image.join(' ')}`}
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId)
            fromPointer(event)
          }}
          onPointerMove={(event) => {
            if (event.buttons === 1) fromPointer(event)
          }}
        >
          <image
            href={appAssets.resolve(modelId, source.asset) ?? undefined}
            width={source.image[0]}
            height={source.image[1]}
          />
          <polygon
            points={part.mask.map((point) => point.join(',')).join(' ')}
            fill="#4dddb933"
            stroke="#55efc4"
            strokeWidth="3"
          />
          <line
            x1={part.segment[0][0]}
            y1={part.segment[0][1]}
            x2={part.segment[1][0]}
            y2={part.segment[1][1]}
            stroke="#ffc46b"
            strokeWidth="5"
          />
          {part.mask.map((point, index) => (
            <circle key={index} cx={point[0]} cy={point[1]} r="5" fill="#55efc4" />
          ))}
          <circle
            cx={current[0]}
            cy={current[1]}
            r="11"
            fill="#ff7979"
            stroke="white"
            strokeWidth="3"
          />
        </svg>
        <div className="lab-preview">
          <h2>独立混搭样板</h2>
          <RegisteredMecha parts={parts} config={config} />
          {slots.map((part) => (
            <label key={part}>
              {PART_SLOT_LABELS[part]}
              <select
                value={parts[part]}
                onChange={(event) => setParts({ ...parts, [part]: event.target.value })}
              >
                {modelIds.map((id) => (
                  <option key={id} value={`${id}:${part}`}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
          ))}
          {optionalSlots.map((partSlot) => (
            <label key={partSlot}>
              {PART_SLOT_LABELS[partSlot]}
              <select
                value={parts[partSlot] ?? ''}
                onChange={(event) => {
                  const next = { ...parts }
                  if (event.target.value) next[partSlot] = event.target.value
                  else delete next[partSlot]
                  setParts(next)
                }}
              >
                <option value="">不装备</option>
                {modelIds
                  .filter((id) => config.models[id].parts[partSlot])
                  .map((id) => (
                    <option key={id} value={`${id}:${partSlot}`}>
                      {id}
                    </option>
                  ))}
              </select>
            </label>
          ))}
        </div>
      </section>
      <h2>组合检查 / {slots.map((part) => PART_SLOT_LABELS[part]).join('、')}</h2>
      {wingIds.length > 0 && (
        <label>
          <input
            type="checkbox"
            checked={galleryWings}
            onChange={(event) => setGalleryWings(event.target.checked)}
          />
          样板装备飞翼翅膀
        </label>
      )}
      <label>
        检查范围
        <select
          value={gallery}
          onChange={(event) => {
            setGallery(event.target.value)
            setGroup(0)
          }}
        >
          <option value="coverage">七机型代表组合</option>
          <option value="pair">两机型全部 128 种组合</option>
        </select>
      </label>
      {gallery === 'pair' && (
        <div className="lab-pair-picker">
          <label>
            机型 A
            <select
              value={pairA}
              onChange={(event) => {
                setPairA(event.target.value)
                setGroup(0)
              }}
            >
              {modelIds.map((id) => (
                <option key={id}>{id}</option>
              ))}
            </select>
          </label>
          <label>
            机型 B
            <select
              value={pairB}
              onChange={(event) => {
                setPairB(event.target.value)
                setGroup(0)
              }}
            >
              {modelIds.map((id) => (
                <option key={id}>{id}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      <div className="lab-group-picker" aria-label="组合分组">
        {Array.from({ length: Math.ceil(recipes.length / 32) }, (_, index) => (
          <button
            key={index}
            type="button"
            className="secondary-button"
            aria-pressed={group === index}
            onClick={() => setGroup(index)}
          >
            {index * 32 + 1}–{Math.min(recipes.length, (index + 1) * 32)}
          </button>
        ))}
      </div>
      <section className="lab-gallery" aria-label={`${recipes.length} 种混搭组合`}>
        {recipes.slice(group * 32, (group + 1) * 32).map((recipe, localIndex) => (
          <article key={group * 32 + localIndex} data-recipe-index={group * 32 + localIndex}>
            <RegisteredMecha
              parts={galleryWings ? { ...recipe, wings: wingIds[0] } : recipe}
              config={config}
              label={`组合 ${group * 32 + localIndex + 1}`}
            />
            <p>
              {String(group * 32 + localIndex + 1).padStart(3, '0')} /{' '}
              {slots.map((part) => recipe[part]!.split(':')[0].replace('mecha-', '')).join(' · ')}
            </p>
          </article>
        ))}
      </section>
    </main>
  )
}
