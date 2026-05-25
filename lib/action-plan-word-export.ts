/**
 * lib/action-plan-word-export.ts
 *
 * Builder docx para la planificación de acciones (Anexo 5 — 3 columnas).
 * El documento real del MEP es una tabla por categoría con columnas:
 *   1. Proceso  ·  2. Lecciones  ·  3. Descripción / observaciones
 *
 * En Sesión E entregamos una versión funcional y limpia.  El refinamiento
 * final de formato (logos, encabezados oficiales) se hará cuando el MEP
 * publique la plantilla 2026 actualizada.
 */

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
} from 'docx'
import type { MepProcess, ServiceLessonCategory, WorkModality } from '@prisma/client'
import { SERVICE_CATEGORIES, getCategory } from '@/lib/schedule-template'

const MEP_PROCESS_LABELS: Record<MepProcess, string> = {
  IDENTIFICACION:  'Identificación',
  IMPLEMENTACION:  'Implementación',
  REFLEXION:       'Reflexión',
}

const MONTH_LABELS = [
  '', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

export interface ExportLine {
  category: ServiceLessonCategory
  mepProcess: MepProcess
  description: string
  observations: string
  slots: Array<{ date: string }>  // ISO YYYY-MM-DD
  studentName?: string | null
  linkedObjectivesCount?: number
}

export interface ExportPlan {
  year: number
  month: number
  modality: WorkModality
  teacherName: string
  centerName: string
  circuit: string
  specialty: string
  schoolPeriod: string
  lines: ExportLine[]
  approvedAt: Date | null
}

// ─── helpers de estilos ───────────────────────────────────────────────────────

function title(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: 28, font: 'Calibri' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  })
}

function subtitle(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: 20, color: '555555', font: 'Calibri' })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  })
}

function labelValue(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 20, font: 'Calibri' }),
      new TextRun({ text: value, size: 20, font: 'Calibri' }),
    ],
    spacing: { after: 60 },
  })
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 150 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' } },
  })
}

function cellPara(text: string, opts: { bold?: boolean; size?: number; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {}): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: text || '',
        bold: opts.bold,
        size: opts.size ?? 18,
        font: 'Calibri',
      }),
    ],
    alignment: opts.align,
  })
}

function headerCell(text: string): TableCell {
  return new TableCell({
    children: [cellPara(text, { bold: true, size: 18, align: AlignmentType.CENTER })],
    shading: { type: ShadingType.SOLID, color: 'E8EEF7' },
  })
}

// ─── builder principal ────────────────────────────────────────────────────────

export function buildActionPlanDocument(plan: ExportPlan): Document {
  const grouped = new Map<ServiceLessonCategory, ExportLine[]>()
  for (const l of plan.lines) {
    if (!grouped.has(l.category)) grouped.set(l.category, [])
    grouped.get(l.category)!.push(l)
  }

  const orderedCategories = SERVICE_CATEGORIES
    .map((c) => c.code)
    .filter((c) => grouped.has(c))

  const children: Array<Paragraph | Table> = [
    title('PLANIFICACIÓN DE ACCIONES'),
    subtitle(`Anexo 5 — ${MONTH_LABELS[plan.month]} ${plan.year}`),
    labelValue('Docente', plan.teacherName),
    labelValue('Centro educativo', plan.centerName),
    labelValue('Circuito', plan.circuit),
    labelValue('Especialidad', plan.specialty),
    labelValue('Modalidad', plan.modality === 'FIJO' ? 'Fijo (40 lec/sem)' : 'Itinerante (44 lec/sem)'),
    labelValue('Periodo lectivo', plan.schoolPeriod),
    labelValue('Estado', plan.approvedAt
      ? `Aprobado el ${plan.approvedAt.toLocaleDateString('es-CR')}`
      : 'Borrador'),
  ]

  if (orderedCategories.length === 0) {
    children.push(new Paragraph({
      children: [new TextRun({ text: 'Sin líneas registradas en este plan.', italics: true, size: 20 })],
      spacing: { before: 300 },
    }))
  }

  for (const cat of orderedCategories) {
    const def = getCategory(cat)
    const ls = grouped.get(cat)!
    const totalLec = ls.reduce((s, l) => s + l.slots.length, 0)
    children.push(sectionHeading(`${def?.label ?? cat} — ${totalLec} lec`))

    const rows: TableRow[] = [
      new TableRow({
        children: [
          headerCell('Proceso'),
          headerCell('Lecciones'),
          headerCell('Descripción / observaciones'),
        ],
        tableHeader: true,
      }),
    ]

    for (const l of ls) {
      const descParts: string[] = []
      if (l.description) descParts.push(l.description)
      if (l.observations) descParts.push(`Obs.: ${l.observations}`)
      if (l.studentName) descParts.push(`Estudiante: ${l.studentName}`)
      if (l.linkedObjectivesCount && l.linkedObjectivesCount > 0) {
        descParts.push(`Vinculado a ${l.linkedObjectivesCount} objetivo${l.linkedObjectivesCount === 1 ? '' : 's'} derivado${l.linkedObjectivesCount === 1 ? '' : 's'}.`)
      }
      if (l.slots.length > 0) {
        const days = l.slots
          .map((s) => s.date.slice(8, 10))
          .sort()
          .join(', ')
        descParts.push(`Fechas: ${days}`)
      }
      rows.push(
        new TableRow({
          children: [
            new TableCell({ children: [cellPara(MEP_PROCESS_LABELS[l.mepProcess])] }),
            new TableCell({
              children: [cellPara(String(l.slots.length), { align: AlignmentType.CENTER })],
            }),
            new TableCell({
              children: descParts.length === 0
                ? [cellPara('—')]
                : descParts.map((p) => cellPara(p)),
            }),
          ],
        }),
      )
    }

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows,
        columnWidths: [2000, 1200, 5800],
      }),
    )
  }

  return new Document({
    creator: 'Katà',
    title: `Plan de acciones ${MONTH_LABELS[plan.month]} ${plan.year}`,
    sections: [
      {
        properties: {},
        children,
      },
    ],
  })
}
