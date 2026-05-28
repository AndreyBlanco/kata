/**
 * lib/bsa-parse-cleanup.ts
 *
 * Elimina instrucciones MEP fijas (texto entre paréntesis) que mammoth/IA
 * capturan como parte del valor del campo al hacer upload de la BSA.
 */

import type { StudentBsaFields } from '@/lib/bsa-types'

/** Líneas completas que son instrucción fija del formulario, no contenido del docente. */
const INSTRUCTION_ONLY_LINES: RegExp[] = [
  /^\(se llena por el docente de Primera Infancia, I y II Ciclo y Secundaria\)\s*:?\s*$/i,
  /^\(llenado por el personal docente del servicio de apoyo educativo\)\s*:?\s*$/i,
]

/** Prefijos inline al inicio del valor (misma línea que el contenido). */
const INSTRUCTION_PREFIXES: RegExp[] = [
  /^\(se llena por el docente de Primera Infancia, I y II Ciclo y Secundaria\)\s*:?\s*/i,
  /^\(llenado por el personal docente del servicio de apoyo educativo\)\s*:?\s*/i,
]

function isInstructionOnlyLine(line: string): boolean {
  const t = line.trim()
  if (!t) return false
  return INSTRUCTION_ONLY_LINES.some((re) => re.test(t))
}

/** Quita instrucciones MEP al inicio de un campo multilínea. */
export function stripLeadingBsaInstructions(text: string): string {
  let result = text.replace(/\r\n/g, '\n').trim()
  if (!result) return ''

  const lines = result.split('\n')
  const kept: string[] = []
  for (const line of lines) {
    if (kept.length === 0 && isInstructionOnlyLine(line)) continue
    kept.push(line)
  }
  result = kept.join('\n').trim()

  for (const prefix of INSTRUCTION_PREFIXES) {
    result = result.replace(prefix, '').trim()
  }

  return result
}

/** Placeholders del formulario vacío que no deben archivarse como contenido real. */
export function stripBsaPlaceholderText(field: 'supportDetermination', text: string): string {
  const t = text.trim()
  if (field === 'supportDetermination' && /^lo que determin[oó]\.?$/i.test(t)) {
    return ''
  }
  return text
}

export function sanitizeBsaFieldValue(
  field: 'studentSchedule' | 'supportDetermination',
  text: string,
): string {
  let out = stripLeadingBsaInstructions(text)
  if (field === 'supportDetermination') {
    out = stripBsaPlaceholderText('supportDetermination', out)
  }
  return out.trim()
}

/** Limpia campos propensos a arrastrar instrucciones MEP duplicadas. */
export function sanitizeBsaParsedFields(fields: StudentBsaFields): StudentBsaFields {
  return {
    ...fields,
    request: {
      ...fields.request,
      studentSchedule: sanitizeBsaFieldValue('studentSchedule', fields.request.studentSchedule),
    },
    resolution: {
      ...fields.resolution,
      supportDetermination: sanitizeBsaFieldValue(
        'supportDetermination',
        fields.resolution.supportDetermination,
      ),
    },
  }
}
