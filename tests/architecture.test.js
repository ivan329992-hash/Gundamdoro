import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import ts from 'typescript'

const sourceRoot = fileURLToPath(new URL('../src/', import.meta.url))

function sourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(path) && !path.includes('.test.') ? [path] : []
  })
}

describe('module dependency boundaries', () => {
  it.each(['domain', 'application'])('%s does not depend on UI, stores, adapters, or platform globals', (layer) => {
    const failures = []
    for (const file of sourceFiles(resolve(sourceRoot, layer))) {
      const code = readFileSync(file, 'utf8')
      const imports = []
      const syntax = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true)
      function visit(node) {
        if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          imports.push(node.moduleSpecifier.text)
        }
        if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
          const target = node.arguments[0]
          if (target && ts.isStringLiteral(target)) imports.push(target.text)
          else failures.push(`${file}: nonliteral dynamic import in core logic`)
        }
        ts.forEachChild(node, visit)
      }
      visit(syntax)
      for (const imported of imports) {
        const target = resolve(dirname(file), imported)
        const allowed = [resolve(sourceRoot, 'domain'), ...(layer === 'application' ? [resolve(sourceRoot, 'application')] : [])]
        if (!imported.startsWith('.') || !allowed.some((root) => target === root || target.startsWith(root + '/') || target.startsWith(root + '\\'))) {
          failures.push(`${file}: forbidden import ${imported}`)
        }
      }
      const executableCode = ts.createPrinter({ removeComments: true }).printFile(syntax)
      if (/\bwindow\b|\bdocument\b|\bnavigator\b|\blocalStorage\b|import\.meta|Date\.now\(|crypto\.randomUUID\(|\bsetTimeout\s*\(|\bsetInterval\s*\(/.test(executableCode)) {
        failures.push(`${file}: platform global in core logic`)
      }
    }
    expect(failures).toEqual([])
  })
})
