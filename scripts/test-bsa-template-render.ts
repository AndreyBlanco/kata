/**
 * Prueba local: renderiza BSA con datos de muestra (Susana López).
 *
 * Uso: npx tsx scripts/test-bsa-template-render.ts
 */

import fs from 'fs'
import path from 'path'
import { renderBsaFromTemplate } from '../lib/exports/bsa-from-template'
import type { StudentBsaFields } from '../lib/bsa-types'

const sample: StudentBsaFields = {
  institution: {
    centerName: 'IDA Garabito',
    circuit: '04 – Aguas Zarcas',
    budgetCode: '1415',
    directorName: 'M.S.c. Noemy Gómez Araya',
    referenceDate: '2026-04-27',
  },
  student: {
    fullName: 'Susana López',
    birthDate: '2015-08-18',
    ageAsWritten: '10',
    cedula: 'YR2022-01263',
    contactPhone: '61603854',
    legalGuardian: 'Sandra López',
    residence: '75 mts del super Económico Manantial',
    referringTeacher: 'Sujey Retana Leitón',
    grade: '5-1',
  },
  request: {
    educationalSituations:
      'La menor en este lapso se le ha brindado atención individualizada en el aula…',
    studentSchedule: 'La menor asiste con horario de 7:00 am a 2:00 pm. De lunes a jueves.',
    servicesRequested: {
      aprendizaje: true,
      discapacidad_intelectual: true,
      discapacidad_visual: true,
      audicion_lenguaje: true,
      terapia_lenguaje: true,
      discapacidad_multiple: true,
    },
  },
  resolution: {
    supportDetermination: 'Servicio de Apoyo Educativo en Aprendizaje — itinerante.',
    viSessionDates: ['2026-05-10', '2026-05-17', '', '', '', ''],
    serviceProvisionNotes: 'Acompañamiento en aula regular dos veces por semana.',
  },
}

const outDir = path.join(process.cwd(), '.tmp')
fs.mkdirSync(outDir, { recursive: true })
const outPath = path.join(outDir, 'bsa-susana-render.docx')

const buf = renderBsaFromTemplate(sample)
fs.writeFileSync(outPath, buf)
console.log(`✓ Export de prueba: ${outPath} (${buf.length} bytes)`)
