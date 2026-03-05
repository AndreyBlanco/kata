// lib/word-export.ts

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
} from 'docx'

interface ReportData {
  administrative: {
    studentName: string
    age: number
    grade: string
    teacherName: string
    centerName: string
    circuit: string
    specialty: string
    reportPeriod: string
    generatedDate: string
  }
  annualFramework: {
    planTypeLabel: string
    activeDifficulties: string[]
    priorityProcesses: string[]
    narrative: string
  }
  periodSynthesis: {
    objectivesWorked: number
    totalSessions: number
    sessionsAttended: number
    sessionsAbsent: number
    completionRate: number
    narrative: string
  }
  objectiveDevelopment: Array<{
    macroArea: string
    specificGoal: string
    totalSessions: number
    attendedSessions: number
    achievedPercentage: number
    progressLevel: string
    averageSupportLevel: number
    narrative: string
  }>
  supports: {
    strategies: string[]
    narrative: string
  }
  recommendations: {
    editable: string
  }
}

// =============================================
// ESTILOS REUTILIZABLES
// =============================================

function title(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 32,
        font: 'Calibri',
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  })
}

function subtitle(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: true,
        size: 20,
        font: 'Calibri',
        color: '555555',
      }),
    ],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  })
}

function sectionHeading(text: string): Paragraph {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 400, after: 200 },
    border: {
      bottom: {
        style: BorderStyle.SINGLE,
        size: 1,
        color: 'CCCCCC',
      },
    },
  })
}

function bodyText(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: 22,
        font: 'Calibri',
      }),
    ],
    spacing: { after: 150 },
    alignment: AlignmentType.JUSTIFIED,
  })
}

function labelValue(label: string, value: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `${label}: `,
        bold: true,
        size: 22,
        font: 'Calibri',
      }),
      new TextRun({
        text: value,
        size: 22,
        font: 'Calibri',
      }),
    ],
    spacing: { after: 80 },
  })
}

function bulletPoint(text: string): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: `• ${text}`,
        size: 22,
        font: 'Calibri',
      }),
    ],
    spacing: { after: 80 },
    indent: { left: 360 },
  })
}

function emptyLine(): Paragraph {
  return new Paragraph({ spacing: { after: 200 } })
}

function createInfoCell(text: string, isHeader: boolean = false): TableCell {
  return new TableCell({
    children: [
      new Paragraph({
        children: [
          new TextRun({
            text,
            bold: isHeader,
            size: 20,
            font: 'Calibri',
          }),
        ],
        spacing: { after: 0 },
      }),
    ],
    shading: isHeader
      ? { type: ShadingType.SOLID, color: 'F0F4F8' }
      : undefined,
    width: { size: isHeader ? 30 : 70, type: WidthType.PERCENTAGE },
  })
}

// =============================================
// GENERADOR PRINCIPAL
// =============================================

export function generateWordDocument(
  report: ReportData,
  editableRecommendations: string
): Document {
  const { administrative, annualFramework, periodSynthesis, objectiveDevelopment, supports } = report

  const children: Paragraph[] = []

  // ── ENCABEZADO ──
  children.push(title('INFORME DE PERIODO'))
  children.push(subtitle('Servicio de Apoyo en Problemas de Aprendizaje'))
  children.push(emptyLine())

  // ── 1. DATOS ADMINISTRATIVOS ──
  children.push(sectionHeading('1. Datos Administrativos'))

  const adminTable = new Table({
    rows: [
      new TableRow({
        children: [
          createInfoCell('Estudiante', true),
          createInfoCell(administrative.studentName),
        ],
      }),
      new TableRow({
        children: [
          createInfoCell('Edad', true),
          createInfoCell(`${administrative.age} años`),
        ],
      }),
      new TableRow({
        children: [
          createInfoCell('Grado', true),
          createInfoCell(administrative.grade),
        ],
      }),
      new TableRow({
        children: [
          createInfoCell('Periodo', true),
          createInfoCell(administrative.reportPeriod),
        ],
      }),
      new TableRow({
        children: [
          createInfoCell('Docente de apoyo', true),
          createInfoCell(administrative.teacherName),
        ],
      }),
      new TableRow({
        children: [
          createInfoCell('Centro educativo', true),
          createInfoCell(administrative.centerName),
        ],
      }),
      new TableRow({
        children: [
          createInfoCell('Circuito', true),
          createInfoCell(administrative.circuit),
        ],
      }),
      new TableRow({
        children: [
          createInfoCell('Especialidad', true),
          createInfoCell(administrative.specialty),
        ],
      }),
      new TableRow({
        children: [
          createInfoCell('Fecha de emisión', true),
          createInfoCell(administrative.generatedDate),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })

  // ── 2. MARCO ANUAL ──
  const section2: Paragraph[] = []
  section2.push(sectionHeading('2. Marco Anual — Plan de Apoyo'))
  section2.push(labelValue('Tipo de plan', annualFramework.planTypeLabel))

  if (annualFramework.activeDifficulties.length > 0) {
    section2.push(
      labelValue('Dificultades identificadas', annualFramework.activeDifficulties.join(', '))
    )
  }

  if (annualFramework.priorityProcesses.length > 0) {
    section2.push(
      labelValue('Procesos prioritarios', annualFramework.priorityProcesses.join(', '))
    )
  }

  section2.push(emptyLine())

  // Narrativa del marco anual (puede tener saltos de línea)
  const frameworkParagraphs = annualFramework.narrative
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => bodyText(line.trim()))

  // ── 3. SÍNTESIS DEL PERIODO ──
  const section3: Paragraph[] = []
  section3.push(sectionHeading('3. Síntesis del Periodo'))

  const synthesisTable = new Table({
    rows: [
      new TableRow({
        children: [
          createInfoCell('Total de sesiones', true),
          createInfoCell(String(periodSynthesis.totalSessions)),
        ],
      }),
      new TableRow({
        children: [
          createInfoCell('Sesiones atendidas', true),
          createInfoCell(String(periodSynthesis.sessionsAttended)),
        ],
      }),
      new TableRow({
        children: [
          createInfoCell('Ausencias', true),
          createInfoCell(String(periodSynthesis.sessionsAbsent)),
        ],
      }),
      new TableRow({
        children: [
          createInfoCell('Porcentaje de registro', true),
          createInfoCell(`${periodSynthesis.completionRate}%`),
        ],
      }),
      new TableRow({
        children: [
          createInfoCell('Objetivos trabajados', true),
          createInfoCell(String(periodSynthesis.objectivesWorked)),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })

  // ── 4. DESARROLLO POR OBJETIVO ──
  const section4: Paragraph[] = []
  section4.push(sectionHeading('4. Desarrollo por Objetivo'))

  for (const obj of objectiveDevelopment) {
    section4.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${obj.macroArea}: `,
            bold: true,
            size: 22,
            font: 'Calibri',
            color: '2563EB',
          }),
          new TextRun({
            text: obj.specificGoal,
            bold: true,
            size: 22,
            font: 'Calibri',
          }),
        ],
        spacing: { before: 300, after: 100 },
      })
    )

    section4.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Nivel de progreso: ${obj.progressLevel}`,
            italics: true,
            size: 20,
            font: 'Calibri',
            color: '666666',
          }),
          new TextRun({
            text: `  |  Sesiones: ${obj.attendedSessions}/${obj.totalSessions}`,
            size: 20,
            font: 'Calibri',
            color: '666666',
          }),
          new TextRun({
            text: `  |  Logrado: ${obj.achievedPercentage}%`,
            size: 20,
            font: 'Calibri',
            color: '666666',
          }),
          ...(obj.averageSupportLevel > 0
            ? [
                new TextRun({
                  text: `  |  Apoyo promedio: ${obj.averageSupportLevel}`,
                  size: 20,
                  font: 'Calibri',
                  color: '666666',
                }),
              ]
            : []),
        ],
        spacing: { after: 100 },
      })
    )

    section4.push(bodyText(obj.narrative))
    section4.push(emptyLine())
  }

  // ── 5. APOYOS IMPLEMENTADOS ──
  const section5: Paragraph[] = []
  section5.push(sectionHeading('5. Apoyos Implementados'))
  section5.push(bodyText(supports.narrative))

  if (supports.strategies.length > 0) {
    section5.push(emptyLine())
    section5.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Estrategias y observaciones registradas:',
            bold: true,
            size: 22,
            font: 'Calibri',
          }),
        ],
        spacing: { after: 100 },
      })
    )
    for (const strategy of supports.strategies) {
      section5.push(bulletPoint(strategy))
    }
  }

  // ── 6. RECOMENDACIONES ──
  const section6: Paragraph[] = []
  section6.push(sectionHeading('6. Recomendaciones'))

  const recommendationLines = editableRecommendations
    .split('\n')
    .filter((line) => line.trim())

  for (const line of recommendationLines) {
    section6.push(bulletPoint(line.trim()))
  }

  // ── FIRMAS ──
  const signatures: Paragraph[] = []
  signatures.push(emptyLine())
  signatures.push(emptyLine())
  signatures.push(emptyLine())

  signatures.push(
    new Paragraph({
      children: [
        new TextRun({
          text: '____________________________________',
          size: 22,
          font: 'Calibri',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
    })
  )
  signatures.push(
    new Paragraph({
      children: [
        new TextRun({
          text: administrative.teacherName,
          bold: true,
          size: 22,
          font: 'Calibri',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
    })
  )
  signatures.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Docente de Apoyo — ${administrative.specialty}`,
          size: 20,
          font: 'Calibri',
          color: '666666',
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
    })
  )
  signatures.push(
    new Paragraph({
      children: [
        new TextRun({
          text: administrative.centerName,
          size: 20,
          font: 'Calibri',
          color: '666666',
        }),
      ],
      alignment: AlignmentType.CENTER,
    })
  )

  // ── ENSAMBLAR DOCUMENTO ──
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: [
          ...children,
          adminTable,
          emptyLine(),
          ...section2,
          ...frameworkParagraphs,
          emptyLine(),
          ...section3,
          synthesisTable,
          emptyLine(),
          bodyText(periodSynthesis.narrative),
          emptyLine(),
          ...section4,
          ...section5,
          emptyLine(),
          ...section6,
          ...signatures,
        ],
      },
    ],
  })

  return doc
}