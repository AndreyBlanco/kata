'use client'

/**
 * Mini-renderizador de Markdown para los bloques estructurados de las pruebas
 * (no soporta sintaxis avanzada; lo justo para listas, encabezados ###, tablas y
 * negritas/itálicas).
 *
 * Suficiente para visualizar el contenido procedente de los .md sin pintarlo en raw.
 */

import { useMemo } from 'react'

type Props = { children?: string | null; className?: string }

export function MdBlock({ children, className }: Props) {
  const html = useMemo(() => (children ? renderMarkdown(children) : ''), [children])
  if (!html) return null
  return (
    <div
      className={`prose-kata text-sm text-gray-700 ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    // Bloques: tablas
    if (line.trim().startsWith('|')) {
      const block: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        block.push(lines[i])
        i++
      }
      out.push(renderTable(block))
      continue
    }
    // Listas
    if (/^\s*[-*]\s+/.test(line)) {
      const block: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        block.push(lines[i])
        i++
      }
      out.push(`<ul class="list-disc pl-5 space-y-1 my-2">${block.map((l) =>
        `<li>${renderInline(l.replace(/^\s*[-*]\s+/, ''))}</li>`
      ).join('')}</ul>`)
      continue
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const block: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        block.push(lines[i])
        i++
      }
      out.push(`<ol class="list-decimal pl-5 space-y-1 my-2">${block.map((l) =>
        `<li>${renderInline(l.replace(/^\s*\d+\.\s+/, ''))}</li>`
      ).join('')}</ol>`)
      continue
    }
    // Encabezados
    const h3 = line.match(/^###\s+(.+)$/)
    if (h3) {
      out.push(`<h4 class="mt-3 mb-1 text-sm font-semibold text-gray-900">${renderInline(h3[1])}</h4>`)
      i++
      continue
    }
    const h4 = line.match(/^####\s+(.+)$/)
    if (h4) {
      out.push(`<h5 class="mt-2 text-sm font-medium text-gray-800">${renderInline(h4[1])}</h5>`)
      i++
      continue
    }
    // Blockquote
    if (/^\s*>\s?/.test(line)) {
      const block: string[] = []
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        block.push(lines[i].replace(/^\s*>\s?/, ''))
        i++
      }
      out.push(`<blockquote class="my-2 border-l-4 border-gray-200 pl-3 italic text-gray-600">${
        block.map((l) => l ? `<p>${renderInline(l)}</p>` : '').join('')
      }</blockquote>`)
      continue
    }
    if (!line.trim()) {
      out.push('')
      i++
      continue
    }
    out.push(`<p class="my-2">${renderInline(line)}</p>`)
    i++
  }
  return out.join('\n')
}

function renderTable(rows: string[]): string {
  const cells = rows.map((r) =>
    r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()),
  )
  if (cells.length < 2) return ''
  const isSep = (row: string[]) => row.every((c) => /^-{3,}$/.test(c.replace(/[:|\s]/g, '-')))
  const head = isSep(cells[1]) ? cells[0] : null
  const body = isSep(cells[1] ?? []) ? cells.slice(2) : cells
  return [
    '<div class="my-3 overflow-x-auto"><table class="w-full text-xs border-collapse">',
    head ? `<thead><tr>${head.map((c) => `<th class="border-b border-gray-200 bg-gray-50 px-2 py-1.5 text-left font-medium text-gray-700">${renderInline(c)}</th>`).join('')}</tr></thead>` : '',
    '<tbody>',
    body.map((row) =>
      `<tr>${row.map((c) => `<td class="border-b border-gray-100 px-2 py-1.5 align-top text-gray-700">${renderInline(c)}</td>`).join('')}</tr>`,
    ).join(''),
    '</tbody></table></div>',
  ].join('')
}

function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code class="rounded bg-gray-100 px-1 py-0.5 text-xs">$1</code>')
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
