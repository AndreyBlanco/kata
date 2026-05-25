/**
 * lib/diagnostic-objectives.ts
 *
 * Derivación pura de objetivos de apoyo desde las pruebas diagnósticas.
 *
 * Reglas (D2):
 *  - Un item evaluado en `EN_PROCESO` o `PRESENTA_DIFICULTAD` se considera objetivo
 *    de trabajo por defecto.
 *  - Un item en `LOGRADO` no es objetivo por defecto, pero se mantiene visible
 *    para mostrar fortalezas y permitir reactivación manual.
 *  - El docente puede activar/desactivar cualquier objetivo manualmente vía
 *    `StudentObjectivePreference`.
 *
 * Sólo se usa la última aplicación (`attemptNumber` máximo) por prueba
 * para el "resultado actual"; el historial se mantiene en BD para análisis
 * comparativo (avances entre intentos).
 */

import { prisma } from '@/lib/prisma'
import type { DiagnosticItemResult } from '@prisma/client'
import { DIAGNOSTIC_RESULT_LABELS } from '@/lib/diagnostic-test-helpers'

export type DiagnosticItemResultValue = DiagnosticItemResult

export interface DerivedObjective {
  itemId: string
  itemNumber: number
  description: string

  activityId: string
  activityLetter: string
  activityTitle: string

  testId: string
  difficulty: string
  difficultyLabel: string
  grade: string
  gradeLabel: string

  /** Resultado más reciente (de la última aplicación). */
  result: DiagnosticItemResultValue
  resultLabel: string
  /** Fecha del último resultado. */
  assessedAt: string

  /** ID de la aplicación (StudentDiagnosticTest) más reciente. */
  applicationId: string
  attemptNumber: number

  /** isActive efectivo (con preferencia aplicada). */
  isActive: boolean
  /** True si el isActive viene del default (no hay preferencia explícita). */
  isDefaultActive: boolean
  priority: number
  notes: string | null
}

/**
 * isActive por defecto: activo cuando el resultado es EN_PROCESO o PRESENTA_DIFICULTAD,
 * inactivo cuando es LOGRADO.
 */
export function defaultActiveForResult(result: DiagnosticItemResultValue): boolean {
  return result === 'EN_PROCESO' || result === 'PRESENTA_DIFICULTAD'
}

/**
 * Devuelve todos los objetivos derivados de las pruebas aplicadas a un estudiante.
 * Sólo considera la última aplicación por prueba.
 */
export async function buildDerivedObjectives(studentId: string): Promise<DerivedObjective[]> {
  // 1. Última aplicación por testId.
  const apps = await prisma.studentDiagnosticTest.findMany({
    where: { studentId },
    orderBy: [{ testId: 'asc' }, { attemptNumber: 'desc' }],
    select: {
      id: true,
      testId: true,
      attemptNumber: true,
    },
  })
  const latestByTest = new Map<string, { id: string; attemptNumber: number }>()
  for (const a of apps) {
    if (!latestByTest.has(a.testId)) latestByTest.set(a.testId, { id: a.id, attemptNumber: a.attemptNumber })
  }
  const latestAppIds = Array.from(latestByTest.values()).map((v) => v.id)
  if (latestAppIds.length === 0) return []

  // 2. Cargar resultados de esas aplicaciones + estructura.
  const [results, prefs] = await Promise.all([
    prisma.studentDiagnosticItemResult.findMany({
      where: { studentTestId: { in: latestAppIds } },
      include: {
        item: {
          include: {
            activity: { include: { test: true } },
          },
        },
        studentTest: { select: { id: true, attemptNumber: true } },
      },
    }),
    prisma.studentObjectivePreference.findMany({
      where: { studentId },
      select: { itemId: true, isActive: true, priority: true, notes: true },
    }),
  ])
  const prefByItem = new Map(prefs.map((p) => [p.itemId, p]))

  return results.map<DerivedObjective>((r) => {
    const pref = prefByItem.get(r.itemId)
    const defaultActive = defaultActiveForResult(r.result)
    return {
      itemId:          r.itemId,
      itemNumber:      r.item.itemNumber,
      description:     r.item.description,

      activityId:      r.item.activityId,
      activityLetter:  r.item.activity.letter,
      activityTitle:   r.item.activity.title,

      testId:          r.item.activity.testId,
      difficulty:      r.item.activity.test.difficulty,
      difficultyLabel: r.item.activity.test.difficultyLabel,
      grade:           r.item.activity.test.grade,
      gradeLabel:      r.item.activity.test.gradeLabel,

      result:          r.result,
      resultLabel:     DIAGNOSTIC_RESULT_LABELS[r.result],
      assessedAt:      r.assessedAt.toISOString(),

      applicationId:   r.studentTest.id,
      attemptNumber:   r.studentTest.attemptNumber,

      isActive:        pref?.isActive ?? defaultActive,
      isDefaultActive: pref === undefined,
      priority:        pref?.priority ?? 0,
      notes:           pref?.notes ?? null,
    }
  })
}

/**
 * Compara los dos últimos intentos por prueba y devuelve items en los que hubo
 * progreso (mejoró el resultado).  Útil para §6 Desempeño curricular columna
 * "Avances" (D8).
 *
 * Progreso se considera cuando el resultado pasó hacia un estado mejor:
 *   PRESENTA_DIFICULTAD → EN_PROCESO
 *   PRESENTA_DIFICULTAD → LOGRADO
 *   EN_PROCESO → LOGRADO
 */
export interface ProgressItem {
  itemId: string
  description: string
  difficulty: string
  difficultyLabel: string
  activityTitle: string
  fromResult: DiagnosticItemResultValue
  toResult: DiagnosticItemResultValue
  fromAttemptNumber: number
  toAttemptNumber: number
}

const RESULT_RANK: Record<DiagnosticItemResultValue, number> = {
  PRESENTA_DIFICULTAD: 0,
  EN_PROCESO: 1,
  LOGRADO: 2,
}

export async function detectProgressBetweenAttempts(studentId: string): Promise<ProgressItem[]> {
  const apps = await prisma.studentDiagnosticTest.findMany({
    where: { studentId },
    orderBy: [{ testId: 'asc' }, { attemptNumber: 'asc' }],
    select: { id: true, testId: true, attemptNumber: true },
  })

  // Agrupar por testId y tomar los dos últimos.
  const byTest = new Map<string, typeof apps>()
  for (const a of apps) {
    if (!byTest.has(a.testId)) byTest.set(a.testId, [] as typeof apps)
    byTest.get(a.testId)!.push(a)
  }

  const pairs: { testId: string; prev: string; curr: string; prevAttempt: number; currAttempt: number }[] = []
  for (const [testId, list] of byTest) {
    if (list.length < 2) continue
    const sorted = [...list].sort((a, b) => a.attemptNumber - b.attemptNumber)
    const prev = sorted[sorted.length - 2]
    const curr = sorted[sorted.length - 1]
    pairs.push({
      testId,
      prev: prev.id,
      curr: curr.id,
      prevAttempt: prev.attemptNumber,
      currAttempt: curr.attemptNumber,
    })
  }
  if (pairs.length === 0) return []

  const allAppIds = pairs.flatMap((p) => [p.prev, p.curr])
  const results = await prisma.studentDiagnosticItemResult.findMany({
    where: { studentTestId: { in: allAppIds } },
    include: {
      item: { include: { activity: { include: { test: true } } } },
    },
  })

  type ResultRow = (typeof results)[number]
  const byApp = new Map<string, Map<string, ResultRow>>()
  for (const r of results) {
    if (!byApp.has(r.studentTestId)) byApp.set(r.studentTestId, new Map())
    byApp.get(r.studentTestId)!.set(r.itemId, r)
  }

  const out: ProgressItem[] = []
  for (const p of pairs) {
    const prevMap = byApp.get(p.prev) ?? new Map<string, ResultRow>()
    const currMap = byApp.get(p.curr) ?? new Map<string, ResultRow>()
    for (const [itemId, currR] of currMap) {
      const prevR = prevMap.get(itemId)
      if (!prevR) continue
      if (RESULT_RANK[currR.result] <= RESULT_RANK[prevR.result]) continue
      out.push({
        itemId,
        description:     currR.item.description,
        difficulty:      currR.item.activity.test.difficulty,
        difficultyLabel: currR.item.activity.test.difficultyLabel,
        activityTitle:   currR.item.activity.title,
        fromResult:      prevR.result,
        toResult:        currR.result,
        fromAttemptNumber: p.prevAttempt,
        toAttemptNumber:   p.currAttempt,
      })
    }
  }
  return out
}
