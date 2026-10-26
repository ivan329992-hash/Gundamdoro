import { describe, expect, it } from 'vitest'
import { fitSegment, transformPoint } from './assembly'

describe('semantic assembly transforms', () => {
  it('maps both calibration points with uniform scale and rotation', () => {
    const matrix = fitSegment(
      [
        [1, 2],
        [3, 2],
      ],
      [
        [10, 20],
        [10, 24],
      ],
    )
    expect(transformPoint(matrix, [1, 2])).toEqual([10, 20])
    expect(transformPoint(matrix, [3, 2])).toEqual([10, 24])
    expect(transformPoint(matrix, [1, 3])).toEqual([8, 20])
    expect(matrix[0]).toBe(matrix[3])
    expect(matrix[1]).toBe(-matrix[2])
  })

  it('preserves original geometry when source and target share registration', () => {
    const matrix = fitSegment(
      [
        [543, 500],
        [543, 210],
      ],
      [
        [543, 500],
        [543, 210],
      ],
    )
    expect(transformPoint(matrix, [123, 456])).toEqual([123, 456])
    expect(Math.hypot(matrix[0], matrix[1])).toBe(1)
  })

  it('rejects nonfinite or collapsed calibration segments', () => {
    expect(() =>
      fitSegment(
        [
          [0, 0],
          [0, 0],
        ],
        [
          [0, 0],
          [0, 1],
        ],
      ),
    ).toThrow()
    expect(() =>
      fitSegment(
        [
          [0, 0],
          [0, 1],
        ],
        [
          [0, 0],
          [0, 0],
        ],
      ),
    ).toThrow()
    expect(() =>
      fitSegment(
        [
          [0, 0],
          [NaN, 1],
        ],
        [
          [0, 0],
          [0, 1],
        ],
      ),
    ).toThrow()
  })
})
