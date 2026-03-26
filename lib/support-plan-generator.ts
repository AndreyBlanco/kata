/**
 * lib/support-plan-generator.ts
 *
 * Generador automático de borrador del Plan de Apoyo.
 * Fuente: Cuaderno Complementario N°4 — Problemas de Aprendizaje (MEP, 2023)
 *
 * Proceso:
 *  1. Carga la Valoración Integral: códigos de fortalezas, barreras y apoyos.
 *  2. Resuelve los códigos a etiquetas legibles desde la BD.
 *  3. Carga los StudentAssessmentResult con resultado "no" o "withSupport".
 *  4. Agrupa por dificultad → área → deriva activeDifficulties, priorityProcesses
 *     y executiveSubprocesses usando el mapeo oficial de áreas a procesos MEP.
 *  5. Aplica plantillas de estrategias por dificultad → borrador de columnas 2-4.
 *  6. Enriquece columnas 2 y 4 con contexto de barreras y apoyos de la valoración.
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
  _meta: {
    strengthsSource: 'codes' | 'text' | 'both' | 'none'
    difficultiesFound: number
    failedObjectivesCount: number
    barrierCodesUsed: number
    supportCodesUsed: number
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapeo: etiqueta de área diagnóstica → procesos oficiales MEP
// Procesos: Percepción | Atención | Emoción | Motivación | Memoria | Funciones ejecutivas
// ─────────────────────────────────────────────────────────────────────────────

const AREA_TO_PROCESSES: Record<string, string[]> = {
  // DISLEXIA
  'CONCIENCIA FONOLÓGICA':                      ['Percepción', 'Memoria'],
  'DECODIFICACIÓN':                             ['Percepción', 'Memoria'],
  'FLUIDEZ LECTORA':                            ['Atención', 'Memoria'],
  'COMPRENSIÓN LECTORA':                        ['Memoria', 'Funciones ejecutivas'],
  'VOCABULARIO Y LENGUAJE':                     ['Memoria'],
  // DISGRAFÍA
  'CALIDAD DEL TRAZO Y FORMACIÓN DE LETRAS':    ['Percepción'],
  'PRESIÓN Y AGARRE':                           ['Percepción'],
  'FLUIDEZ Y AUTOMATIZACIÓN':                   ['Memoria', 'Funciones ejecutivas'],
  'ORGANIZACIÓN ESPACIAL':                      ['Percepción', 'Funciones ejecutivas'],
  'VELOCIDAD DE ESCRITURA':                     ['Atención'],
  // DISORTOGRAFÍA
  'REGLAS ORTOGRÁFICAS':                        ['Memoria'],
  'CONCIENCIA FONÉMICA':                        ['Percepción', 'Memoria'],
  'MEMORIA VISUAL ORTOGRÁFICA':                 ['Memoria', 'Percepción'],
  'AUTOCORRECCIÓN':                             ['Funciones ejecutivas'],
  // DISCALCULIA
  'SENTIDO NUMÉRICO':                           ['Percepción', 'Memoria'],
  'OPERACIONES BÁSICAS':                        ['Memoria'],
  'CONCEPTOS MATEMÁTICOS':                      ['Memoria'],
  'RESOLUCIÓN DE PROBLEMAS':                    ['Funciones ejecutivas', 'Atención'],
  'RAZONAMIENTO LÓGICO':                        ['Funciones ejecutivas'],
  // DISPRAXIA
  'PLANIFICACIÓN MOTORA':                       ['Funciones ejecutivas'],
  'COORDINACIÓN VISOMOTRIZ':                    ['Percepción'],
  'ORGANIZACIÓN Y PLANIFICACIÓN':               ['Funciones ejecutivas'],
  'HABILIDADES DE LA VIDA DIARIA':              ['Funciones ejecutivas'],
  // TDA
  'INATENCIÓN SOSTENIDA Y FLUCTUANTE':          ['Atención'],
  'IMPULSIVIDAD':                               ['Funciones ejecutivas', 'Atención'],
  'HIPERACTIVIDAD MOTORA':                      ['Atención', 'Emoción'],
  'FUNCIONES EJECUTIVAS':                       ['Funciones ejecutivas'],
  'RENDIMIENTO ACADÉMICO':                      ['Atención', 'Motivación'],
  'REGULACIÓN EMOCIONAL':                       ['Emoción', 'Funciones ejecutivas'],
  'INDICADORES CONDUCTUALES Y EMOCIONALES':     ['Emoción'],
  // APRENDIZAJE LENTO
  'VELOCIDAD DE PROCESAMIENTO':                 ['Percepción', 'Atención'],
  'MEMORIA DE TRABAJO':                         ['Memoria'],
  'COMPRENSIÓN VERBAL':                         ['Memoria'],
  'RAZONAMIENTO':                               ['Funciones ejecutivas'],
  'HABILIDADES ACADÉMICAS':                     ['Motivación', 'Memoria'],
  'DESARROLLO DEL LENGUAJE Y VOCABULARIO':      ['Memoria', 'Percepción'],
  // TANV
  'HABILIDADES VISOESPACIALES Y VISOCONSTRUCTIVAS': ['Percepción'],
  'HABILIDADES MOTORAS':                        ['Percepción'],
  'FUNCIONES EJECUTIVAS Y PLANIFICACIÓN':       ['Funciones ejecutivas'],
  'PROCESAMIENTO TÁCTIL Y SENSORIAL':           ['Percepción'],
  'HABILIDADES SOCIALES Y COMUNICACIÓN NO VERBAL': ['Emoción', 'Motivación'],
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapeo: etiqueta de área → subprocesos de Funciones Ejecutivas
// Subprocesos: Planificación | Organización | Flexibilidad | Autorregulación | Automonitoreo
// ─────────────────────────────────────────────────────────────────────────────

const AREA_TO_EF_SUBPROCESSES: Record<string, string[]> = {
  'COMPRENSIÓN LECTORA':                 ['Planificación'],
  'FLUIDEZ Y AUTOMATIZACIÓN':            ['Planificación', 'Automonitoreo'],
  'ORGANIZACIÓN ESPACIAL':               ['Organización'],
  'AUTOCORRECCIÓN':                      ['Automonitoreo', 'Autorregulación'],
  'RESOLUCIÓN DE PROBLEMAS':             ['Planificación', 'Organización'],
  'RAZONAMIENTO LÓGICO':                 ['Planificación'],
  'PLANIFICACIÓN MOTORA':                ['Planificación'],
  'ORGANIZACIÓN Y PLANIFICACIÓN':        ['Planificación', 'Organización'],
  'HABILIDADES DE LA VIDA DIARIA':       ['Planificación', 'Organización'],
  'IMPULSIVIDAD':                        ['Autorregulación', 'Automonitoreo'],
  'FUNCIONES EJECUTIVAS':                ['Planificación', 'Organización', 'Flexibilidad', 'Autorregulación', 'Automonitoreo'],
  'REGULACIÓN EMOCIONAL':                ['Autorregulación', 'Automonitoreo'],
  'RAZONAMIENTO':                        ['Planificación'],
  'HABILIDADES ACADÉMICAS':              ['Planificación', 'Organización'],
  'FUNCIONES EJECUTIVAS Y PLANIFICACIÓN':['Planificación', 'Organización', 'Flexibilidad'],
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapeo: difficultyLabel de la BD → valor exacto de DIFFICULTIES_CATALOG
// ─────────────────────────────────────────────────────────────────────────────

const DIFFICULTY_LABEL_TO_CATALOG: Record<string, string> = {
  'Dislexia':                   'Dislexia',
  'Disgrafía':                  'Disgrafía',
  'Disortografía':              'Disortografía',
  'Discalculia':                'Discalculia',
  'Dispraxia':                  'Dispraxia',
  'TDA':                        'TDA',
  'Aprendizaje lento':          'Aprendizaje lento',
  'Aprendizaje no verbal (TANV)': 'Aprendizaje no verbal',
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapeo: categoría de BarrierItem → estrategia de mediación contextual
// ─────────────────────────────────────────────────────────────────────────────

const BARRIER_CATEGORY_TO_MEDIATION: Record<string, string> = {
  contexto_aula:
    'Revisar la organización del espacio físico del aula: reducir distractores, mejorar acceso a materiales y ubicar al estudiante en posición estratégica.',
  metodologia:
    'Diversificar las estrategias metodológicas: materiales manipulativos, aprendizaje cooperativo, proyectos prácticos y representaciones multimodales.',
  evaluacion:
    'Ajustar los procedimientos de evaluación: formatos accesibles, tiempo adicional y alternativas de demostración del aprendizaje (oral, digital, práctica).',
  curriculo:
    'Realizar adecuaciones curriculares de acceso que mantengan los objetivos del programa y adapten la complejidad, el formato o los materiales de trabajo.',
  actitudinal:
    'Fomentar un clima de aula inclusivo y respetuoso de las diferencias individuales; trabajar con el grupo la valoración de la diversidad.',
  organizacion:
    'Establecer rutinas predecibles con señales visuales y verbales para facilitar las transiciones entre actividades y la autorregulación.',
  contexto_institucional:
    'Coordinar con el equipo institucional (dirección, orientación, psicología) las medidas de apoyo sistémico que requiere el estudiante.',
  contexto_familiar:
    'Establecer canales de comunicación regulares con la familia para coordinar estrategias y compartir avances del proceso.',
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapeo: categoría de SupportItem → estrategia específica del docente de apoyo
// ─────────────────────────────────────────────────────────────────────────────

const SUPPORT_CATEGORY_TO_SPECIFIC: Record<string, string> = {
  personal:
    'Coordinar sesiones individuales o en pequeño grupo con la docente de apoyo educativo según la frecuencia y modalidad establecidas en el plan.',
  curricular:
    'Desarrollar adecuaciones curriculares de acceso: ajustar la presentación, el formato y los materiales, manteniendo los objetivos del programa.',
  metodologico:
    'Diseñar e implementar actividades metodológicas diferenciadas que respondan al estilo y ritmo de aprendizaje del estudiante.',
  evaluativo:
    'Establecer procedimientos de evaluación diferenciados: tiempo adicional, formatos alternativos, evaluación oral o demostrativa.',
  organizativo:
    'Implementar apoyos organizativos: agenda visual, lista de materiales, horario estructurado y rutinas con señales visuales claras.',
  material_tecnologico:
    'Incorporar materiales tecnológicos de apoyo: software de lectura/escritura, aplicaciones educativas específicas o dispositivos de asistencia.',
}

// ─────────────────────────────────────────────────────────────────────────────
// Plantillas de estrategias por dificultad (Cuaderno N°4, 2023)
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
  TDA: {
    mediation: [
      'Fragmentar las actividades en tareas cortas con metas claras y retroalimentación frecuente.',
      'Usar señales visuales y auditivas como recordatorios de tiempo y transición entre actividades.',
      'Ubicar al estudiante lejos de distractores (ventana, puerta) y cerca de la pizarra o el docente.',
      'Alternar actividades de alta y baja demanda de atención para mantener el nivel de alerta.',
      'Proporcionar descansos activos breves (1-2 minutos) entre actividades prolongadas.',
      'Reducir la cantidad de ítems por página en materiales escritos para disminuir la sobrecarga visual.',
    ],
    home: [
      'Establecer una rutina de estudio con horario fijo, corta duración (15-20 min) y descansos planificados.',
      'Eliminar distractores durante las tareas: apagar pantallas, usar un espacio delimitado para trabajar.',
      'Usar listas de tareas visuales y verificar el avance con el estudiante.',
      'Incorporar movimiento o juego activo antes del tiempo de tarea para canalizar la energía.',
      'Valorar y reconocer los esfuerzos y logros del estudiante para reforzar la motivación.',
    ],
  },
  APZ_LENTO: {
    mediation: [
      'Presentar la información de forma gradual, verificando la comprensión antes de avanzar.',
      'Usar representaciones concretas y visuales antes de llegar al nivel abstracto o simbólico.',
      'Proporcionar tiempo adicional para todas las actividades y evaluaciones.',
      'Reducir la cantidad de ítems sin reducir la variedad de aprendizajes evaluados.',
      'Implementar aprendizaje cooperativo en parejas o grupos pequeños con roles definidos.',
      'Usar vocabulario accesible y verificar constantemente la comprensión de las consignas.',
    ],
    home: [
      'Repasar brevemente (10-15 minutos) el contenido de la semana usando material concreto y visual.',
      'Leer en voz alta junto al estudiante y conversar sobre el contenido para afianzar la comprensión.',
      'Realizar juegos educativos sencillos que refuercen conceptos académicos de forma lúdica.',
      'Mantener expectativas realistas y celebrar cada avance, por pequeño que sea.',
      'Comunicarse regularmente con el docente de apoyo para coordinar las actividades de refuerzo.',
    ],
  },
  TANV: {
    mediation: [
      'Privilegiar el aprendizaje verbal y auditivo frente a las representaciones espaciales o visuales complejas.',
      'Proporcionar instrucciones verbales detalladas, paso a paso, para tareas que impliquen organización espacial.',
      'Usar mapas de texto, esquemas y organizadores gráficos simples con etiquetas verbales explícitas.',
      'Anticipar los cambios de actividad y las transiciones mediante avisos verbales claros.',
      'Facilitar el aprendizaje social explícito de normas y señales no verbales en el contexto de aula.',
    ],
    home: [
      'Apoyar la organización diaria con listas verbales y rutinas claras, evitando la dependencia de mapas o diagramas complejos.',
      'Leer y conversar sobre situaciones sociales cotidianas para desarrollar la comprensión de señales no verbales.',
      'Practicar habilidades de vida diaria con instrucciones verbales secuenciadas.',
      'Fomentar actividades de juego estructurado con reglas explícitas para desarrollar habilidades sociales.',
    ],
  },
}

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

// Estrategias específicas por área (Columna 4)
function specificStrategyForArea(difficulty: string, areaLabel: string): string {
  const key = `${difficulty.toUpperCase()}___${areaLabel.toUpperCase()}`

  const specific: Record<string, string> = {
    // DISLEXIA
    'DISLEXIA___CONCIENCIA FONOLÓGICA':
      'Trabajo sistemático en identificación, segmentación y manipulación de fonemas (adición, sustitución, elisión) con actividades orales y lúdicas.',
    'DISLEXIA___DECODIFICACIÓN':
      'Ejercicios progresivos de decodificación y recodificación con patrones silábicos y palabras de alta frecuencia; práctica repetida con retroalimentación.',
    'DISLEXIA___FLUIDEZ LECTORA':
      'Actividades de lectura repetida y asistida para aumentar la velocidad, la precisión y la automatización del reconocimiento de palabras.',
    'DISLEXIA___COMPRENSIÓN LECTORA':
      'Estrategias de comprensión lectora: predicción, identificación de ideas principales, mapas de texto, preguntas antes y después de la lectura.',
    'DISLEXIA___VOCABULARIO Y LENGUAJE':
      'Trabajo explícito en vocabulario: mapas semánticos, contexto de uso, juegos de significados y definiciones en situaciones comunicativas reales.',
    // DISGRAFÍA
    'DISGRAFIA___CALIDAD DEL TRAZO Y FORMACIÓN DE LETRAS':
      'Práctica guiada de letras problemáticas con retroalimentación inmediata; ejercicios de trazado sobre pautas con distintos tipos de soporte (arenal, tinta, digital).',
    'DISGRAFIA___PRESIÓN Y AGARRE':
      'Actividades de control de la presión del lápiz y fortalecimiento del agarre con materiales ergonómicos; ejercicios de relajación de mano y muñeca.',
    'DISGRAFIA___FLUIDEZ Y AUTOMATIZACIÓN':
      'Ejercicios para reducir la carga cognitiva de la escritura; automatización de patrones gráficos frecuentes mediante práctica repetida y retroalimentación inmediata.',
    'DISGRAFIA___ORGANIZACIÓN ESPACIAL':
      'Trabajo en organización espacial del texto: márgenes, interlineado, distribución en la página; uso de guías visuales en el papel.',
    'DISGRAFIA___VELOCIDAD DE ESCRITURA':
      'Actividades cronometradas de copia y dictado para mejorar la velocidad sin perder legibilidad; registro de progreso para motivar al estudiante.',
    // DISORTOGRAFÍA
    'DISORTOGRAFIA___REGLAS ORTOGRÁFICAS':
      'Análisis sistemático de las reglas ortográficas de mayor impacto; generalización a través de la escritura espontánea con revisión colaborativa.',
    'DISORTOGRAFIA___CONCIENCIA FONÉMICA':
      'Trabajo en la correspondencia fonema-grafema mediante juegos de asociación, discriminación auditiva y análisis de palabras escritas.',
    'DISORTOGRAFIA___MEMORIA VISUAL ORTOGRÁFICA':
      'Trabajo en la imagen ortográfica de palabras frecuentes mediante técnicas visuales y kinestésicas: visualización, trazado en el aire, deletreo con ritmo.',
    'DISORTOGRAFIA___AUTOCORRECCIÓN':
      'Entrenamiento en estrategias de autocorrección y uso de herramientas de verificación ortográfica; revisión diferida de textos propios.',
    // DISCALCULIA
    'DISCALCULIA___SENTIDO NUMÉRICO':
      'Trabajo en correspondencia uno a uno, conteo significativo y comprensión del valor posicional con materiales concretos (bloques, fichas, ábacos).',
    'DISCALCULIA___OPERACIONES BÁSICAS':
      'Consolidación de operaciones aritméticas básicas mediante la secuencia concreto → pictórico → simbólico; uso de tablas de apoyo y práctica con contexto significativo.',
    'DISCALCULIA___CONCEPTOS MATEMÁTICOS':
      'Trabajo en la comprensión de conceptos matemáticos clave mediante experiencias manipulativas, juegos y situaciones del contexto cotidiano del estudiante.',
    'DISCALCULIA___RESOLUCIÓN DE PROBLEMAS':
      'Estrategias de comprensión de problemas: representación visual, identificación de datos relevantes, selección de operaciones y verificación del resultado.',
    'DISCALCULIA___RAZONAMIENTO LÓGICO':
      'Actividades de razonamiento con patrones, clasificación, seriación y problemas de lógica informal que desarrollen el pensamiento matemático.',
    // DISPRAXIA
    'DISPRAXIA___PLANIFICACIÓN MOTORA':
      'Actividades de secuenciación motora progresivas; práctica repetida de habilidades funcionales en contexto real con apoyo de instrucciones verbales.',
    'DISPRAXIA___COORDINACIÓN VISOMOTRIZ':
      'Ejercicios de coordinación ojo-mano: seguimiento visual, trazado, recorte controlado, ensamblaje, actividades de clasificación motora.',
    'DISPRAXIA___ORGANIZACIÓN Y PLANIFICACIÓN':
      'Trabajo en habilidades de organización: uso de agenda, lista de materiales, planificación de tareas en pasos con supervisión decreciente.',
    'DISPRAXIA___HABILIDADES DE LA VIDA DIARIA':
      'Práctica de rutinas funcionales (orden de materiales, preparación del espacio de trabajo) con apoyo de listas visuales y secuencias de pasos.',
    // TDA
    'TDA___INATENCIÓN SOSTENIDA Y FLUCTUANTE':
      'Implementar técnicas de atención sostenida: temporizadores visuales, segmentación de tareas, señales de retorno y verificación de la tarea.',
    'TDA___IMPULSIVIDAD':
      'Trabajo en autocontrol y autorregulación: técnicas de pausa, relajación activa, reflexión antes de responder y registro de comportamiento.',
    'TDA___HIPERACTIVIDAD MOTORA':
      'Incorporar pausas de movimiento planificadas; ofrecer alternativas de respuesta motora (manualidades, dictado oral, presentación de pie).',
    'TDA___FUNCIONES EJECUTIVAS':
      'Trabajo explícito en planificación, organización, flexibilidad y automonitoreo mediante uso de agendas, checklists y retroalimentación estructurada.',
    'TDA___RENDIMIENTO ACADÉMICO':
      'Diseñar actividades motivadoras con metas a corto plazo, retroalimentación inmediata y celebración de logros para sostener el esfuerzo académico.',
    'TDA___REGULACIÓN EMOCIONAL':
      'Enseñar estrategias de identificación y regulación emocional; crear un espacio seguro en el aula para expresar y gestionar las emociones.',
    'TDA___INDICADORES CONDUCTUALES Y EMOCIONALES':
      'Registrar los indicadores conductuales de forma sistemática; coordinar con orientación y familia para intervención conjunta y coherente.',
    // APRENDIZAJE LENTO
    'APZ_LENTO___VELOCIDAD DE PROCESAMIENTO':
      'Proporcionar tiempo adicional en todas las actividades; usar formatos de respuesta simplificados que no penalicen la velocidad de producción.',
    'APZ_LENTO___MEMORIA DE TRABAJO':
      'Trabajar con chunks de información más pequeños; usar organizadores gráficos, listas de verificación y recordatorios visuales para reducir la carga en la memoria de trabajo.',
    'APZ_LENTO___COMPRENSIÓN VERBAL':
      'Usar vocabulario accesible, verificar constantemente la comprensión, reformular instrucciones de múltiples formas (verbal, visual, demostrativa).',
    'APZ_LENTO___RAZONAMIENTO':
      'Facilitar el razonamiento mediante andamiaje verbal: hacer preguntas guía, modelar el proceso de pensamiento en voz alta y proporcionar ejemplos concretos.',
    'APZ_LENTO___HABILIDADES ACADÉMICAS':
      'Adaptar los materiales académicos al nivel funcional del estudiante; establecer metas a corto plazo y registrar el progreso para mantener la motivación.',
    'APZ_LENTO___DESARROLLO DEL LENGUAJE Y VOCABULARIO':
      'Trabajo explícito en vocabulario y comprensión oral; usar contextos significativos, experiencias directas y juegos de lenguaje para ampliar el repertorio léxico.',
    // TANV
    'TANV___HABILIDADES VISOESPACIALES Y VISOCONSTRUCTIVAS':
      'Compensar con estrategias verbales explícitas; enseñar procedimientos paso a paso para tareas que requieran organización espacial.',
    'TANV___HABILIDADES MOTORAS':
      'Trabajar coordinación motora con actividades de grafomotricidad, coordinación óculo-manual y actividades funcionales con instrucciones verbales detalladas.',
    'TANV___FUNCIONES EJECUTIVAS Y PLANIFICACIÓN':
      'Desarrollar habilidades de planificación y organización mediante checklists verbales, rutinas estables y estrategias de automonitoreo.',
    'TANV___PROCESAMIENTO TÁCTIL Y SENSORIAL':
      'Coordinar con familia y equipo de apoyo la identificación de estímulos sensoriales que afectan el desempeño; ajustar el entorno según sea necesario.',
    'TANV___HABILIDADES SOCIALES Y COMUNICACIÓN NO VERBAL':
      'Enseñar explícitamente las señales sociales y no verbales relevantes en el contexto escolar; practicar con situaciones simuladas y retroalimentación directa.',
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

  // 1. Cargar Valoración Integral con todos los campos relevantes
  const assessment = await prisma.integralAssessment.findUnique({
    where: { studentId },
    select: {
      strengths: true,
      strengthCodes: true,
      barriers: true,
      barrierCodes: true,
      requiredSupports: true,
      supportCodes: true,
      agreements: true,
    },
  })

  // 2. Resolver códigos de fortalezas, barreras y apoyos desde la BD
  const [strengthItems, barrierItems, supportItems] = await Promise.all([
    assessment?.strengthCodes?.length
      ? prisma.strengthItem.findMany({
          where: { code: { in: assessment.strengthCodes }, active: true },
          select: { code: true, label: true, category: true },
          orderBy: { sortOrder: 'asc' },
        })
      : Promise.resolve([]),
    assessment?.barrierCodes?.length
      ? prisma.barrierItem.findMany({
          where: { code: { in: assessment.barrierCodes }, active: true },
          select: { code: true, label: true, category: true },
          orderBy: { sortOrder: 'asc' },
        })
      : Promise.resolve([]),
    assessment?.supportCodes?.length
      ? prisma.supportItem.findMany({
          where: { code: { in: assessment.supportCodes }, active: true },
          select: { code: true, label: true, category: true },
          orderBy: { sortOrder: 'asc' },
        })
      : Promise.resolve([]),
  ])

  // 3. Cargar resultados de herramienta con resultado "no" o "withSupport"
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
    orderBy: [
      { objective: { difficulty: 'asc' } },
      { objective: { areaCode: 'asc' } },
    ],
  })

  // 4. Agrupar por dificultad → área
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

  // 5. Derivar activeDifficulties, priorityProcesses y executiveSubprocesses
  const activeDifficulties: string[] = []
  const priorityProcessesSet = new Set<string>()
  const executiveSubprocessesSet = new Set<string>()

  for (const [, diffEntry] of byDifficulty) {
    const catalogLabel = DIFFICULTY_LABEL_TO_CATALOG[diffEntry.label] ?? diffEntry.label
    if (!activeDifficulties.includes(catalogLabel)) {
      activeDifficulties.push(catalogLabel)
    }

    for (const [, areaEntry] of diffEntry.areas) {
      const areaUpper = areaEntry.label.toUpperCase()
      const processes = AREA_TO_PROCESSES[areaUpper] ?? []
      for (const p of processes) priorityProcessesSet.add(p)

      const efSubs = AREA_TO_EF_SUBPROCESSES[areaUpper] ?? []
      for (const s of efSubs) executiveSubprocessesSet.add(s)
    }
  }

  // 6. Columna 1: Fortalezas — desde códigos + texto libre
  const strengthLabels = strengthItems.map((s) => `• ${s.label}`)
  const strengthFreeText = assessment?.strengths?.trim() || ''

  let strengthsText = ''
  let strengthsSource: 'codes' | 'text' | 'both' | 'none' = 'none'

  if (strengthLabels.length > 0 && strengthFreeText) {
    strengthsText = `Fortalezas identificadas en la Valoración Integral:\n${strengthLabels.join('\n')}\n\nObservaciones adicionales:\n${strengthFreeText}`
    strengthsSource = 'both'
  } else if (strengthLabels.length > 0) {
    strengthsText = `Fortalezas identificadas en la Valoración Integral:\n${strengthLabels.join('\n')}`
    strengthsSource = 'codes'
  } else if (strengthFreeText) {
    strengthsText = strengthFreeText
    strengthsSource = 'text'
  }

  // 7. Columna 2: Estrategias de mediación — plantillas + contexto de barreras
  const mediationLines: string[] = []

  if (byDifficulty.size > 0) {
    mediationLines.push('Estrategias de mediación pedagógica en el aula:\n')

    for (const [diff, diffEntry] of byDifficulty) {
      const areaNames = Array.from(diffEntry.areas.values())
        .map((a) => a.label)
        .join(', ')
      const template = STRATEGY_TEMPLATES[diff] ?? GENERIC_STRATEGY
      mediationLines.push(`▸ Para ${diffEntry.label} (áreas con dificultades: ${areaNames}):`)
      for (const s of template.mediation) {
        mediationLines.push(`  • ${s}`)
      }
      mediationLines.push('')
    }
  } else {
    mediationLines.push(
      'Complete la herramienta de valoración diagnóstica para generar sugerencias de mediación específicas.\n'
    )
  }

  // Enriquecer con contexto de barreras identificadas
  if (barrierItems.length > 0) {
    const barrierCategories = [...new Set(barrierItems.map((b) => b.category))]
    mediationLines.push('▸ Consideraciones adicionales según las barreras identificadas en la valoración:')
    for (const cat of barrierCategories) {
      const strategy = BARRIER_CATEGORY_TO_MEDIATION[cat]
      if (strategy) mediationLines.push(`  • ${strategy}`)
    }
    mediationLines.push('')
    mediationLines.push(
      'Barreras para el aprendizaje reportadas: ' +
        barrierItems.map((b) => b.label).join('; ') + '.'
    )
  }

  // 8. Columna 3: Estrategias para la casa — plantillas + acuerdos
  const homeLines: string[] = []

  if (byDifficulty.size > 0) {
    homeLines.push('Estrategias de apoyo en el hogar:\n')

    for (const [diff, diffEntry] of byDifficulty) {
      const template = STRATEGY_TEMPLATES[diff] ?? GENERIC_STRATEGY
      homeLines.push(`▸ Para ${diffEntry.label}:`)
      for (const s of template.home) {
        homeLines.push(`  • ${s}`)
      }
      homeLines.push('')
    }

    homeLines.push(
      'Nota: Estas estrategias se presentan y acuerdan con la familia en reunión colaborativa. ' +
        'El plan lo lidera el docente de apoyo educativo (Cuaderno N°4, pág. 58).'
    )
  } else {
    homeLines.push(
      'Complete la herramienta de valoración diagnóstica para generar recomendaciones de apoyo en el hogar.'
    )
  }

  // Enriquecer con acuerdos de la valoración si los hay
  const agreements = assessment?.agreements?.trim()
  if (agreements) {
    homeLines.push('\n▸ Acuerdos y compromisos establecidos en la Valoración Integral:')
    homeLines.push(agreements)
  }

  // 9. Columna 4: Estrategias específicas del docente de apoyo
  const specificLines: string[] = []

  if (byDifficulty.size > 0) {
    specificLines.push(
      'Áreas prioritarias para el trabajo personalizado con la docente de apoyo educativo:\n'
    )

    for (const [diff, diffEntry] of byDifficulty) {
      specificLines.push(`▸ ${diffEntry.label.toUpperCase()} — Objetivos por desarrollar:`)
      for (const [, areaEntry] of diffEntry.areas) {
        const strategy = specificStrategyForArea(diff, areaEntry.label)
        specificLines.push(`  • ${areaEntry.label}: ${strategy}`)
      }
      specificLines.push('')
    }
  } else {
    specificLines.push(
      'Complete la herramienta de valoración diagnóstica para identificar áreas específicas de trabajo personalizado.\n'
    )
  }

  // Enriquecer con apoyos requeridos de la valoración
  if (supportItems.length > 0) {
    const supportCategories = [...new Set(supportItems.map((s) => s.category))]
    specificLines.push('▸ Apoyos educativos requeridos según la Valoración Integral:')
    for (const cat of supportCategories) {
      const strategy = SUPPORT_CATEGORY_TO_SPECIFIC[cat]
      if (strategy) specificLines.push(`  • ${strategy}`)
    }
    specificLines.push('')
    specificLines.push(
      'Apoyos específicos identificados: ' +
        supportItems.map((s) => s.label).join('; ') + '.'
    )
  }

  // Agregar texto libre de apoyos si existe
  const supportsText = assessment?.requiredSupports?.trim()
  if (supportsText) {
    specificLines.push('\n▸ Descripción de apoyos (observaciones del docente):')
    specificLines.push(supportsText)
  }

  return {
    activeDifficulties,
    priorityProcesses: [...priorityProcessesSet],
    executiveSubprocesses: [...executiveSubprocessesSet],
    strengths: strengthsText,
    mediationStrategies: mediationLines.join('\n'),
    homeStrategies: homeLines.join('\n'),
    specificStrategies: specificLines.join('\n'),
    _meta: {
      strengthsSource,
      difficultiesFound: byDifficulty.size,
      failedObjectivesCount: failedResults.length,
      barrierCodesUsed: barrierItems.length,
      supportCodesUsed: supportItems.length,
    },
  }
}
