/**
 * Prompts para extracción estructurada de Boleta de Solicitud de Apoyo (BSA) MEP 2026.
 */

export const BSA_PARSE_SYSTEM_PROMPT = `Sos un asistente que extrae datos de Boletas de Solicitud de Apoyo Educativo (BSA) del MEP Costa Rica.

Reglas:
- Respondé ÚNICAMENTE con un objeto JSON válido, sin markdown ni texto extra.
- Copiá el texto de cada campo tal como aparece en el documento (palabra por palabra).
- NO incluyas instrucciones fijas del formulario MEP entre paréntesis dentro del valor del campo. Ejemplos a omitir: "(se llena por el docente de Primera Infancia, I y II Ciclo y Secundaria)" en horario; "(llenado por el personal docente del servicio de apoyo educativo)" en determinación.
- Si la determinación solo dice "Lo que determinó" (placeholder vacío), dejá supportDetermination como "".
- Si un campo no aparece, usá string vacío "" o false en checkboxes.
- Las fechas deben ir en formato ISO YYYY-MM-DD cuando sea posible inferirlas.
- viSessionDates: array de fechas ISO; si no hay ninguna, ["].
- servicesRequested: objeto con claves aprendizaje, discapacidad_intelectual, discapacidad_visual, audicion_lenguaje, terapia_lenguaje, discapacidad_multiple (boolean).
- No inventes datos.`

export function bsaParseUserPrompt(documentText: string): string {
  return `Extraé los campos de esta BSA y devolvé JSON con esta estructura exacta:

{
  "institution": {
    "centerName": "",
    "circuit": "",
    "budgetCode": "",
    "directorName": "",
    "referenceDate": ""
  },
  "student": {
    "fullName": "",
    "birthDate": "",
    "ageAsWritten": "",
    "cedula": "",
    "contactPhone": "",
    "legalGuardian": "",
    "residence": "",
    "referringTeacher": "",
    "grade": ""
  },
  "request": {
    "educationalSituations": "",
    "studentSchedule": "",
    "servicesRequested": {
      "aprendizaje": false,
      "discapacidad_intelectual": false,
      "discapacidad_visual": false,
      "audicion_lenguaje": false,
      "terapia_lenguaje": false,
      "discapacidad_multiple": false
    }
  },
  "resolution": {
    "supportDetermination": "",
    "viSessionDates": [""],
    "serviceProvisionNotes": ""
  }
}

Texto del documento:
---
${documentText.slice(0, 28000)}
---`
}
