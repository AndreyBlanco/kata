/**
 * Notas orientadoras para docentes en entrevistas y observaciones.
 * No son guiones cerrados: enfatizan qué buscar y ofrecen ejemplos abiertos.
 */

import type {
  InterviewDimensionsContent,
  InterviewSaberesContent,
} from '@/lib/capa2-types'

export type FieldGuidance = {
  /** Qué tipo de información conviene registrar aquí */
  purpose: string
  /** Ideas para indagar (opcionales, no exhaustivas) */
  prompts?: string[]
}

export const GUIDANCE_FOOTER =
  'Estas ideas son orientación, no una lista que deba recorrerse completa. Formule sus propias preguntas según lo que vaya respondiendo la persona.'

export const INTERVIEW_SABERES_GUIDANCE: Record<keyof InterviewSaberesContent, FieldGuidance> = {
  conoce: {
    purpose:
      'Registre contenidos, conceptos o procedimientos que la persona demuestra conocer en el día a día (no solo calificaciones). Observe si recuerda instrucciones, vocabulario del área o rutinas del aula.',
    prompts: [
      '¿De qué temas habla con seguridad cuando participa?',
      '¿Qué recuerda después de una explicación o de un trabajo en grupo?',
    ],
  },
  sabeHacer: {
    purpose:
      'Describa habilidades que ya ejecuta con cierta autonomía: lectura, escritura, cálculo, uso de materiales, organización del trabajo, participación en actividades.',
    prompts: [
      '¿Qué tareas inicia y termina sin que le recuerden cada paso?',
      '¿En qué momentos del día se ve más capaz o seguro?',
    ],
  },
  dificultades: {
    purpose:
      'Anote procesos o contenidos que se le dificultan de forma recurrente, en qué asignaturas o situaciones aparecen y si hay patrones (inicio de tarea, lectura en voz alta, etc.).',
    prompts: [
      '¿Qué tarea suele dejar incompleta o evitar?',
      '¿En qué momento del proceso se detiene o pide ayuda?',
    ],
  },
  estiloPreferencias: {
    purpose:
      'Indague cómo aprende mejor: visual, auditivo, manipulativo, en pareja, con tiempo extra, con instrucciones cortas, con ejemplos, etc.',
    prompts: [
      '¿Cómo prefiere recibir las indicaciones?',
      '¿Qué materiales o estrategias le funcionan cuando algo le cuesta?',
    ],
  },
  relacionInteraccion: {
    purpose:
      'Observe cómo se relaciona con compañeros, docentes y adultos: participación, turnos, manejo de frustración, búsqueda de ayuda, liderazgo o aislamiento.',
    prompts: [
      '¿Con quién se vincula con más facilidad?',
      '¿Cómo reacciona ante una corrección o un desacuerdo?',
    ],
  },
  contextoFamiliar: {
    purpose:
      'Recoja fortalezas del hogar, rutinas, quién acompaña el estudio, expectativas familiares y situaciones que influyen en el proceso educativo (sin juicios).',
    prompts: [
      '¿Quién apoya las tareas o la comunicación con el centro?',
      '¿Qué rutinas en casa ayudan o complican el estudio?',
    ],
  },
  situacionesFavorables: {
    purpose:
      'Identifique contextos, momentos, espacios o tipos de actividad donde el aprendizaje fluye mejor.',
    prompts: [
      '¿Cuándo se muestra más participativo o concentrado?',
      '¿Qué tipo de actividad disfruta más en el centro?',
    ],
  },
  situacionesDificultan: {
    purpose:
      'Registre situaciones que aumentan la dificultad: ruido, cambios de rutina, evaluaciones, trabajo en grupo, tiempos cortos, etc.',
    prompts: [
      '¿Qué cambios en el aula le cuestan más adaptarse?',
      '¿Hay momentos del día en que el rendimiento baja de forma marcada?',
    ],
  },
  apoyosExistentes: {
    purpose:
      'Liste apoyos que ya recibe: organizativos, materiales, humanos, curriculares, en casa o en el centro (incluidos los que la familia brinda).',
    prompts: [
      '¿Qué ajustes o ayudas usa de forma habitual?',
      '¿Qué ha probado el centro o la familia y qué resultado tuvo?',
    ],
  },
}

export const INTERVIEW_DIMENSIONS_GUIDANCE: Record<
  keyof InterviewDimensionsContent,
  FieldGuidance
> = {
  cognoscitiva: {
    purpose:
      'En esta dimensión registre cómo piensa, comprende, recuerda, resuelve problemas y usa el lenguaje para aprender. No se trata de un diagnóstico clínico: describa comportamientos observables en el contexto escolar.',
    prompts: [
      '¿Cómo intenta resolver algo antes de pedir ayuda?',
      '¿Logra seguir un orden o una secuencia de pasos (instrucciones, juegos, tareas)?',
      '¿Comprende y respeta reglas o acuerdos del grupo?',
      '¿Qué estrategias usa para recordar (repetir, dibujar, preguntar)?',
    ],
  },
  socioafectiva: {
    purpose:
      'Describa emociones, motivación, autoestima en el aprendizaje, vínculos con pares y adultos, y cómo maneja el éxito o la frustración.',
    prompts: [
      '¿Cómo se siente cuando una tarea le resulta difícil?',
      '¿Busca participar o evita exponerse frente al grupo?',
      '¿Qué lo motiva a seguir intentando?',
    ],
  },
  psicomotriz: {
    purpose:
      'Anote coordinación, motricidad fina y gruesa, ritmo, cansancio o inquietud motora que influya en el trabajo escolar (escritura, deporte, desplazamiento, uso de materiales).',
    prompts: [
      '¿Cómo es su trazo, recorte o manipulación de objetos pequeños?',
      '¿Presenta inquietud motora que interrumpe la tarea o, al contrario, necesita movimiento para concentrarse?',
    ],
  },
}

export const INTERVIEW_NOTES_GUIDANCE: FieldGuidance = {
  purpose:
    'Espacio libre para matices de la conversación, acuerdos, datos que no encajan en otro bloque o citas textuales breves de la persona entrevistada.',
}

/** Ampliación opcional por código DIM.* (si existe, se muestra además del guideText del catálogo) */
export const OBSERVATION_DIMENSION_EXTRA: Record<string, FieldGuidance> = {
  'DIM.CLA.01': {
    purpose:
      'Observe si el lugar donde se ubica favorece o dificulta la participación: distancia a la pizarra, acceso a materiales, circulación, ruido entre mesas.',
    prompts: [
      '¿Puede ver y escuchar las explicaciones desde su puesto?',
      '¿El mobiliario le permite trabajar cómodo (escritura, lectura, grupo)?',
    ],
  },
  'DIM.CLA.04': {
    purpose:
      'Las transiciones son momentos de alto riesgo para muchos estudiantes. Registre si conoce la rutina y qué ocurre al cambiar de actividad.',
    prompts: [
      '¿Sabe qué hacer cuando termina una actividad y empieza otra?',
      '¿Necesita apoyo adicional en esos cambios?',
    ],
  },
}

export const OBSERVATION_GENERAL_NOTES_GUIDANCE: FieldGuidance = {
  purpose:
    'Registro anecdótico: hechos observables en el momento (qué hizo la persona estudiante, qué hizo la docente, reacción del grupo). Evite etiquetas o diagnósticos.',
  prompts: [
    '¿Qué ocurrió justo antes y después del episodio que describe?',
    '¿La conducta o el desempeño fue puntual o se repitió en la lección?',
  ],
}

/** Si no hay texto específico en OBSERVATION_DIMENSION_EXTRA, se arma una guía mínima */
export function observationGuidanceForDimension(
  code: string,
  label: string,
  catalogGuideText: string | null,
): FieldGuidance {
  const extra = OBSERVATION_DIMENSION_EXTRA[code]
  if (extra) return extra
  return {
    purpose:
      catalogGuideText?.trim() ||
      `Describa lo que observó en relación con «${label}». Priorice hechos concretos (qué pasó, cuándo, con qué materiales o personas).`,
    prompts: [
      '¿Qué vio usted en el aula que se relaciona con este aspecto?',
      '¿Este aspecto parece facilitar o dificultar la participación del estudiante?',
    ],
  }
}
