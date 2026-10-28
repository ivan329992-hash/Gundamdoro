import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import ts from 'typescript'

describe('development module boundaries', () => {
  it('keeps timer components separate from hook exports for Fast Refresh', () => {
    const file = new URL('../src/components/Timer/TimerExperience.tsx', import.meta.url)
    const source = ts.createSourceFile(
      file.pathname,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    )
    const exports = source.statements.filter((node) =>
      node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword),
    )
    expect(exports.length).toBeGreaterThan(0)
    for (const node of exports) {
      if (ts.isInterfaceDeclaration(node) || ts.isTypeAliasDeclaration(node)) continue
      expect(
        ts.isFunctionDeclaration(node) && /^[A-Z]/.test(node.name?.text ?? ''),
        '界面文件只导出组件，Hook 放到 hooks/',
      ).toBe(true)
    }
    const hook = readFileSync(
      new URL('../src/hooks/useTimerExperience.ts', import.meta.url),
      'utf8',
    )
    expect(hook).toContain('export function useTimerExperience')
  })
})
