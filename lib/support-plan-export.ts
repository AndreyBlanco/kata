/**
 * lib/support-plan-export.ts
 *
 * Motor de exportación del Plan de Apoyo Educativo en formato .docx
 * Fuente: Cuaderno Complementario N°4 — Problemas de Aprendizaje (MEP, 2023)
 * Replica la plantilla oficial: encabezado + tabla de 4 columnas (págs. 56-58)
 */

import {
  Document,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  VerticalAlign,
  HeightRule,
  PageOrientation,
} from 'docx'

import {
  DIFFICULTIES_CATALOG,
  PROCESSES_CATALOG,
  EXECUTIVE_FUNCTIONS_SUBPROCESSES,
} from '@/lib/catalogs'

// ─────────────────────────────────────────────
// TIPOS DE ENTRADA
// ─────────────────────────────────────────────

export interface SupportPlanExportData {
  // Datos del estudiante
  studentName: string
  studentGrade: string
  studentCedula?: string

  // Datos del docente / centro
  teacherName: string
  centerName: string
  circuit: string
  specialty: string
  classroomTeacherName?: string

  // Encabezado del plan
  elaborationDate?: string   // ya formateado dd/mm/yyyy
  activeDifficulties: string[]
  priorityProcesses: string[]
  executiveSubprocesses: string[]

  // Tabla 4 columnas
  strengths: string
  mediationStrategies: string
  homeStrategies: string
  specificStrategies: string
}

// ─────────────────────────────────────────────
// PALETA Y TIPOGRAFÍA (alineadas con valoracion-export)
// ─────────────────────────────────────────────

const FONT           = 'Arial'
const COLOR_TITLE    = '365F91'
const COLOR_HEADING  = '4F81BD'
const COLOR_LABEL    = '1F497D'
const COLOR_BODY     = '000000'
const COLOR_MUTED    = '666666'

const SIZE_TITLE     = 28   // 14 pt
const SIZE_HEADING   = 24   // 12 pt
const SIZE_SUBHD     = 22   // 11 pt
const SIZE_BODY      = 20   // 10 pt
const SIZE_SMALL     = 18   //  9 pt

const FILL_HEADER    = 'D9E2F3'   // azul celeste — cabeceras de columna
const FILL_ROW_ALT   = 'EEF3FB'   // fondo filas alternas del encabezado
const FILL_CHECK_ON  = 'BDD7EE'   // chip marcado (proceso/dificultad)

// ─────────────────────────────────────────────
// PRIMITIVOS
// ─────────────────────────────────────────────

function sp(n = 120): Paragraph {
  return new Paragraph({ spacing: { after: n } })
}

function docTitle(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: SIZE_TITLE, color: COLOR_TITLE, font: FONT })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 0 },
  })
}

function docSubtitle(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, size: SIZE_BODY, font: FONT, color: COLOR_MUTED, italics: true })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 160 },
  })
}

function sectionLabel(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: SIZE_SUBHD, color: COLOR_LABEL, font: FONT })],
    spacing: { before: 120, after: 60 },
  })
}

/** Convierte texto multilinea (con \n y viñetas • / ▸) en párrafos formateados */
function multilineParagraphs(text: string): Paragraph[] {
  if (!text.trim()) {
    return [new Paragraph({
      children: [new TextRun({ text: '—', size: SIZE_BODY, font: FONT, color: COLOR_MUTED, italics: true })],
    })]
  }

  return text.split('\n').map((line) => {
    const trimmed = line.trimEnd()

    // ▸ encabezado de bloque — negrita, azul oscuro
    if (trimmed.startsWith('▸')) {
      return new Paragraph({
        children: [new TextRun({
          text: trimmed.replace(/^▸\s*/, ''),
          bold: true,
          size: SIZE_BODY,
          color: COLOR_LABEL,
          font: FONT,
        })],
        spacing: { before: 100, after: 40 },
        indent: { left: 0 },
      })
    }

    // • viñeta — sangría
    if (trimmed.startsWith('  •') || trimmed.startsWith('•')) {
      const content = trimmed.replace(/^\s*•\s*/, '')
      return new Paragraph({
        children: [new TextRun({ text: `• ${content}`, size: SIZE_BODY, font: FONT, color: COLOR_BODY })],
        spacing: { after: 40 },
        indent: { left: 360 },
      })
    }

    // línea vacía → espaciado
    if (!trimmed) {
      return new Paragraph({ spacing: { after: 80 } })
    }

    // texto normal
    return new Paragraph({
      children: [new TextRun({ text: trimmed, size: SIZE_BODY, font: FONT, color: COLOR_BODY })],
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 60 },
    })
  })
}

// ─────────────────────────────────────────────
// TABLA DE DATOS GENERALES (2 columnas: label | value)
// ─────────────────────────────────────────────

function infoRow(label: string, value: string, shade = false): TableRow {
  const fill = shade ? FILL_ROW_ALT : 'FFFFFF'
  const cellStyle = {
    shading: { fill, type: ShadingType.CLEAR, color: 'auto' },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 1, color: 'C9C9C9' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'C9C9C9' },
      left:   { style: BorderStyle.SINGLE, size: 1, color: 'C9C9C9' },
      right:  { style: BorderStyle.SINGLE, size: 1, color: 'C9C9C9' },
    },
    verticalAlign: VerticalAlign.CENTER,
  }

  return new TableRow({
    height: { value: 400, rule: HeightRule.ATLEAST },
    children: [
      new TableCell({
        ...cellStyle,
        width: { size: 30, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          children: [new TextRun({ text: label, bold: true, size: SIZE_SMALL, font: FONT, color: COLOR_LABEL })],
          spacing: { before: 60, after: 60 },
          indent: { left: 100 },
        })],
      }),
      new TableCell({
        ...cellStyle,
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [new Paragraph({
          children: [new TextRun({ text: value || '—', size: SIZE_SMALL, font: FONT, color: COLOR_BODY })],
          spacing: { before: 60, after: 60 },
          indent: { left: 100 },
        })],
      }),
    ],
  })
}

function infoTable(rows: [string, string][]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value], i) => infoRow(label, value, i % 2 === 1)),
  })
}

// ─────────────────────────────────────────────
// SECCIÓN DE CHECKBOXES (dificultades / procesos)
// ─────────────────────────────────────────────

function checkboxRow(items: readonly string[], selected: string[]): Paragraph[] {
  // Agrupamos en filas de 4 chips, generamos párrafos con separación visual
  const chunks: (readonly string[])[] = []
  for (let i = 0; i < items.length; i += 4) chunks.push(items.slice(i, i + 4))

  return chunks.map((chunk) => {
    const runs: TextRun[] = []
    chunk.forEach((item, idx) => {
      const isSelected = selected.includes(item)
      runs.push(
        new TextRun({
          text: isSelected ? `☑ ${item}` : `☐ ${item}`,
          size: SIZE_BODY,
          font: FONT,
          bold: isSelected,
          color: isSelected ? COLOR_LABEL : COLOR_MUTED,
        })
      )
      if (idx < chunk.length - 1) {
        runs.push(new TextRun({ text: '     ', size: SIZE_BODY, font: FONT }))
      }
    })

    return new Paragraph({
      children: runs,
      spacing: { after: 80 },
    })
  })
}

// ─────────────────────────────────────────────
// CELDA DE LA TABLA DE 4 COLUMNAS
// ─────────────────────────────────────────────

function columnHeaderCell(text: string): TableCell {
  return new TableCell({
    shading: { fill: FILL_HEADER, type: ShadingType.CLEAR, color: 'auto' },
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 8, color: '4F81BD' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '4F81BD' },
      left:   { style: BorderStyle.SINGLE, size: 4, color: '4F81BD' },
      right:  { style: BorderStyle.SINGLE, size: 4, color: '4F81BD' },
    },
    verticalAlign: VerticalAlign.CENTER,
    children: [
      new Paragraph({
        children: [new TextRun({ text, bold: true, size: SIZE_BODY, color: COLOR_HEADING, font: FONT })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 80, after: 80 },
      }),
    ],
  })
}

function columnContentCell(content: string): TableCell {
  return new TableCell({
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 4, color: '4F81BD' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: '4F81BD' },
      left:   { style: BorderStyle.SINGLE, size: 4, color: '4F81BD' },
      right:  { style: BorderStyle.SINGLE, size: 4, color: '4F81BD' },
    },
    verticalAlign: VerticalAlign.TOP,
    children: multilineParagraphs(content).map((p, i) => {
      // Añadir indent izquierdo y padding a todos los párrafos de la celda
      if (i === 0) return new Paragraph({
        ...p,
        spacing: { ...(p as any).options?.spacing, before: 80 },
        indent: { left: 80 },
      })
      return p
    }),
  })
}

// ─────────────────────────────────────────────
// TABLA DE 4 COLUMNAS
// ─────────────────────────────────────────────

function fourColumnTable(data: SupportPlanExportData): Table {
  const COLS = [
    { header: 'Fortalezas, intereses y recursos del estudiante', content: data.strengths },
    { header: 'Estrategias para la mediación pedagógica (en aula)', content: data.mediationStrategies },
    { header: 'Estrategias de apoyo para la casa', content: data.homeStrategies },
    { header: 'Estrategias específicas del docente de apoyo educativo', content: data.specificStrategies },
  ]

  const headerRow = new TableRow({
    tableHeader: true,
    height: { value: 500, rule: HeightRule.ATLEAST },
    children: COLS.map((c) => columnHeaderCell(c.header)),
  })

  const contentRow = new TableRow({
    height: { value: 4000, rule: HeightRule.ATLEAST },
    children: COLS.map((c) => columnContentCell(c.content)),
  })

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, contentRow],
  })
}

// ─────────────────────────────────────────────
// LÍNEA DE FIRMA
// ─────────────────────────────────────────────

function signatureLine(label: string): Paragraph[] {
  return [
    new Paragraph({
      children: [new TextRun({ text: '_'.repeat(55), size: SIZE_BODY, font: FONT, color: '888888' })],
      spacing: { before: 400, after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: label, size: SIZE_SMALL, font: FONT, color: COLOR_MUTED })],
      spacing: { after: 0 },
    }),
  ]
}

// ─────────────────────────────────────────────
// FUNCIÓN PRINCIPAL
// ─────────────────────────────────────────────

export function buildSupportPlanDocument(data: SupportPlanExportData): Document {
  const hasFE = data.priorityProcesses.includes('Funciones ejecutivas') &&
                data.executiveSubprocesses.length > 0

  const children: (Paragraph | Table)[] = [
    // ── Título ─────────────────────────────────
    docTitle('Plan de Apoyo Educativo'),
    docSubtitle('Servicio de Apoyo Educativo Fijo en el Aprendizaje — MEP'),
    sp(120),

    // ── Datos generales ────────────────────────
    sectionLabel('Datos generales'),
    infoTable([
      ['Centro educativo',   data.centerName],
      ['Circuito',           data.circuit],
      ['Docente de apoyo',   data.teacherName],
      ['Especialidad',       data.specialty],
      ['Docente de aula',    data.classroomTeacherName || '—'],
      ['Nombre del estudiante', data.studentName],
      ['Nivel / Sección',    data.studentGrade],
      ['Cédula',             data.studentCedula || '—'],
      ['Fecha de elaboración', data.elaborationDate || '—'],
    ]),
    sp(160),

    // ── Dificultades específicas ───────────────
    sectionLabel('Dificultades específicas del aprendizaje'),
    ...checkboxRow(DIFFICULTIES_CATALOG, data.activeDifficulties),
    sp(100),

    // ── Procesos implicados ────────────────────
    sectionLabel('Procesos implicados en el aprendizaje'),
    ...checkboxRow(PROCESSES_CATALOG, data.priorityProcesses),
    sp(hasFE ? 60 : 160),
  ]

  // Subprocesos de FE (sólo si aplica)
  if (hasFE) {
    children.push(
      sectionLabel('Subprocesos de Funciones Ejecutivas'),
      ...checkboxRow(EXECUTIVE_FUNCTIONS_SUBPROCESSES, data.executiveSubprocesses),
      sp(160)
    )
  }

  // ── Separador visual ──────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Tabla del Plan de Apoyo', bold: true, size: SIZE_HEADING, color: COLOR_HEADING, font: FONT })],
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 120 },
      border: {
        bottom: { style: BorderStyle.SINGLE, size: 6, color: COLOR_HEADING },
      },
    })
  )

  // ── Tabla de 4 columnas ───────────────────────
  children.push(fourColumnTable(data))
  children.push(sp(200))

  // ── Firmas ────────────────────────────────────
  children.push(
    new Paragraph({
      children: [new TextRun({ text: 'Firmas', bold: true, size: SIZE_SUBHD, color: COLOR_LABEL, font: FONT })],
      spacing: { before: 200, after: 0 },
    }),
    ...signatureLine(`${data.teacherName} — Docente de apoyo educativo`),
    ...signatureLine(`${data.classroomTeacherName || 'Docente de aula'} — Docente de aula`),
    ...signatureLine('Dirección — Firma y sello'),
  )

  return new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: PageOrientation.PORTRAIT,
          },
          margin: {
            top: 720,
            bottom: 720,
            left: 800,
            right: 800,
          },
        },
      },
      children,
    }],
  })
}
