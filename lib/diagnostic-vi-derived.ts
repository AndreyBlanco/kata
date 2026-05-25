/**
 * lib/diagnostic-vi-derived.ts
 *
 * Convierte los resultados de las pruebas diagnósticas en `ViContribution`s
 * que alimentan la Valoración Integral y eventualmente el informe de período.
 *
 * Reglas (basadas en `## Patrones de alimentación al expediente` de los .md):
 *  - LOGRADO              → §4 Fortalezas
 *  - PRESENTA_DIFICULTAD  → §5 Barreras + §6 «aprendizajes por lograr» + §8 análisis
 *  - EN_PROCESO           → §6 «aprendizajes por lograr» + §8 análisis
 *  - Recomendaciones marcadas → §9 Apoyos (texto) y al Plan de Apoyo (estrategias)
 *  - Avances entre intentos  → §6 «avances»
 */

import { prisma } from '@/lib/prisma'
import type { DiagnosticItemResult } from '@prisma/client'
import {
  detectProgressBetweenAttempts,
} from '@/lib/diagnostic-objectives'
import { DIAGNOSTIC_RESULT_LABELS } from '@/lib/diagnostic-test-helpers'
import type {
  ViContribution,
  ContributionCategory,
} from '@/lib/vi-contribution-types'

// ─────────────────────────────────────────────────────────────────────────────
// Mapeo dificultad → asignatura curricular (D8)
// Mismas etiquetas que usábamos en /valoracion antes del refactor para no
// romper la lectura mental del docente.
// ─────────────────────────────────────────────────────────────────────────────

export const DIFFICULTY_TO_SUBJECT: Record<string, string> = {
  DISLEXIA:       'Español — Lectura y comprensión',
  DISGRAFIA:      'Español — Escritura',
  DISORTOGRAFIA:  'Español — Ortografía',
  DISCALCULIA:    'Matemáticas',
  DISPRAXIA:      'Desarrollo motriz',
  TDAH:           'Comportamiento y atención',
  APZ_LENTO:      'Aprendizaje general',
  TANV:           'Aprendizaje no verbal',
}

export function subjectForDifficulty(difficulty: string, fallbackLabel?: string): string {
  return DIFFICULTY_TO_SUBJECT[difficulty] ?? fallbackLabel ?? difficulty
}

// ─────────────────────────────────────────────────────────────────────────────
// Heurística D5: recomendación → columna del Plan de Apoyo
// ─────────────────────────────────────────────────────────────────────────────

export type RecommendationCategory = 'aula' | 'hogar' | 'especifica'

const HOGAR_RE = /(hogar|casa|familia|tutor|padr[ea]s?|entorno familiar|en la casa)/i
const AULA_RE  = /(aula|en clase|durante la clase|en clases|al grupo|compañer[oa]s|grupal|todo el grupo|aula regular)/i

export function classifyRecommendation(text: string): RecommendationCategory {
  if (HOGAR_RE.test(text)) return 'hogar'
  if (AULA_RE.test(text))  return 'aula'
  return 'especifica'
}

// ─────────────────────────────────────────────────────────────────────────────
// Construcción de contribuciones desde pruebas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Devuelve la lista de contribuciones derivadas de las pruebas aplicadas a un
 * estudiante.  Usa la última aplicación por prueba.
 */
export async function buildDiagnosticContributions(studentId: string): Promise<ViContribution[]> {
  // 1. Última aplicación por testId
  const apps = await prisma.studentDiagnosticTest.findMany({
    where: { studentId },
    orderBy: [{ testId: 'asc' }, { attemptNumber: 'desc' }],
    select: { id: true, testId: true, attemptNumber: true, completedAt: true, lastSavedAt: true },
  })
  const latestByTest = new Map<string, { id: string; date: Date }>()
  for (const a of apps) {
    if (!latestByTest.has(a.testId)) {
      latestByTest.set(a.testId, { id: a.id, date: a.completedAt ?? a.lastSavedAt })
    }
  }
  const latestIds = Array.from(latestByTest.values()).map((v) => v.id)
  if (latestIds.length === 0) return []

  const [results, recSelections] = await Promise.all([
    prisma.studentDiagnosticItemResult.findMany({
      where: { studentTestId: { in: latestIds } },
      include: {
        item: { include: { activity: { include: { test: true } } } },
      },
    }),
    prisma.studentRecommendationSelection.findMany({
      where: { studentTestId: { in: latestIds }, selected: true },
      include: {
        recommendation: { include: { activity: { include: { test: true } } } },
        studentTest: { select: { id: true, completedAt: true, lastSavedAt: true } },
      },
    }),
  ])

  const out: ViContribution[] = []
  for (const r of results) {
    const test = r.item.activity.test
    const sourceLabel = `${test.difficultyLabel} · ${test.gradeLabel} · ${r.item.activity.title}`
    const dateIso = r.assessedAt.toISOString()
    const baseSource = {
      source: 'diagnostic-test' as const,
      sourceRecordId: r.studentTestId,
      sourceLabel,
      sourceDate: dateIso,
      difficulty: test.difficulty,
      difficultyLabel: test.difficultyLabel,
      subject: subjectForDifficulty(test.difficulty, test.difficultyLabel),
    }
    const itemText = `${r.item.description}`
    const categories = categoriesForResult(r.result)
    for (const cat of categories) {
      out.push({
        contributionId: `dx:${r.studentTestId}:${r.itemId}:${cat}`,
        category: cat,
        text: itemText,
        ...baseSource,
      })
    }
  }

  // 2. Recomendaciones marcadas → §9 Apoyos + Plan de Apoyo (recommendation)
  for (const sel of recSelections) {
    const rec = sel.recommendation
    const test = rec.activity.test
    const dateIso = (sel.studentTest.completedAt ?? sel.studentTest.lastSavedAt).toISOString()
    out.push({
      contributionId:  `rec:${sel.studentTestId}:${rec.id}:support`,
      source:          'diagnostic-test',
      sourceRecordId:  sel.studentTestId,
      sourceLabel:     `${test.difficultyLabel} · ${rec.activity.title} (recomendación)`,
      sourceDate:      dateIso,
      difficulty:      test.difficulty,
      difficultyLabel: test.difficultyLabel,
      subject:         subjectForDifficulty(test.difficulty, test.difficultyLabel),
      category:        'support',
      text:            rec.text,
    })
    out.push({
      contributionId:  `rec:${sel.studentTestId}:${rec.id}:plan`,
      source:          'diagnostic-test',
      sourceRecordId:  sel.studentTestId,
      sourceLabel:     `${test.difficultyLabel} · ${rec.activity.title}`,
      sourceDate:      dateIso,
      difficulty:      test.difficulty,
      difficultyLabel: test.difficultyLabel,
      subject:         subjectForDifficulty(test.difficulty, test.difficultyLabel),
      category:        'recommendation',
      text:            rec.text,
    })
  }

  // 3. Avances entre intentos → §6 «avances»
  const progress = await detectProgressBetweenAttempts(studentId)
  for (const p of progress) {
    out.push({
      contributionId:  `progress:${p.itemId}:${p.fromAttemptNumber}-${p.toAttemptNumber}`,
      source:          'diagnostic-test',
      sourceRecordId:  p.itemId,
      sourceLabel:     `${p.difficultyLabel} · ${p.activityTitle} (avance ${p.fromAttemptNumber}→${p.toAttemptNumber})`,
      difficulty:      p.difficulty,
      difficultyLabel: p.difficultyLabel,
      subject:         subjectForDifficulty(p.difficulty, p.difficultyLabel),
      category:        'curricular_progress',
      text:            `${p.description} (${DIAGNOSTIC_RESULT_LABELS[p.fromResult]} → ${DIAGNOSTIC_RESULT_LABELS[p.toResult]})`,
    })
  }

  return out
}

function categoriesForResult(result: DiagnosticItemResult): ContributionCategory[] {
  switch (result) {
    case 'LOGRADO':
      return ['strength']
    case 'PRESENTA_DIFICULTAD':
      return ['barrier', 'curricular_to_achieve', 'analysis']
    case 'EN_PROCESO':
      return ['curricular_to_achieve', 'analysis']
  }
}

/**
 * Resumen para §8 Análisis integral: un párrafo breve agrupando hallazgos.
 * No se aplica directamente; el docente lo copia/pega tras revisar.
 */
export function summarizeForAnalysis(contributions: ViContribution[]): string {
  const byDifficulty = new Map<string, { label: string; strengths: number; barriers: number; toAchieve: number; progress: number }>()
  for (const c of contributions) {
    if (!c.difficulty) continue
    if (!byDifficulty.has(c.difficulty)) {
      byDifficulty.set(c.difficulty, {
        label: c.difficultyLabel ?? c.difficulty,
        strengths: 0, barriers: 0, toAchieve: 0, progress: 0,
      })
    }
    const entry = byDifficulty.get(c.difficulty)!
    if (c.category === 'strength')              entry.strengths++
    else if (c.category === 'barrier')          entry.barriers++
    else if (c.category === 'curricular_to_achieve') entry.toAchieve++
    else if (c.category === 'curricular_progress')   entry.progress++
  }
  if (byDifficulty.size === 0) return ''

  const lines: string[] = []
  lines.push('A partir de las pruebas diagnósticas aplicadas se identifican los siguientes patrones:')
  for (const [, e] of byDifficulty) {
    const parts: string[] = []
    if (e.strengths) parts.push(`${e.strengths} fortaleza${e.strengths === 1 ? '' : 's'}`)
    if (e.barriers)  parts.push(`${e.barriers} barrera${e.barriers === 1 ? '' : 's'}`)
    if (e.toAchieve) parts.push(`${e.toAchieve} ítem${e.toAchieve === 1 ? '' : 's'} por consolidar`)
    if (e.progress)  parts.push(`${e.progress} avance${e.progress === 1 ? '' : 's'} comprobado${e.progress === 1 ? '' : 's'}`)
    if (parts.length) lines.push(`• ${e.label}: ${parts.join(' · ')}.`)
  }
  return lines.join('\n')
}
