/**
 * lib/bsa-export.ts
 *
 * Exportación DOCX de la Boleta de Solicitud de Apoyo (BSA) MEP 2026.
 * Fuente de datos: StudentBsaForm.fields (canónico).
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
} from 'docx'
import {
  BSA_SERVICE_LABELS,
  BSA_SERVICE_TABLE_PAIRS,
  type BsaServiceCode,
  type StudentBsaFields,
} from '@/lib/bsa-types'

const FONT = 'Arial'
const COLOR_TITLE = '365F91'
const COLOR_HEADING = '4F81BD'
const COLOR_LABEL = '1F497D'
const COLOR_BODY = '000000'
const COLOR_MUTED = '666666'
const FILL_HEADER = 'D9E2F3'

const SIZE_TITLE = 28
const SIZE_HEADING = 24
const SIZE_BODY = 20
const SIZE_SMALL = 18

function fmtDisplayDate(iso: string): string {
  if (!iso.trim()) return ''
  const d = new Date(`${iso.trim()}T12:00:00.000Z`)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('es-CR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d)
}

function sp(after = 120): Paragraph {
  return new Paragraph({ spacing: { after } })
}

function title(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: SIZE_TITLE, color: COLOR_TITLE, font: FONT })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 80 },
  })
}

function heading(text: string): Paragraph {
  return new Paragraph({
    children: [new TextRun({ text, bold: true, size: SIZE_HEADING, color: COLOR_HEADING, font: FONT })],
    spacing: { before: 160, after: 80 },
  })
}

function body(text: string, opts?: { bold?: boolean; italic?: boolean }): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text: text || '—',
        size: SIZE_BODY,
        font: FONT,
        color: text ? COLOR_BODY : COLOR_MUTED,
        bold: opts?.bold,
        italics: opts?.italic || !text,
      }),
    ],
    spacing: { after: 60 },
  })
}

function multiline(text: string): Paragraph[] {
  if (!text.trim()) return [body('')]
  return text.split('\n').map((line) => body(line.trimEnd() || ' '))
}

function labelValueRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 35, type: WidthType.PERCENTAGE },
        shading: { fill: FILL_HEADER, type: ShadingType.CLEAR },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            children: [new TextRun({ text: label, bold: true, size: SIZE_BODY, font: FONT, color: COLOR_LABEL })],
          }),
        ],
      }),
      new TableCell({
        width: { size: 65, type: WidthType.PERCENTAGE },
        children: multiline(value),
      }),
    ],
  })
}

function dataTable(rows: Array<[string, string]>): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([label, value]) => labelValueRow(label, value)),
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
      left: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
      right: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
    },
  })
}

function serviceCheckboxCell(label: string, checked: boolean): TableCell {
  return new TableCell({
    width: { size: 42, type: WidthType.PERCENTAGE },
    children: [body(label)],
  })
}

function serviceMarkCell(checked: boolean): TableCell {
  return new TableCell({
    width: { size: 8, type: WidthType.PERCENTAGE },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({
            text: checked ? 'X' : '',
            bold: true,
            size: SIZE_BODY,
            font: FONT,
          }),
        ],
      }),
    ],
  })
}

function servicePairRow(left: BsaServiceCode, right: BsaServiceCode, services: StudentBsaFields['request']['servicesRequested']): TableRow {
  return new TableRow({
    children: [
      serviceCheckboxCell(BSA_SERVICE_LABELS[left], services[left]),
      serviceMarkCell(services[left]),
      serviceCheckboxCell(BSA_SERVICE_LABELS[right], services[right]),
      serviceMarkCell(services[right]),
    ],
  })
}

export function buildBsaDocument(fields: StudentBsaFields): Document {
  const { institution, student, request, resolution } = fields
  const viDates = resolution.viSessionDates
    .filter((d) => d.trim().length > 0)
    .map((d, i) => `Fecha ${i + 1}: ${fmtDisplayDate(d)}`)

  const children: (Paragraph | Table)[] = [
    title('Boleta de Solicitud de Apoyo Educativo'),
    new Paragraph({
      children: [
        new TextRun({
          text: '(Formato MEP — curso lectivo 2026)',
          size: SIZE_SMALL,
          font: FONT,
          color: COLOR_MUTED,
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),

    heading('1. Datos de la institución educativa'),
    dataTable([
      ['Nombre de la institución educativa', institution.centerName],
      ['Circuito', institution.circuit],
      ['Código presupuestario', institution.budgetCode],
      ['Nombre del director(a)', institution.directorName],
      ['Fecha de confección de la referencia', fmtDisplayDate(institution.referenceDate)],
    ]),
    sp(),

    heading('2. Datos de la persona estudiante'),
    dataTable([
      ['Nombre completo', student.fullName],
      ['Fecha de nacimiento', fmtDisplayDate(student.birthDate)],
      ['Edad', student.ageAsWritten],
      ['Número de cédula', student.cedula],
      ['Número de persona contacto', student.contactPhone],
      ['Encargado legal', student.legalGuardian],
      ['Lugar de residencia', student.residence],
      ['Docente que refiere', student.referringTeacher],
      ['Grado que cursa', student.grade],
    ]),
    sp(),

    heading('3. Situaciones educativas por las cuales se solicita apoyo'),
    ...multiline(request.educationalSituations),
    sp(),

    heading('4. Horario de la persona estudiante'),
    ...multiline(request.studentSchedule),
    sp(),

    heading('5. Servicios de apoyo solicitados'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: BSA_SERVICE_TABLE_PAIRS.map(([left, right]) =>
        servicePairRow(left, right, request.servicesRequested),
      ),
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
        left: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
        right: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
        insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' },
      },
    }),
    sp(200),

    heading('Determinación del apoyo educativo por brindar'),
    ...multiline(resolution.supportDetermination),
    sp(),

    heading('Fechas de Valoración Integral'),
    ...(viDates.length > 0 ? viDates.map((line) => body(line)) : [body('')]),
    sp(),

    heading('Consignación de la forma en que se brindará el servicio'),
    ...multiline(resolution.serviceProvisionNotes),
    sp(240),

    new Paragraph({
      children: [
        new TextRun({
          text: 'Documento generado con Katà — revisar y completar firmas antes de entregar.',
          size: SIZE_SMALL,
          font: FONT,
          color: COLOR_MUTED,
          italics: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
  ]

  return new Document({
    sections: [{ properties: {}, children }],
  })
}
