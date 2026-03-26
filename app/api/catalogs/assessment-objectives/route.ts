// app/api/catalogs/assessment-objectives/route.ts

import { NextRequest, NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/catalogs/assessment-objectives
 *
 * Devuelve el catálogo de objetivos de valoración por dificultad específica.
 * Fuente: miscelaneos/objetivos.docx (664 objetivos, 5 dificultades).
 *
 * Query params opcionales:
 *   ?difficulty=DISGRAFIA          → filtra por dificultad
 *   ?areaCode=A                    → filtra por área dentro de una dificultad
 *   ?level=B                       → filtra por nivel (B | 1 | 2 | 3 | S)
 *   ?levelType=checkbox            → checkbox (SÍ/NO/SÍ con apoyo) | scale (1-5)
 *   ?grouped=areas                 → agrupa por área (con subniveles ordenados)
 *   ?grouped=difficulties          → lista de dificultades disponibles con metadatos
 */
export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token?.teacherId) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const difficulty = searchParams.get('difficulty') ?? undefined
  const areaCode   = searchParams.get('areaCode')   ?? undefined
  const level      = searchParams.get('level')       ?? undefined
  const levelType  = searchParams.get('levelType')   ?? undefined
  const grouped    = searchParams.get('grouped')     ?? undefined

  // Modo especial: devolver solo la lista de dificultades disponibles
  if (grouped === 'difficulties') {
    const diffs = await prisma.assessmentObjective.findMany({
      where: { active: true },
      select: { difficulty: true, difficultyLabel: true },
      distinct: ['difficulty'],
      orderBy: { difficulty: 'asc' },
    })
    return NextResponse.json(diffs)
  }

  const items = await prisma.assessmentObjective.findMany({
    where: {
      active: true,
      ...(difficulty ? { difficulty }           : {}),
      ...(areaCode   ? { areaCode }             : {}),
      ...(level      ? { level }                : {}),
      ...(levelType  ? { levelType }            : {}),
    },
    select: {
      id:             true,
      code:           true,
      difficulty:     true,
      difficultyLabel: true,
      areaCode:       true,
      areaLabel:      true,
      level:          true,
      levelLabel:     true,
      levelType:      true,
      levelSort:      true,
      itemOrder:      true,
      description:    true,
    },
    orderBy: [
      { difficulty: 'asc' },
      { areaCode:   'asc' },
      { levelSort:  'asc' },
      { itemOrder:  'asc' },
    ],
  })

  // Flat list
  if (!grouped) {
    return NextResponse.json(items)
  }

  // grouped=areas → { difficulty, difficultyLabel, areas: [{ areaCode, areaLabel, levels: [{ level, levelLabel, levelType, items: [...] }] }] }
  if (grouped === 'areas') {
    const diffMap = new Map<string, {
      difficulty: string
      difficultyLabel: string
      areas: Map<string, {
        areaCode: string
        areaLabel: string
        levels: Map<string, {
          level: string
          levelLabel: string
          levelType: string
          levelSort: number
          items: typeof items
        }>
      }>
    }>()

    for (const item of items) {
      if (!diffMap.has(item.difficulty)) {
        diffMap.set(item.difficulty, {
          difficulty:      item.difficulty,
          difficultyLabel: item.difficultyLabel,
          areas:           new Map(),
        })
      }
      const diffEntry = diffMap.get(item.difficulty)!

      const areaKey = item.areaCode
      if (!diffEntry.areas.has(areaKey)) {
        diffEntry.areas.set(areaKey, {
          areaCode:  item.areaCode,
          areaLabel: item.areaLabel,
          levels:    new Map(),
        })
      }
      const areaEntry = diffEntry.areas.get(areaKey)!

      if (!areaEntry.levels.has(item.level)) {
        areaEntry.levels.set(item.level, {
          level:     item.level,
          levelLabel: item.levelLabel,
          levelType:  item.levelType,
          levelSort:  item.levelSort,
          items:     [],
        })
      }
      areaEntry.levels.get(item.level)!.items.push(item)
    }

    const result = Array.from(diffMap.values()).map((d) => ({
      difficulty:      d.difficulty,
      difficultyLabel: d.difficultyLabel,
      areas: Array.from(d.areas.values()).map((a) => ({
        areaCode:  a.areaCode,
        areaLabel: a.areaLabel,
        levels: Array.from(a.levels.values())
          .sort((x, y) => x.levelSort - y.levelSort)
          .map((l) => ({
            level:      l.level,
            levelLabel: l.levelLabel,
            levelType:  l.levelType,
            levelSort:  l.levelSort,
            objectives: l.items,
          })),
      })),
    }))

    return NextResponse.json(result)
  }

  return NextResponse.json(items)
}
