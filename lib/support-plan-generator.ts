/**
 * lib/support-plan-generator.ts
 *
 * Generador automático de borrador del Plan de Apoyo.
 * Fuente: Cuaderno Complementario N°4 — Problemas de Aprendizaje (MEP, 2023)
 *
 * Proceso:
 *  1. Carga la Valoración Integral (fortalezas, apoyos, barreras — texto libre).
 *  2. Carga los StudentAssessmentResult con resultado "no" o "withSupport".
 *  3. Agrupa por dificultad y área → deriva activeDifficulties + priorityProcesses.
 *  4. Aplica plantillas de estrategias por dificultad → borrador de columnas 2, 3 y 4.
 *
 * El endpoint devuelve el borrador sin guardarlo; el docente lo edita antes de confirmar.
 */

import { prisma } from '@/lib/prisma'

// ─────────────────────────────────────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────────────────────────────────────

export interface SupportPlanDraft {
  activeDifficulties: string[]
  priorityProcesses: string[]
  executiveSubprocesses: string[]
  strengths: string
  mediationStrategies: string
  homeStrategies: string
  specificStrategies: string
  /** Metadata para la UI — indica de dónde vino cada sección */
  _meta: {
    strengthsSource: 'assessment' | 'none'
    difficultiesFound: number
    failedObjectivesCount: number
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Plantillas de estrategias por dificultad
// Fuente: Cuaderno N°4 (PA, 2023) — Proceso 2 "Planificación del apoyo"
// ─────────────────────────────────────────────────────────────────────────────

interface StrategyTemplate {
  mediation: string[]
  home: string[]
}

const STRATEGY_TEMPLATES: Record<string, StrategyTemplate> = {
  DISLEXIA: {
    mediation: [
      'Proporcionar instrucciones verbales y escritas de forma simultánea.',
      'Ampliar el tiempo asignado para actividades de lectura y escritura.',
      'Usar soporte visual (texto + imagen) en el material didáctico.',
      'Reducir la extensión de los textos en evaluaciones sin modificar el nivel conceptual.',
      'Implementar lectura compartida o en voz alta como estrategia de andamiaje.',
      'Permitir el uso de audiolibros o texto en formato digital como apoyo de acceso.',
      'Ubicar al estudiante cerca del docente guía para facilitar la retroalimentación oportuna.',
    ],
    home: [
      'Realizar lectura compartida diaria por al menos 10 minutos en un ambiente tranquilo.',
      'Usar audiolibros o material en audio para reforzar la comprensión de textos.',
      'Evitar generar presión sobre la velocidad de lectura; valorar el esfuerzo y la comprensión.',
      'Reforzar actividades de rimas, canciones y juegos de sonidos del lenguaje.',
      'Mantener una rutina diaria de estudio en horario fijo y sin distractores.',
    ],
  },
  DISGRAFIA: {
    mediation: [
      'Permitir el uso de herramientas digitales (teclado, tableta) como alternativa a la escritura manual.',
      'Considerar tiempo adicional en actividades y evaluaciones escritas.',
      'Reducir la cantidad de copia y dictado; priorizar la producción con significado.',
      'Proporcionar materiales con líneas, cuadrículas o pautas para orientar la escritura.',
      'Aceptar presentaciones orales o en formato digital cuando la escritura dificulte la expresión del contenido.',
    ],
    home: [
      'Practicar actividades de grafomotricidad: modelar con arcilla, recortar, ensartar cuentas.',
      'Realizar ejercicios de escritura recreativa (cartas, listas) sin presión por calidad gráfica.',
      'Usar lápiz triangular, grip o herramienta ergonómica para mejorar el agarre.',
      'Fomentar el uso del teclado para tareas escritas extensas.',
    ],
  },
  DISORTOGRAFIA: {
    mediation: [
      'No penalizar la ortografía en evaluaciones de contenido; evaluar conocimiento conceptual por separado.',
      'Permitir el uso de procesador de texto con corrector ortográfico en tareas escritas.',
      'Proporcionar listas de palabras frecuentes de la unidad como material de apoyo.',
      'Corregir la ortografía de forma diferida (en revisión conjunta) para no interrumpir la producción escrita.',
      'Utilizar estrategias mnemotécnicas y visuales para las reglas ortográficas clave.',
    ],
    home: [
      'Realizar juegos de palabras y letras de forma lúdica (Scrabble, crucigramas sencillos).',
      'Repasar las reglas ortográficas trabajadas en el aula mediante actividades recreativas.',
      'Fomentar la lectura frecuente como exposición natural a la ortografía correcta.',
      'Practicar la autocorrección: revisar los textos propios antes de entregarlos.',
    ],
  },
  DISCALCULIA: {
    mediation: [
      'Usar materiales concretos y manipulativos (fichas, bloques, ábacos) en la introducción de conceptos.',
      'Permitir el uso de tablas de referencia, fórmulas y calculadora en evaluaciones.',
      'Representar los problemas matemáticos de forma visual y concreta antes de introducir lo simbólico.',
      'Proporcionar tiempo adicional y reducir la cantidad de ítems sin reducir la variedad conceptual.',
      'Descomponer los problemas en pasos secuenciados con instrucciones explícitas.',
    ],
    home: [
      'Practicar el conteo y las operaciones básicas con objetos cotidianos (monedas, objetos de cocina).',
      'Realizar juegos matemáticos con dados, cartas o dominó para afianzar el sentido numérico.',
      'Incorporar la matemática en actividades del hogar: medir ingredientes, contar cambio, calcular tiempo.',
      'Repasar las tablas de multiplicar con canciones, ritmos o juegos visuales.',
    ],
  },
  DISPRAXIA: {
    mediation: [
      'Descomponer las tareas en pasos cortos, secuenciados y explícitos con apoyo visual.',
      'Usar listas de verificación (checklists) para que el estudiante pueda monitorear su propio proceso.',
      'Mantener un ambiente de trabajo organizado, predecible y con rutinas claras.',
      'Reducir la cantidad de escritura manual; priorizar el contenido sobre la forma.',
      'Proporcionar modelos concretos de las actividades antes de solicitarlas de forma independiente.',
    ],
    home: [
      'Realizar actividades de coordinación motora fina: moldear, ensartar, recortar, armar rompecabezas.',
      'Establecer rutinas predecibles en casa (mismas actividades en el mismo orden).',
      'Practicar juegos de secuenciación: recetas, juegos de mesa con pasos, construcciones.',
      'Fomentar actividades físicas que promuevan el equilibrio y la coordinación (natación, ciclismo).',
    ],
  },
}

// Estrategias genéricas cuando no hay plantilla para la dificultad
const GENERIC_STRATEGY: StrategyTemplate = {
  mediation: [
    'Proporcionar instrucciones claras y secuenciadas con soporte visual.',
    'Ampliar el tiempo disponible para las actividades según las necesidades individuales.',
    'Establecer rutinas y señales predecibles en el aula para facilitar la autorregulación.',
    'Ofrecer retroalimentación oportuna y específica durante el proceso de aprendizaje.',
    'Reducir las barreras de acceso al currículo mediante ajustes en formato, extensión y presentación.',
  ],
  home: [
    'Mantener una rutina diaria de estudio en horario fijo y ambiente sin distractores.',
    'Repasar de forma breve (10-15 min) el contenido trabajado en el aula durante la semana.',
    'Comunicarse regularmente con el docente de apoyo para coordinar actividades de refuerzo.',
    'Valorar y reconocer los esfuerzos y avances del estudiante para fortalecer la motivación.',
  ],
}

// Plantillas de estrategias específicas por área (Column 4)
// Clave: difficulty.toUpperCase() + "___" + área normalizada
// Si no hay match específico, se genera un ítem genérico por área

function specificStrategyForArea(difficulty: string, areaLabel: string): string {
  const key = `${difficulty.toUpperCase()}___${areaLabel.toUpperCase()}`

  const specific: Record<string, string> = {
    // DISLEXIA
    'DISLEXIA___CONCIENCIA FONOLÓGICA':
      'Trabajo sistemático en identificación, segmentación y manipulación de fonemas (adición, sustitución, elisión).',
    'DISLEXIA___DECODIFICACIÓN':
      'Ejercicios progresivos de decodificación y recodificación con patrones silábicos y palabras de alta frecuencia.',
    'DISLEXIA___FLUIDEZ LECTORA':
      'Actividades de lectura repetida y asistida para aumentar la velocidad y la automatización.',
    'DISLEXIA___COMPRENSIÓN LECTORA':
      'Estrategias de comprensión lectora: predicción, identificación de ideas principales, mapas de texto.',
    // DISGRAFÍA
    'DISGRAFIA___CALIDAD DEL TRAZO Y FORMACIÓN DE LETRAS':
      'Práctica guiada de letras problemáticas con retroalimentación inmediata y ejercicios de trazado.',
    'DISGRAFIA___PRESIÓN Y AGARRE':
      'Actividades de control de la presión del lápiz y fortalecimiento del agarre con materiales ergonómicos.',
    'DISGRAFIA___FLUIDEZ Y AUTOMATIZACIÓN':
      'Ejercicios para reducir la carga cognitiva en la escritura; automatización de patrones gráficos frecuentes.',
    'DISGRAFIA___ORGANIZACIÓN ESPACIAL':
      'Trabajo en organización espacial del texto: márgenes, interlineado, distribución en la página.',
    // DISORTOGRAFÍA
    'DISORTOGRAFIA___REGLAS ORTOGRÁFICAS':
      'Análisis sistemático de las reglas ortográficas con mayor impacto; generalización a través de la escritura espontánea.',
    'DISORTOGRAFIA___MEMORIA VISUAL ORTOGRÁFICA':
      'Trabajo en la imagen ortográfica de palabras frecuentes mediante técnicas visuales y kinestésicas.',
    'DISORTOGRAFIA___AUTOCORRECCIÓN':
      'Entrenamiento en estrategias de autocorrección y uso de herramientas de verificación ortográfica.',
    // DISCALCULIA
    'DISCALCULIA___SENTIDO NUMÉRICO':
      'Trabajo en correspondencia uno a uno, conteo significativo y comprensión del valor posicional con materiales concretos.',
    'DISCALCULIA___OPERACIONES BÁSICAS':
      'Consolidación de las operaciones aritméticas básicas mediante representación concreta → pictórica → simbólica.',
    'DISCALCULIA___RESOLUCIÓN DE PROBLEMAS':
      'Estrategias de comprensión de problemas: representación visual, identificación de datos relevantes, verificación del resultado.',
    // DISPRAXIA
    'DISPRAXIA___PLANIFICACIÓN MOTORA':
      'Actividades de secuenciación motora progresivas; práctica repetida de habilidades funcionales en contexto real.',
    'DISPRAXIA___COORDINACIÓN VISOMOTRIZ':
      'Ejercicios de coordinación ojo-mano: seguimiento visual, trazado, recorte controlado, ensamblaje.',
    'DISPRAXIA___ORGANIZACIÓN Y PLANIFICACIÓN':
      'Trabajo en habilidades de organización: uso de agenda, lista de materiales, planificación de tareas en pasos.',
  }

  return (
    specific[key] ||
    `Trabajo personalizado en el área de "${areaLabel}" según los objetivos no logrados identificados en la herramienta de valoración.`
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────────────────────────────────────

export async function generateSupportPlanDraft(
  studentId: string
): Promise<SupportPlanDraft> {
  // 1. Cargar Valoración Integral
  const assessment = await prisma.integralAssessment.findUnique({
    where: { studentId },
    select: {
      strengths: true,
      barriers: true,
      requiredSupports: true,
    },
  })

  // 2. Cargar resultados de la herramienta con resultado no/withSupport
  const failedResults = await prisma.studentAssessmentResult.findMany({
    where: {
      studentId,
      result: { in: ['no', 'withSupport'] },
    },
    include: {
      objective: {
        select: {
          difficulty: true,
          difficultyLabel: true,
          areaCode: true,
          areaLabel: true,
          level: true,
          levelLabel: true,
          description: true,
        },
      },
    },
    orderBy: [{ objective: { difficulty: 'asc' } }, { objective: { areaCode: 'asc' } }],
  })

  // 3. Agrupar por dificultad → área
  type AreaMap = Map<string, { label: string; objectives: string[] }>
  const byDifficulty = new Map<string, { label: string; areas: AreaMap }>()

  for (const r of failedResults) {
    const diff = r.objective.difficulty
    const diffLabel = r.objective.difficultyLabel
    const area = r.objective.areaCode
    const areaLabel = r.objective.areaLabel

    if (!byDifficulty.has(diff)) {
      byDifficulty.set(diff, { label: diffLabel, areas: new Map() })
    }
    const diffEntry = byDifficulty.get(diff)!

    if (!diffEntry.areas.has(area)) {
      diffEntry.areas.set(area, { label: areaLabel, objectives: [] })
    }
    diffEntry.areas.get(area)!.objectives.push(r.objective.description)
  }

  // 4. Derivar activeDifficulties y priorityProcesses
  const activeDifficulties: string[] = []
  const priorityProcesses: string[] = []

  for (const [, diffEntry] of byDifficulty) {
    activeDifficulties.push(diffEntry.label)
    for (const [, areaEntry] of diffEntry.areas) {
      if (!priorityProcesses.includes(areaEntry.label)) {
        priorityProcesses.push(areaEntry.label)
      }
    }
  }

  // 5. Columna 1: Fortalezas (desde la Valoración Integral)
  const strengthsText = assessment?.strengths?.trim() || ''
  const strengthsSource: 'assessment' | 'none' = strengthsText ? 'assessment' : 'none'

  // 6. Columna 2: Estrategias de mediación
  const mediationLines: string[] = []

  if (byDifficulty.size > 0) {
    mediationLines.push('Se sugieren las siguientes estrategias de mediación pedagógica en el aula:\n')

    for (const [diff, diffEntry] of byDifficulty) {
      const areaNames = Array.from(diffEntry.areas.values())
        .map((a) => a.label)
        .join(', ')
      const template = STRATEGY_TEMPLATES[diff] ?? GENERIC_STRATEGY
      mediationLines.push(`▸ Para ${diffEntry.label} (áreas: ${areaNames}):`)
      for (const s of template.mediation) {
        mediationLines.push(`  • ${s}`)
      }
      mediationLines.push('')
    }
  } else {
    mediationLines.push(
      'No se encontraron resultados de la herramienta de valoración. ' +
        'Complete la evaluación con la herramienta de objetivos para generar sugerencias específicas.'
    )
  }

  // 7. Columna 3: Estrategias para la casa
  const homeLines: string[] = []

  if (byDifficulty.size > 0) {
    homeLines.push('Se sugieren las siguientes estrategias de apoyo en el hogar:\n')

    for (const [diff, diffEntry] of byDifficulty) {
      const template = STRATEGY_TEMPLATES[diff] ?? GENERIC_STRATEGY
      homeLines.push(`▸ Para ${diffEntry.label}:`)
      for (const s of template.home) {
        homeLines.push(`  • ${s}`)
      }
      homeLines.push('')
    }

    homeLines.push(
      'Nota: Compartir estas estrategias con la familia en reunión colaborativa. ' +
        'El plan lo lidera el docente de apoyo educativo en PA (Cuaderno N°4, pág. 58).'
    )
  } else {
    homeLines.push(
      'Completar la herramienta de valoración para generar sugerencias de apoyo en el hogar.'
    )
  }

  // 8. Columna 4: Estrategias específicas del docente de apoyo
  const specificLines: string[] = []

  if (byDifficulty.size > 0) {
    specificLines.push(
      'Áreas prioritarias para el trabajo personalizado con la docente de apoyo educativo:\n'
    )

    for (const [diff, diffEntry] of byDifficulty) {
      specificLines.push(`▸ ${diffEntry.label.toUpperCase()} — Áreas con objetivos por desarrollar:`)
      for (const [, areaEntry] of diffEntry.areas) {
        const strategy = specificStrategyForArea(diff, areaEntry.label)
        specificLines.push(`  • ${areaEntry.label}: ${strategy}`)
      }
      specificLines.push('')
    }
  } else {
    specificLines.push(
      'Completar la herramienta de valoración para identificar áreas específicas de trabajo personalizado.'
    )
  }

  return {
    activeDifficulties,
    priorityProcesses,
    executiveSubprocesses: [],
    strengths: strengthsText,
    mediationStrategies: mediationLines.join('\n'),
    homeStrategies: homeLines.join('\n'),
    specificStrategies: specificLines.join('\n'),
    _meta: {
      strengthsSource,
      difficultiesFound: byDifficulty.size,
      failedObjectivesCount: failedResults.length,
    },
  }
}
