import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url))
const manifests = readdirSync(resolve(sourceRoot, 'mecha'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => JSON.parse(readFileSync(resolve(sourceRoot, 'mecha', entry.name, 'manifest.json'), 'utf8')))

function hasTransparencyChunk(bytes) {
  let offset = 8
  while (offset + 12 <= bytes.length) {
    const length = bytes.readUInt32BE(offset)
    if (offset + length + 12 > bytes.length) return false
    if (bytes.toString('ascii', offset + 4, offset + 8) === 'tRNS') return true
    offset += length + 12
  }
  return false
}

describe('runtime mecha PNG assets', () => {
  it.each(manifests)('$id has local transparent PNGs with consistent 3:4 canvases', (manifest) => {
    const assetRoot = resolve(sourceRoot, 'assets', 'mecha', manifest.id)
    const canvases = []
    const presentationPath = resolve(sourceRoot, 'mecha', manifest.id, 'presentation.json')
    const presentations = existsSync(presentationPath) ? Object.values(JSON.parse(readFileSync(presentationPath, 'utf8'))).flat() : []
    for (const relativePath of new Set([manifest.finalAsset, ...manifest.stages.map((part) => part.asset), ...presentations.map((image) => image.asset)])) {
      const path = resolve(assetRoot, relativePath)
      expect(path.startsWith(assetRoot + sep)).toBe(true)
      const bytes = readFileSync(path)
      expect(bytes.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
      const width = bytes.readUInt32BE(16)
      const height = bytes.readUInt32BE(20)
      expect(width).toBeGreaterThan(0)
      expect(height).toBeGreaterThan(0)
      expect(width * 4).toBe(height * 3)
      expect([4, 6].includes(bytes[25]) || hasTransparencyChunk(bytes)).toBe(true)
      canvases.push(`${width}x${height}`)
      for (const image of presentations.filter((image) => image.asset === relativePath)) {
        expect(image.image).toEqual([width, height])
        const [x, y, w, h] = image.bounds
        expect(image.bounds.every(Number.isFinite)).toBe(true)
        expect(x).toBeGreaterThanOrEqual(0)
        expect(y).toBeGreaterThanOrEqual(0)
        expect(w).toBeGreaterThan(0)
        expect(h).toBeGreaterThan(0)
        expect(x + w).toBeLessThanOrEqual(width)
        expect(y + h).toBeLessThanOrEqual(height)
      }
    }
    expect(new Set(canvases).size).toBe(1)
  })
})
