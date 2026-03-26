/**
 * lib/valoracion-export.ts
 *
 * Motor de exportación del "Informe de Valoración Integral del Estudiantado"
 * Formato oficial MEP 2026.
 *
 * Estructura del documento (replica el template en
 * miscelaneos/Informe de Valoración Integral 2026/word/document.xml):
 *
 *  Título
 *  Subtítulo "(Formato establecido a partir del curso lectivo 2026)"
 *  1. Datos generales del estudiantado
 *  2. Personas participantes en el proceso de valoración
 *  3. Contexto educativo
 *  4. Fortalezas, intereses y recursos del estudiantado
 *  5. Barreras para el aprendizaje y la participación
 *  6. Desempeño del estudiantado según el currículo
 *  7. Instrumentos y procedimientos utilizados
 *  8. Análisis integral del proceso educativo
 *  9. Apoyos educativos requeridos
 * 10. Acuerdos y recomendaciones
 * 11. Seguimiento y revisión
 *  Firmas
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
} from 'docx'

// ─────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────

export interface CurricularSubjectRow {
  subject: string
  goalsToAchieve: string
  progress: string
  supportNeeds: string
}

export interface ValoracionExportData {
  // Datos del estudiante
  studentName: string
  studentGrade: string       // "nivel / sección"
  studentCedula?: string
  studentBirthDate?: string  // ISO string o texto ya formateado
  medicalDiagnosis?: string

  // Datos del docente / centro
  teacherName: string
  centerName: string
  circuit: string
  specialty: string
  classroomTeacherName?: string

  // Sección 1 — fechas
  elaborationDate?: string   // ya formateado (dd/mm/yyyy)
  bsaReceivedDate?: string   // ya formateado

  // Sección 2
  participants: string[]

  // Sección 3
  classroomContext: string
  institutionalContext: string
  familyContext: string

  // Sección 4
  strengths: string

  // Sección 5
  barriers: string

  // Sección 6
  curricularSubjects: CurricularSubjectRow[]

  // Sección 7
  instruments: string[]
  instrumentNotes?: Record<string, string>  // código/label → notas del docente

  // Sección 8
  integralAnalysis: string

  // Sección 9
  requiredSupports: string

  // Sección 10
  agreements: string

  // Sección 11
  followUp: string
}

// ─────────────────────────────────────────────
// CONSTANTES DE ESTILO (del template oficial)
// ─────────────────────────────────────────────

const FONT = 'Arial'
const COLOR_TITLE    = '365F91'   // azul oscuro — título principal
const COLOR_HEADING  = '4F81BD'   // azul medio — encabezados de sección
const COLOR_LABEL    = '1F497D'   // azul oscuro suave — etiquetas de tabla
const COLOR_BODY     = '000000'
const COLOR_MUTED    = '666666'

const SIZE_TITLE   = 28   // 14pt  (half-points)
const SIZE_HEADING = 26   // 13pt
const SIZE_BODY    = 22   // 11pt
const SIZE_SMALL   = 18   // 9pt

const HEADER_FILL  = 'D9E2F3'   // azul celeste — encabezado tabla curricular
const ROW_ALT_FILL = 'EEF3FB'   // fila alternada tabla datos

// ─────────────────────────────────────────────
// PRIMITIVOS
// ─────────────────────────────────────────────

function sp(n = 200): Paragraph {
  return new Paragraph({ spacing: { after: n } })
}

function docTitle(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: SIZE_TITLE,
        color: COLOR_TITLE,
        font: FONT,
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { before: 480, after: 0 },
  })
}

function docSubtitle(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text, size: SIZE_BODY, font: FONT }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  })
}

function sectionHeading(num: string, text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${num}. ${text}`,
        bold: true,
        size: SIZE_HEADING,
        color: COLOR_HEADING,
        font: FONT,
      }),
    ],
    spacing: { before: 200, after: 0 },
  })
}

function instructionText(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: SIZE_BODY,
        color: COLOR_MUTED,
        italics: true,
        font: FONT,
      }),
    ],
    spacing: { after: 100 },
  })
}

function bodyText(text: string): Paragraph {
  if (!text.trim()) return sp(80)
  return new Paragraph({
    children: [
      new TextRun({ text: text.trim(), size: SIZE_BODY, font: FONT, color: COLOR_BODY }),
    ],
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 150 },
  })
}

function contextLabel(letter: string, label: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `${letter}) ${label}:`, bold: true, size: SIZE_BODY, font: FONT }),
    ],
    spacing: { after: 60 },
  })
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({ text: `• ${text}`, size: SIZE_BODY, font: FONT }),
    ],
    indent: { left: 360 },
    spacing: { after: 80 },
  })
}

function emptyBullets(count = 3): Paragraph[] {
  return Array.from({ length: count }, () =>
    new Paragraph({
      children: [new TextRun({ text: '• ', size: SIZE_BODY, font: FONT })],
      indent: { left: 360 },
      spacing: { after: 200 },
    })
  )
}

function signatureLine(label: string): Paragraph[] {
  return [
    sp(400),
    new Paragraph({
      children: [
        new TextRun({
          text: '____________________________________________',
          size: SIZE_BODY,
          font: FONT,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: label, bold: true, size: SIZE_BODY, font: FONT }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 0 },
    }),
  ]
}

// ─────────────────────────────────────────────
// CELDAS DE TABLA
// ─────────────────────────────────────────────

function labelCell(text: string, widthDxa = 3681): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, size: SIZE_BODY, font: FONT, color: COLOR_LABEL }),
        ],
        spacing: { after: 0 },
      }),
    ],
    width: { size: widthDxa, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
  })
}

function valueCell(text: string, widthDxa = 5865): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: text || '', size: SIZE_BODY, font: FONT }),
        ],
        spacing: { after: 0 },
      }),
    ],
    width: { size: widthDxa, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
  })
}

function headerCell4(text: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text, bold: true, size: SIZE_BODY, font: FONT, color: COLOR_BODY }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 0 },
      }),
    ],
    shading: { type: ShadingType.SOLID, color: HEADER_FILL },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
  })
}

function dataCell4(text: string): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: text || '', size: SIZE_BODY, font: FONT }),
        ],
        spacing: { after: 0 },
      }),
    ],
    verticalAlign: VerticalAlign.TOP,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
  })
}

// ─────────────────────────────────────────────
// TABLA DATOS GENERALES (sección 1)
// ─────────────────────────────────────────────

function adminTable(data: ValoracionExportData): Table {
  const rows: Array<{ label: string; value: string; alt: boolean }> = [
    { label: 'Nombre de la persona estudiante', value: data.studentName,         alt: false },
    { label: 'Nivel / Sección',                 value: data.studentGrade,        alt: true  },
    { label: 'Centro educativo',                value: data.centerName,          alt: false },
    { label: 'Docente guía',                    value: data.classroomTeacherName ?? '', alt: true },
    { label: 'Fecha de recibido de la BSA',     value: data.bsaReceivedDate     ?? '', alt: false },
    { label: 'Fecha de elaboración',            value: data.elaborationDate     ?? '', alt: true  },
  ]

  return new Table({
    rows: rows.map(({ label, value, alt }) =>
      new TableRow({
        children: [labelCell(label), valueCell(value)],
        tableHeader: false,
      })
    ),
    width: { size: 9546, type: WidthType.DXA },
    borders: {
      top:           { style: BorderStyle.SINGLE, size: 4, color: '4F81BD' },
      bottom:        { style: BorderStyle.SINGLE, size: 4, color: '4F81BD' },
      left:          { style: BorderStyle.SINGLE, size: 4, color: '4F81BD' },
      right:         { style: BorderStyle.SINGLE, size: 4, color: '4F81BD' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'B8CCE4' },
      insideVertical:   { style: BorderStyle.SINGLE, size: 2, color: 'B8CCE4' },
    },
  })
}

// ─────────────────────────────────────────────
// TABLA CURRICULAR (sección 6) — 4 columnas
// ─────────────────────────────────────────────

function curricularTable(rows: CurricularSubjectRow[]): Table {
  const headerRow = new TableRow({
    children: [
      headerCell4('Asignatura'),
      headerCell4('Aprendizajes por lograr'),
      headerCell4('Avances'),
      headerCell4('Necesidades de Apoyo'),
    ],
    tableHeader: true,
  })

  const dataRows = rows.length > 0 ? rows : Array(4).fill({
    subject: '', goalsToAchieve: '', progress: '', supportNeeds: '',
  })

  return new Table({
    rows: [
      headerRow,
      ...dataRows.map(row =>
        new TableRow({
          children: [
            dataCell4(row.subject),
            dataCell4(row.goalsToAchieve),
            dataCell4(row.progress),
            dataCell4(row.supportNeeds),
          ],
          height: { value: 800, rule: HeightRule.ATLEAST },
        })
      ),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top:     { style: BorderStyle.SINGLE, size: 4, color: '4F81BD' },
      bottom:  { style: BorderStyle.SINGLE, size: 4, color: '4F81BD' },
      left:    { style: BorderStyle.SINGLE, size: 4, color: '4F81BD' },
      right:   { style: BorderStyle.SINGLE, size: 4, color: '4F81BD' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'B8CCE4' },
      insideVertical:   { style: BorderStyle.SINGLE, size: 2, color: 'B8CCE4' },
    },
  })
}

// ─────────────────────────────────────────────
// SECCIÓN 9 — Apoyos por categoría
// ─────────────────────────────────────────────

const SUPPORT_CATEGORIES: { key: string; label: string }[] = [
  { key: 'personal',            label: 'Personales' },
  { key: 'curricular',          label: 'Curriculares' },
  { key: 'organizativo',        label: 'Organizativos' },
  { key: 'metodologico',        label: 'Metodológicos' },
  { key: 'evaluativo',          label: 'Evaluativos' },
  { key: 'material_tecnologico', label: 'Materiales / tecnológicos' },
]

function supportsSection(requiredSupports: string): Paragraph[] {
  const lines = requiredSupports.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length === 0) {
    return [bodyText('')]
  }
  return lines.map(line => bullet(line))
}

// ─────────────────────────────────────────────
// SECCIÓN 7 — Instrumentos
// ─────────────────────────────────────────────

const DEFAULT_INSTRUMENTS = [
  'Observación en aula',
  'Observación en otros contextos',
  'Entrevista a familia',
  'Entrevista a docentes',
  'Instrumentos basados en el currículo',
]

function instrumentsSection(
  selected: string[],
  notes: Record<string, string> = {}
): Paragraph[] {
  const selectedSet = new Set(selected.map(s => s.trim().toLowerCase()))
  const result: Paragraph[] = []

  for (const inst of DEFAULT_INSTRUMENTS) {
    const checked = selectedSet.has(inst.toLowerCase())
    result.push(
      new Paragraph({
        children: [
          new TextRun({ text: checked ? '☑' : '☐', size: SIZE_BODY, font: 'Segoe UI Symbol' }),
          new TextRun({ text: ` ${inst}`, size: SIZE_BODY, font: FONT }),
        ],
        spacing: { after: 60 },
      })
    )
    // Si el instrumento está seleccionado y tiene notas, las agrega debajo
    if (checked) {
      const notesText = notes[inst] ?? notes[inst.toLowerCase()] ?? ''
      if (notesText.trim()) {
        for (const line of notesText.split('\n')) {
          if (line.trim()) {
            result.push(
              new Paragraph({
                children: [
                  new TextRun({
                    text: `    ${line.trim()}`,
                    size: SIZE_SMALL,
                    font: FONT,
                    italics: true,
                    color: COLOR_MUTED,
                  }),
                ],
                spacing: { after: 40 },
              })
            )
          }
        }
      }
    }
  }

  // Instrumentos adicionales no incluidos en la lista por defecto
  const extra = selected.filter(
    s => !DEFAULT_INSTRUMENTS.map(d => d.toLowerCase()).includes(s.trim().toLowerCase())
  )
  if (extra.length > 0) {
    result.push(
      new Paragraph({
        children: [
          new TextRun({ text: '☑', size: SIZE_BODY, font: 'Segoe UI Symbol' }),
          new TextRun({ text: ` Otros: ${extra.join(', ')}`, size: SIZE_BODY, font: FONT }),
        ],
        spacing: { after: 60 },
      })
    )
  } else {
    result.push(
      new Paragraph({
        children: [
          new TextRun({ text: '☐', size: SIZE_BODY, font: 'Segoe UI Symbol' }),
          new TextRun({ text: ' Otros: ____________________________', size: SIZE_BODY, font: FONT }),
        ],
        spacing: { after: 60 },
      })
    )
  }

  return result
}

// ─────────────────────────────────────────────
// GENERADOR PRINCIPAL
// ─────────────────────────────────────────────

export function generateValoracionDocument(data: ValoracionExportData): Document {
  const kids: (Paragraph | Table)[] = []

  // ── TÍTULO ──
  kids.push(docTitle('INFORME DE VALORACIÓN INTEGRAL DEL ESTUDIANTADO'))
  kids.push(docSubtitle('(Formato establecido a partir del curso lectivo 2026)'))
  kids.push(sp(100))

  // ── 1. DATOS GENERALES ──
  kids.push(sectionHeading('1', 'Datos generales del estudiantado'))
  kids.push(sp(80))
  kids.push(adminTable(data))
  kids.push(sp(200))

  // ── 2. PARTICIPANTES ──
  kids.push(sectionHeading('2', 'Personas participantes en el proceso de valoración'))
  kids.push(instructionText(
    'Indicar las personas que participaron activamente en el proceso de valoración integral (docentes, familia, persona estudiante, profesionales de apoyo, entre otros).'
  ))

  if (data.participants.length > 0) {
    for (const p of data.participants) {
      kids.push(bullet(p))
    }
  } else {
    kids.push(...emptyBullets(3))
  }
  kids.push(sp(200))

  // ── 3. CONTEXTO EDUCATIVO ──
  kids.push(sectionHeading('3', 'Contexto educativo'))
  kids.push(instructionText('Describir los principales elementos del contexto que influyen en el proceso educativo del estudiantado.'))

  kids.push(contextLabel('a', 'Contexto de aula'))
  if (data.classroomContext.trim()) {
    for (const line of data.classroomContext.split('\n')) {
      kids.push(bodyText(line))
    }
  } else {
    kids.push(sp(300))
  }

  kids.push(contextLabel('b', 'Contexto institucional'))
  if (data.institutionalContext.trim()) {
    for (const line of data.institutionalContext.split('\n')) {
      kids.push(bodyText(line))
    }
  } else {
    kids.push(sp(300))
  }

  kids.push(contextLabel('c', 'Contexto familiar y comunitario'))
  if (data.familyContext.trim()) {
    for (const line of data.familyContext.split('\n')) {
      kids.push(bodyText(line))
    }
  } else {
    kids.push(sp(300))
  }
  kids.push(sp(200))

  // ── 4. FORTALEZAS ──
  kids.push(sectionHeading('4', 'Fortalezas, intereses y recursos del estudiantado'))
  kids.push(instructionText('Identificar las fortalezas, intereses, estilos de aprendizaje, habilidades adaptativas, comunicativas, sociales y emocionales del estudiantado.'))

  if (data.strengths.trim()) {
    for (const line of data.strengths.split('\n')) {
      if (line.trim().startsWith('•')) {
        kids.push(bullet(line.trim().replace(/^•\s*/, '')))
      } else {
        kids.push(bodyText(line))
      }
    }
  } else {
    kids.push(sp(400))
  }
  kids.push(sp(200))

  // ── 5. BARRERAS ──
  kids.push(sectionHeading('5', 'Barreras para el aprendizaje y la participación'))
  kids.push(instructionText('Identificar barreras presentes en el contexto, el currículo, la metodología, la evaluación, la organización o los apoyos, evitando enfoques centrados en el déficit.'))

  if (data.barriers.trim()) {
    for (const line of data.barriers.split('\n')) {
      if (line.trim().startsWith('•')) {
        kids.push(bullet(line.trim().replace(/^•\s*/, '')))
      } else {
        kids.push(bodyText(line))
      }
    }
  } else {
    kids.push(sp(400))
  }
  kids.push(sp(200))

  // ── 6. DESEMPEÑO CURRICULAR ──
  kids.push(sectionHeading('6', 'Desempeño del estudiantado según el currículo'))
  kids.push(instructionText('Describir el desempeño del estudiantado con base en el currículo nacional, considerando aprendizajes por lograr, avances y necesidades de apoyo.'))
  kids.push(sp(80))
  kids.push(curricularTable(data.curricularSubjects))
  kids.push(sp(200))

  // ── 7. INSTRUMENTOS ──
  kids.push(sectionHeading('7', 'Instrumentos y procedimientos utilizados'))
  kids.push(instructionText('Marcar o describir los instrumentos utilizados en el proceso de valoración:'))
  kids.push(...instrumentsSection(data.instruments, data.instrumentNotes ?? {}))
  kids.push(sp(200))

  // ── 8. ANÁLISIS INTEGRAL ──
  kids.push(sectionHeading('8', 'Análisis integral del proceso educativo'))
  kids.push(instructionText('Análisis conjunto de la información recopilada, considerando la interacción entre estudiante, contexto, prácticas pedagógicas y apoyos.'))

  if (data.integralAnalysis.trim()) {
    for (const line of data.integralAnalysis.split('\n')) {
      kids.push(bodyText(line))
    }
  } else {
    kids.push(sp(500))
  }
  kids.push(sp(200))

  // ── 9. APOYOS REQUERIDOS ──
  kids.push(sectionHeading('9', 'Apoyos educativos requeridos'))
  kids.push(instructionText('Detallar los apoyos personales, curriculares, organizativos, metodológicos, evaluativos y materiales/tecnológicos que se consideran necesarios.'))
  kids.push(...supportsSection(data.requiredSupports))
  kids.push(sp(200))

  // ── 10. ACUERDOS ──
  kids.push(sectionHeading('10', 'Acuerdos y recomendaciones'))
  kids.push(instructionText('Establecer acuerdos y recomendaciones construidas de manera colaborativa para la mejora del proceso educativo.'))

  if (data.agreements.trim()) {
    for (const line of data.agreements.split('\n')) {
      kids.push(bodyText(line))
    }
  } else {
    kids.push(sp(400))
  }
  kids.push(sp(200))

  // ── 11. SEGUIMIENTO ──
  kids.push(sectionHeading('11', 'Seguimiento y revisión'))
  kids.push(instructionText('Indicar la periodicidad de revisión de los apoyos y ajustes, así como las personas responsables.'))

  if (data.followUp.trim()) {
    for (const line of data.followUp.split('\n')) {
      kids.push(bodyText(line))
    }
  } else {
    kids.push(sp(400))
  }
  kids.push(sp(200))

  // ── FIRMAS ──
  kids.push(
    new Paragraph({
      children: [new TextRun({ text: 'Firmas', bold: true, size: SIZE_HEADING, color: COLOR_HEADING, font: FONT })],
      spacing: { before: 200, after: 0 },
    })
  )

  kids.push(
    new Paragraph({
      children: [new TextRun({ text: 'Nombre y firma del personal docente:', size: SIZE_BODY, font: FONT })],
      spacing: { after: 200 },
    })
  )
  kids.push(...signatureLine(data.teacherName))
  kids.push(
    new Paragraph({
      children: [new TextRun({ text: data.specialty, size: SIZE_SMALL, font: FONT, color: COLOR_MUTED })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  )

  kids.push(
    new Paragraph({
      children: [new TextRun({ text: 'Nombre y firma del personal de apoyo:', size: SIZE_BODY, font: FONT })],
      spacing: { after: 200 },
    })
  )
  kids.push(...signatureLine('Docente de apoyo'))
  kids.push(sp(400))

  kids.push(
    new Paragraph({
      children: [new TextRun({ text: 'Nombre y firma de la familia:', size: SIZE_BODY, font: FONT })],
      spacing: { after: 200 },
    })
  )
  kids.push(...signatureLine('Padre / Madre / Encargado(a)'))
  kids.push(sp(400))

  // ── PIE ──
  kids.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Elaborado con Katà  –  ${data.centerName}  –  ${data.elaborationDate ?? ''}`,
          size: SIZE_SMALL,
          font: FONT,
          color: COLOR_MUTED,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { before: 400, after: 0 },
    })
  )

  // ── DOCUMENTO ──
  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top:    1418,
              bottom: 1417,
              left:   1701,
              right:  1701,
            },
          },
        },
        children: kids,
      },
    ],
    styles: {
      default: {
        document: {
          run: { font: FONT, size: SIZE_BODY },
        },
      },
    },
  })
}
