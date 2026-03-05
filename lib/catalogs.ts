// lib/catalogs.ts

// =============================================
// 📚 DIFICULTADES ESPECÍFICAS DEL APRENDIZAJE
// Nombres alineados a plantilla oficial
// =============================================
export const DIFFICULTIES_CATALOG = [
  'Dislexia',
  'Disortografía',
  'Disgrafía',
  'Discalculia',
  'Dispraxia',
  'TDA',
  'Aprendizaje lento',
  'Aprendizaje no verbal',
] as const

// =============================================
// 🧠 PROCESOS IMPLICADOS EN EL APRENDIZAJE
// 5 oficiales + Funciones ejecutivas (uso real)
// =============================================
export const PROCESSES_CATALOG = [
  'Percepción',
  'Atención',
  'Emoción',
  'Motivación',
  'Memoria',
  'Funciones ejecutivas',
] as const

export const EXECUTIVE_FUNCTIONS_SUBPROCESSES = [
  'Planificación',
  'Organización',
  'Flexibilidad',
  'Autorregulación',
  'Automonitoreo',
] as const

// =============================================
// 🔬 INSTRUMENTOS DE VALORACIÓN
// Formato 2026 + instrumentos de uso frecuente
// =============================================
export const INSTRUMENTS_CATALOG = [
  'Observación en aula',
  'Observación en otros contextos',
  'Entrevista a familia',
  'Entrevista a docentes',
  'Instrumentos basados en el currículo',
  'Evaluaciones diagnósticas en asignaturas básicas',
  'Registros de observación',
  'Escala de calificación',
  'Lista de cotejo',
] as const

// =============================================
// 🎯 CATÁLOGO DE OBJETIVOS DE INTERVENCIÓN
// 72 objetivos fijos — Sin cambios
// =============================================

export interface CatalogObjective {
  id: string
  macroArea: string
  specificGoal: string
}

export const MACRO_AREAS = [
  'Contexto de Aula',
  'Grafía',
  'Motricidad',
  'Percepción Visual',
  'Percepción Auditiva',
  'Orientación Espacial',
  'Orientación Temporal',
  'Madurez Socioemocional',
  'Lectoescritura',
  'Ortografía',
  'Matemáticas',
] as const

export type MacroArea = typeof MACRO_AREAS[number]

export const OBJECTIVES_CATALOG: CatalogObjective[] = [
  // ── Contexto de Aula (10) ──
  { id: 'CTX-01', macroArea: 'Contexto de Aula', specificGoal: 'Uso del espacio' },
  { id: 'CTX-02', macroArea: 'Contexto de Aula', specificGoal: 'Tiempo' },
  { id: 'CTX-03', macroArea: 'Contexto de Aula', specificGoal: 'Organización del mobiliario' },
  { id: 'CTX-04', macroArea: 'Contexto de Aula', specificGoal: 'Iluminación del aula' },
  { id: 'CTX-05', macroArea: 'Contexto de Aula', specificGoal: 'Ventilación' },
  { id: 'CTX-06', macroArea: 'Contexto de Aula', specificGoal: 'Tamaño' },
  { id: 'CTX-07', macroArea: 'Contexto de Aula', specificGoal: 'Disposición de los elementos y estímulos' },
  { id: 'CTX-08', macroArea: 'Contexto de Aula', specificGoal: 'Transición de las actividades' },
  { id: 'CTX-09', macroArea: 'Contexto de Aula', specificGoal: 'Interacción con la persona docente' },
  { id: 'CTX-10', macroArea: 'Contexto de Aula', specificGoal: 'Interacción con sus iguales' },

  // ── Grafía (10) ──
  { id: 'GRA-01', macroArea: 'Grafía', specificGoal: 'Control de la presión' },
  { id: 'GRA-02', macroArea: 'Grafía', specificGoal: 'Posición del papel' },
  { id: 'GRA-03', macroArea: 'Grafía', specificGoal: 'Postura en el pupitre' },
  { id: 'GRA-04', macroArea: 'Grafía', specificGoal: 'Fluidez al escribir' },
  { id: 'GRA-05', macroArea: 'Grafía', specificGoal: 'Linealidad' },
  { id: 'GRA-06', macroArea: 'Grafía', specificGoal: 'Separación de letras' },
  { id: 'GRA-07', macroArea: 'Grafía', specificGoal: 'Regularidad del tamaño' },
  { id: 'GRA-08', macroArea: 'Grafía', specificGoal: 'Dificultad para saber los movimientos necesarios para reproducir las letras' },
  { id: 'GRA-09', macroArea: 'Grafía', specificGoal: 'Dificultades en la percepción ideo-motriz' },
  { id: 'GRA-10', macroArea: 'Grafía', specificGoal: 'Ausencia de dominancia lateral' },

  // ── Motricidad (4) ──
  { id: 'MOT-01', macroArea: 'Motricidad', specificGoal: 'Dificultades en el tono muscular' },
  { id: 'MOT-02', macroArea: 'Motricidad', specificGoal: 'Torpeza manifiesta en la realización de movimientos' },
  { id: 'MOT-03', macroArea: 'Motricidad', specificGoal: 'Dificultad en seguir el ritmo con una misma actividad o con cambios' },
  { id: 'MOT-04', macroArea: 'Motricidad', specificGoal: 'Confusión al seguir órdenes motoras simples' },

  // ── Percepción Visual (3) ──
  { id: 'VIS-01', macroArea: 'Percepción Visual', specificGoal: 'Distingue colores e intensidades' },
  { id: 'VIS-02', macroArea: 'Percepción Visual', specificGoal: 'Diferencia formas simples' },
  { id: 'VIS-03', macroArea: 'Percepción Visual', specificGoal: 'Diferencia figuras idénticas en diferentes posiciones' },

  // ── Percepción Auditiva (3) ──
  { id: 'AUD-01', macroArea: 'Percepción Auditiva', specificGoal: 'Expresión oral pobre y dificultades en la articulación de sonidos' },
  { id: 'AUD-02', macroArea: 'Percepción Auditiva', specificGoal: 'Falta de atención en el aula, aparenta no escuchar u olvida consignas que se le dan' },
  { id: 'AUD-03', macroArea: 'Percepción Auditiva', specificGoal: 'Sensibilidad al ruido, molestia ante ruidos fuertes' },

  // ── Orientación Espacial (3) ──
  { id: 'ESP-01', macroArea: 'Orientación Espacial', specificGoal: 'Dificultad para adquirir conceptos derecha-izquierda' },
  { id: 'ESP-02', macroArea: 'Orientación Espacial', specificGoal: 'Evitación de juegos de construcción, rompecabezas, etc.' },
  { id: 'ESP-03', macroArea: 'Orientación Espacial', specificGoal: 'Dificultad para seguir órdenes sencillas con consignas espaciales' },

  // ── Orientación Temporal (3) ──
  { id: 'TMP-01', macroArea: 'Orientación Temporal', specificGoal: 'Dificultad para organizar los pasos a partir de los cuales se realizan las actividades del aula' },
  { id: 'TMP-02', macroArea: 'Orientación Temporal', specificGoal: 'Facilidad para perder cosas' },
  { id: 'TMP-03', macroArea: 'Orientación Temporal', specificGoal: 'Dificultad para anticipar consecuencias' },

  // ── Madurez Socioemocional (4) ──
  { id: 'MAD-01', macroArea: 'Madurez Socioemocional', specificGoal: 'Muestra actitudes de rebeldía para cumplir instrucciones que le dan' },
  { id: 'MAD-02', macroArea: 'Madurez Socioemocional', specificGoal: 'Expresa descontrol emocional cuando algo no sale como debería' },
  { id: 'MAD-03', macroArea: 'Madurez Socioemocional', specificGoal: 'Se mantiene aislado o aislada en actividades de grupo' },
  { id: 'MAD-04', macroArea: 'Madurez Socioemocional', specificGoal: 'Tiende a jugar en lugar de realizar las actividades de clase' },

  // ── Lectoescritura (16) ──
  { id: 'LEC-01', macroArea: 'Lectoescritura', specificGoal: 'Invierte letras, sílabas y/o palabras' },
  { id: 'LEC-02', macroArea: 'Lectoescritura', specificGoal: 'Confunde el orden de las letras dentro de las palabras' },
  { id: 'LEC-03', macroArea: 'Lectoescritura', specificGoal: 'Confunde especialmente las letras que tienen una similitud (d/b, u/n...)' },
  { id: 'LEC-04', macroArea: 'Lectoescritura', specificGoal: 'Omite letras en una palabra' },
  { id: 'LEC-05', macroArea: 'Lectoescritura', specificGoal: 'Sustituye una palabra por otra que empieza por la misma letra' },
  { id: 'LEC-06', macroArea: 'Lectoescritura', specificGoal: 'Tiene dificultades para conectar letras y sonidos' },
  { id: 'LEC-07', macroArea: 'Lectoescritura', specificGoal: 'Le cuesta pronunciar palabras, invierte o sustituye sílabas' },
  { id: 'LEC-08', macroArea: 'Lectoescritura', specificGoal: 'Al leer rectifica, vacila, silabea y/o pierde la línea' },
  { id: 'LEC-09', macroArea: 'Lectoescritura', specificGoal: 'No domina todas las correspondencias entre letras y sonidos' },
  { id: 'LEC-10', macroArea: 'Lectoescritura', specificGoal: 'Confunde derecha e izquierda' },
  { id: 'LEC-11', macroArea: 'Lectoescritura', specificGoal: 'Escribe en espejo' },
  { id: 'LEC-12', macroArea: 'Lectoescritura', specificGoal: 'Su coordinación motriz es pobre' },
  { id: 'LEC-13', macroArea: 'Lectoescritura', specificGoal: 'Dificultades para el aprendizaje de secuencias (días, meses, estaciones...)' },
  { id: 'LEC-14', macroArea: 'Lectoescritura', specificGoal: 'Le cuesta planificar su tiempo' },
  { id: 'LEC-15', macroArea: 'Lectoescritura', specificGoal: 'Trabaja con lentitud' },
  { id: 'LEC-16', macroArea: 'Lectoescritura', specificGoal: 'Evita leer' },

  // ── Ortografía (6) ──
  { id: 'ORT-01', macroArea: 'Ortografía', specificGoal: 'Omisiones, adiciones e inversiones de fonemas, sílabas enteras y/o palabras' },
  { id: 'ORT-02', macroArea: 'Ortografía', specificGoal: 'Dificultades para realizar la síntesis y asociación entre fonema y grafema' },
  { id: 'ORT-03', macroArea: 'Ortografía', specificGoal: 'No poner «m» antes de «b» y «p»' },
  { id: 'ORT-04', macroArea: 'Ortografía', specificGoal: 'Infringir reglas de puntuación' },
  { id: 'ORT-05', macroArea: 'Ortografía', specificGoal: 'Respetar las mayúsculas después de punto o al principio del escrito' },
  { id: 'ORT-06', macroArea: 'Ortografía', specificGoal: 'Escribir con «v» los verbos terminados en «aba»' },

  // ── Matemáticas (10) ──
  { id: 'MAT-01', macroArea: 'Matemáticas', specificGoal: 'Posee el concepto de número' },
  { id: 'MAT-02', macroArea: 'Matemáticas', specificGoal: 'Lee y escribe números' },
  { id: 'MAT-03', macroArea: 'Matemáticas', specificGoal: 'Realiza operaciones aritméticas básicas' },
  { id: 'MAT-04', macroArea: 'Matemáticas', specificGoal: 'Adición' },
  { id: 'MAT-05', macroArea: 'Matemáticas', specificGoal: 'Sustracción' },
  { id: 'MAT-06', macroArea: 'Matemáticas', specificGoal: 'Multiplicación' },
  { id: 'MAT-07', macroArea: 'Matemáticas', specificGoal: 'División' },
  { id: 'MAT-08', macroArea: 'Matemáticas', specificGoal: 'Resuelve problemas matemáticos a nivel de su curso' },
  { id: 'MAT-09', macroArea: 'Matemáticas', specificGoal: 'Realiza cálculos escritos en operaciones matemáticas' },
  { id: 'MAT-10', macroArea: 'Matemáticas', specificGoal: 'Realiza cálculos mentales en operaciones matemáticas' },
]

// =============================================
// Tipos exportados
// =============================================
export type Difficulty = typeof DIFFICULTIES_CATALOG[number]
export type Process = typeof PROCESSES_CATALOG[number]
export type ExecutiveSubprocess = typeof EXECUTIVE_FUNCTIONS_SUBPROCESSES[number]
export type Instrument = typeof INSTRUMENTS_CATALOG[number]