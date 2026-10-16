import { afterEach, describe, expect, it, vi } from 'vitest'
import { readImportImage } from './importImages'

const png = () => new File([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], 'source.png', { type: 'image/png' })
afterEach(() => vi.unstubAllGlobals())

describe('import image decoding', () => {
  it('checks real decoding, records dimensions and closes the decoded bitmap', async () => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 1080, height: 1440, close })))
    expect(await readImportImage(png())).toMatchObject({ width: 1080, height: 1440 })
    expect(close).toHaveBeenCalledOnce()
  })
  it('rejects invalid bytes regardless of a spoofed PNG name/type', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn())
    await expect(readImportImage(new File(['<svg/>'], 'fake.png', { type: 'image/png' }))).rejects.toThrow('仅支持')
    expect(createImageBitmap).not.toHaveBeenCalled()
  })
  it('rejects decoding failures and empty input', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new Error('invalid image') }))
    await expect(readImportImage(png())).rejects.toThrow('无法解码')
    await expect(readImportImage(new File([], 'empty.png'))).rejects.toThrow('8 MiB')
  })
  it('rejects oversized decoded images and still closes the bitmap', async () => {
    const close = vi.fn()
    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({ width: 10000, height: 10000, close })))
    await expect(readImportImage(png())).rejects.toThrow('1600 万像素')
    expect(close).toHaveBeenCalledOnce()
  })
})
