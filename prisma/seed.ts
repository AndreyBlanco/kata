// prisma/seed.ts

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { ASSESSMENT_OBJECTIVES } from './assessment-objectives-data'
import { BARRIER_ITEMS, CONTEXT_DIMENSIONS, SUPPORT_ITEMS, FOLLOWUP_SCHEDULES } from './catalogs-data'

const prisma = new PrismaClient()

// =============================================
// PARTICIPANT ROLES — Roles en la Valoración Integral (sección 2)
// =============================================
const PARTICIPANT_ROLES = [
  { code: 'DOCENTE_GUIA', label: 'Docente guía', category: 'docente', isCore: true, sortOrder: 10 },
  { code: 'APOYO_PA', label: 'Docente de apoyo — Problemas de Aprendizaje', category: 'servicio_apoyo', isCore: true, sortOrder: 20 },
  { code: 'APOYO_PEC', label: 'Docente de apoyo — Problemas Emocionales y de Conducta', category: 'servicio_apoyo', isCore: true, sortOrder: 30 },
  { code: 'APOYO_DV', label: 'Docente de apoyo — Discapacidad Visual', category: 'servicio_apoyo', isCore: true, sortOrder: 40 },
  { code: 'APOYO_RM', label: 'Docente de apoyo — Retardo Mental', category: 'servicio_apoyo', isCore: true, sortOrder: 50 },
  { code: 'APOYO_DM', label: 'Docente de apoyo — Discapacidad Múltiple', category: 'servicio_apoyo', isCore: true, sortOrder: 60 },
  { code: 'DIRECCION', label: 'Dirección del centro educativo', category: 'institucional', isCore: true, sortOrder: 70 },
  { code: 'FAMILIA_ENCARGADO', label: 'Madre / Padre / Encargado(a)', category: 'familia', isCore: true, sortOrder: 80 },
  { code: 'ESTUDIANTE', label: 'Persona estudiante', category: 'estudiante', isCore: true, sortOrder: 90 },
  { code: 'PSICOLOGIA_ORIENTACION', label: 'Psicología / Orientación', category: 'salud_apoyo', isCore: false, sortOrder: 100 },
  { code: 'TRABAJO_SOCIAL', label: 'Trabajo social', category: 'salud_apoyo', isCore: false, sortOrder: 110 },
  { code: 'SALUD_OTRO', label: 'Otro profesional de salud', category: 'salud_apoyo', isCore: false, sortOrder: 120 },
  { code: 'OTRO', label: 'Otro', category: 'otro', isCore: false, sortOrder: 200 },
] as const

// =============================================
// STRENGTH ITEMS — Fortalezas, intereses y recursos (sección 4 VI / col. 1 Plan de Apoyo)
// category: academica | cognitiva | socioemocional | interes | recurso_familia | recurso_escolar
// =============================================
const STRENGTH_ITEMS = [
  // — Fortalezas académicas —
  { code: 'FOR_AC_01', label: 'Desempeño destacado en Matemáticas', category: 'academica', isCore: true, sortOrder: 10, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Muestra habilidades por encima de lo esperado en el área matemática.', examples: 'Resuelve problemas con agilidad, disfruta los ejercicios numéricos.' },
  { code: 'FOR_AC_02', label: 'Desempeño destacado en Ciencias', category: 'academica', isCore: false, sortOrder: 20, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Muestra curiosidad e interés sostenido por contenidos científicos.', examples: 'Formula preguntas, disfruta experimentos o documentales.' },
  { code: 'FOR_AC_03', label: 'Desempeño destacado en Educación Física', category: 'academica', isCore: false, sortOrder: 30, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Sobresale en actividades físicas y deportivas.', examples: 'Coordinación motriz superior, participación entusiasta.' },
  { code: 'FOR_AC_04', label: 'Desempeño destacado en Artes Plásticas o Música', category: 'academica', isCore: false, sortOrder: 40, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Muestra talento o motivación especial en expresión artística.', examples: 'Dibujo detallado, ritmo musical, creatividad visual.' },
  { code: 'FOR_AC_05', label: 'Buena expresión oral', category: 'academica', isCore: true, sortOrder: 50, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Comunica ideas con claridad y fluidez de forma verbal.', examples: 'Participa activamente, narra cuentos, describe imágenes.' },
  { code: 'FOR_AC_06', label: 'Buena comprensión oral', category: 'academica', isCore: true, sortOrder: 60, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Entiende instrucciones y textos escuchados con facilidad.', examples: 'Responde preguntas de comprensión auditiva con precisión.' },
  { code: 'FOR_AC_07', label: 'Comprensión lectora funcional', category: 'academica', isCore: false, sortOrder: 70, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Comprende textos escritos acordes a su nivel cuando se dan apoyos.', examples: 'Extrae la idea principal, responde preguntas de comprensión.' },
  { code: 'FOR_AC_08', label: 'Interés o habilidad en inglés u otro idioma', category: 'academica', isCore: false, sortOrder: 80, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Muestra facilidad o motivación para el aprendizaje de idiomas.', examples: 'Adquiere vocabulario con rapidez, pronunciación fluida.' },

  // — Fortalezas cognitivas —
  { code: 'FOR_COG_01', label: 'Buena memoria visual', category: 'cognitiva', isCore: true, sortOrder: 110, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Recuerda imágenes, mapas, esquemas y disposiciones espaciales con facilidad.', examples: 'Recuerda dónde están las cosas, evoca diagramas o dibujos.' },
  { code: 'FOR_COG_02', label: 'Buena memoria auditiva', category: 'cognitiva', isCore: true, sortOrder: 120, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Retiene información presentada de forma oral.', examples: 'Memoriza canciones, instrucciones habladas, poemas.' },
  { code: 'FOR_COG_03', label: 'Buena memoria a largo plazo', category: 'cognitiva', isCore: false, sortOrder: 130, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Recupera información aprendida tiempo atrás con facilidad.', examples: 'Recuerda eventos pasados o contenidos estudiados semanas antes.' },
  { code: 'FOR_COG_04', label: 'Razonamiento lógico y resolución de problemas', category: 'cognitiva', isCore: true, sortOrder: 140, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Analiza situaciones y encuentra soluciones de forma estructurada.', examples: 'Rompecabezas, juegos de estrategia, razonamiento causa-efecto.' },
  { code: 'FOR_COG_05', label: 'Pensamiento creativo e imaginación', category: 'cognitiva', isCore: false, sortOrder: 150, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Genera ideas originales y soluciones novedosas.', examples: 'Inventa historias, propone alternativas no convencionales.' },
  { code: 'FOR_COG_06', label: 'Capacidad de asociación de ideas', category: 'cognitiva', isCore: false, sortOrder: 160, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Conecta conceptos de diferentes áreas con facilidad.', examples: 'Establece analogías, relaciona contenidos nuevos con conocidos.' },
  { code: 'FOR_COG_07', label: 'Atención sostenida en temas de interés', category: 'cognitiva', isCore: true, sortOrder: 170, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Mantiene concentración prolongada cuando la tarea es motivadora.', examples: 'Permanece enfocado en proyectos manuales, juegos, lectura de su interés.' },

  // — Fortalezas socioemocionales —
  { code: 'FOR_SE_01', label: 'Actitud positiva hacia el aprendizaje', category: 'socioemocional', isCore: true, sortOrder: 210, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Muestra disposición y apertura ante tareas y actividades nuevas.', examples: 'Intenta las actividades sin resistencia, pregunta y participa.' },
  { code: 'FOR_SE_02', label: 'Perseverancia ante la dificultad', category: 'socioemocional', isCore: true, sortOrder: 220, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Insiste en completar tareas a pesar de los obstáculos.', examples: 'No se rinde fácilmente, vuelve a intentarlo después de un error.' },
  { code: 'FOR_SE_03', label: 'Buena relación con sus pares', category: 'socioemocional', isCore: true, sortOrder: 230, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Se relaciona positivamente con compañeros y compañeras.', examples: 'Juega con distintos grupos, resuelve conflictos sin agresión.' },
  { code: 'FOR_SE_04', label: 'Respeto y seguimiento de normas', category: 'socioemocional', isCore: true, sortOrder: 240, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Comprende y respeta las reglas del aula y del centro.', examples: 'Espera su turno, sigue instrucciones del docente.' },
  { code: 'FOR_SE_05', label: 'Regulación emocional', category: 'socioemocional', isCore: true, sortOrder: 250, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Identifica y maneja sus emociones de forma apropiada.', examples: 'Expresa frustración sin agresión, pide ayuda cuando se altera.' },
  { code: 'FOR_SE_06', label: 'Autonomía e independencia', category: 'socioemocional', isCore: false, sortOrder: 260, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Realiza tareas sin depender constantemente de la aprobación adulta.', examples: 'Inicia actividades por cuenta propia, organiza sus materiales.' },
  { code: 'FOR_SE_07', label: 'Empatía y solidaridad', category: 'socioemocional', isCore: false, sortOrder: 270, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Muestra sensibilidad hacia las necesidades de los demás.', examples: 'Ayuda a un compañero, se preocupa cuando alguien está triste.' },
  { code: 'FOR_SE_08', label: 'Sentido del humor y actitud alegre', category: 'socioemocional', isCore: false, sortOrder: 280, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Su actitud positiva contribuye al clima del aula.', examples: 'Hace reír con respeto, alivia tensiones, es querido por sus pares.' },
  { code: 'FOR_SE_09', label: 'Buena relación con adultos de referencia', category: 'socioemocional', isCore: true, sortOrder: 290, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Se vincula de forma positiva con docentes y figuras de autoridad.', examples: 'Busca apoyo del adulto, acepta correcciones afectuosamente.' },

  // — Intereses y motivaciones —
  { code: 'FOR_INT_01', label: 'Interés por el deporte', category: 'interes', isCore: true, sortOrder: 310, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Disfruta actividades físicas, deportivas o competitivas.', examples: 'Fútbol, natación, atletismo, juegos de patio.' },
  { code: 'FOR_INT_02', label: 'Interés por el arte (dibujo, pintura, manualidades)', category: 'interes', isCore: true, sortOrder: 320, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Muestra motivación por actividades de expresión plástica.', examples: 'Dibuja en su tiempo libre, decora su cuaderno.' },
  { code: 'FOR_INT_03', label: 'Interés por la música', category: 'interes', isCore: true, sortOrder: 330, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Disfruta escuchar, cantar o hacer ritmos.', examples: 'Recuerda letras de canciones, toca instrumentos, canta.' },
  { code: 'FOR_INT_04', label: 'Interés por la tecnología y videojuegos', category: 'interes', isCore: false, sortOrder: 340, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Se motiva con recursos digitales y juegos electrónicos.', examples: 'Aprende apps rápido, disfruta videojuegos, usa la tableta.' },
  { code: 'FOR_INT_05', label: 'Interés por la lectura o cuentos', category: 'interes', isCore: false, sortOrder: 350, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Muestra gusto por historias, comics o libros de interés.', examples: 'Pide que le lean, escoge libros, inventa cuentos.' },
  { code: 'FOR_INT_06', label: 'Interés por la naturaleza y ciencias', category: 'interes', isCore: false, sortOrder: 360, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Curiosidad por el mundo natural, animales y fenómenos científicos.', examples: 'Observa insectos, pregunta sobre planetas, le gustan los experimentos.' },
  { code: 'FOR_INT_07', label: 'Interés por actividades prácticas y manuales', category: 'interes', isCore: false, sortOrder: 370, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Disfruta construir, reparar o hacer cosas con las manos.', examples: 'Construcciones con bloques, reparar juguetes, cocinar.' },

  // — Recursos del entorno familiar —
  { code: 'FOR_RF_01', label: 'Familia comprometida con el proceso educativo', category: 'recurso_familia', isCore: true, sortOrder: 410, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'El entorno familiar participa activamente y apoya el proceso escolar.', examples: 'Asiste a reuniones, firma comunicados, sigue sugerencias del docente.' },
  { code: 'FOR_RF_02', label: 'Apoyo en tareas y refuerzo en el hogar', category: 'recurso_familia', isCore: true, sortOrder: 420, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Hay un adulto en casa que ayuda al estudiante con actividades académicas.', examples: 'Supervisa la tarea, practica la lectura, refuerza contenidos.' },
  { code: 'FOR_RF_03', label: 'Entorno familiar estable y afectivo', category: 'recurso_familia', isCore: true, sortOrder: 430, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'El estudiante cuenta con un ambiente familiar seguro y de apoyo emocional.', examples: 'Vínculos positivos, rutinas estables, comunicación abierta.' },
  { code: 'FOR_RF_04', label: 'Acceso a materiales y recursos en el hogar', category: 'recurso_familia', isCore: false, sortOrder: 440, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Hay materiales básicos disponibles para las actividades escolares.', examples: 'Cuadernos, lápices, espacio de estudio, libros.' },
  { code: 'FOR_RF_05', label: 'Acceso a tecnología en el hogar', category: 'recurso_familia', isCore: false, sortOrder: 450, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'El estudiante puede acceder a dispositivos y/o internet desde casa.', examples: 'Tableta, computadora, celular con internet.' },

  // — Recursos del entorno escolar —
  { code: 'FOR_RE_01', label: 'Docente guía comprometida/o con el proceso', category: 'recurso_escolar', isCore: true, sortOrder: 510, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'El docente de aula está informado, involucrado y abierto a ajustes.', examples: 'Aplica adecuaciones, mantiene comunicación con el servicio de apoyo.' },
  { code: 'FOR_RE_02', label: 'Trabajo colaborativo entre docentes', category: 'recurso_escolar', isCore: false, sortOrder: 520, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'Existe coordinación efectiva entre los profesionales que atienden al estudiante.', examples: 'Reuniones de equipo, planificación conjunta, acuerdos compartidos.' },
  { code: 'FOR_RE_03', label: 'Apoyo de Orientación o Psicología en el centro', category: 'recurso_escolar', isCore: false, sortOrder: 530, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'El centro cuenta con profesionales de apoyo adicionales.', examples: 'Orientadora disponible, psicóloga que atiende al estudiante.' },
  { code: 'FOR_RE_04', label: 'Clima de aula positivo y respetuoso', category: 'recurso_escolar', isCore: true, sortOrder: 540, serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'], description: 'El ambiente del aula favorece el aprendizaje y la convivencia.', examples: 'Normas claras, relaciones cordiales, cero tolerancia al acoso.' },
] as const

// =============================================
// LEARNING PROCESS ITEMS — Procesos implicados (sección 5a VI / Plan de Apoyo)
// Los 6 procesos oficiales del Cuaderno N°4 + 5 subprocesos de Funciones Ejecutivas
// category: proceso | funcion_ejecutiva
// =============================================
const LEARNING_PROCESS_ITEMS = [
  // — Procesos principales (category: proceso) —
  {
    code: 'PROC_PERCEPCION',
    label: 'Percepción',
    category: 'proceso',
    parentCode: null,
    isCore: true,
    sortOrder: 10,
    serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'],
    description: 'Capacidad de recibir, organizar e interpretar información sensorial (visual, auditiva, táctil, kinestésica).',
    examples: 'Dificultades para distinguir letras similares, confusión figura-fondo, problemas para seguir secuencias auditivas.',
  },
  {
    code: 'PROC_ATENCION',
    label: 'Atención',
    category: 'proceso',
    parentCode: null,
    isCore: true,
    sortOrder: 20,
    serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'],
    description: 'Capacidad de focalizar, mantener y distribuir el esfuerzo cognitivo hacia estímulos o tareas relevantes.',
    examples: 'Se distrae con facilidad, no termina tareas, dificultad para seguir instrucciones de varios pasos.',
  },
  {
    code: 'PROC_EMOCION',
    label: 'Emoción',
    category: 'proceso',
    parentCode: null,
    isCore: true,
    sortOrder: 30,
    serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'],
    description: 'Reconocimiento, expresión y regulación de los estados emocionales propios y su influencia en el aprendizaje.',
    examples: 'Frustración ante el error, ansiedad en evaluaciones, bloqueo emocional ante tareas difíciles.',
  },
  {
    code: 'PROC_MOTIVACION',
    label: 'Motivación',
    category: 'proceso',
    parentCode: null,
    isCore: true,
    sortOrder: 40,
    serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'],
    description: 'Disposición interna hacia el aprendizaje, el esfuerzo y la perseverancia ante las tareas académicas.',
    examples: 'Se niega a iniciar tareas, baja tolerancia a la frustración, busca evitar el trabajo escolar.',
  },
  {
    code: 'PROC_MEMORIA',
    label: 'Memoria',
    category: 'proceso',
    parentCode: null,
    isCore: true,
    sortOrder: 50,
    serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'],
    description: 'Proceso de almacenamiento y recuperación de información (memoria de trabajo, corto y largo plazo, procedimental).',
    examples: 'Olvida instrucciones recién dadas, no retiene tablas de multiplicar, pierde el hilo al leer.',
  },
  {
    code: 'PROC_FUNCIONES_EJECUTIVAS',
    label: 'Funciones ejecutivas',
    category: 'proceso',
    parentCode: null,
    isCore: true,
    sortOrder: 60,
    serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'],
    description: 'Conjunto de procesos cognitivos de orden superior que regulan el comportamiento dirigido a metas (planificación, organización, flexibilidad, autorregulación, automonitoreo).',
    examples: 'Dificultad para organizar el tiempo, impulsividad, rigidez ante cambios, no revisa su trabajo.',
  },

  // — Subprocesos de Funciones Ejecutivas (category: funcion_ejecutiva) —
  {
    code: 'FE_PLANIFICACION',
    label: 'Planificación',
    category: 'funcion_ejecutiva',
    parentCode: 'PROC_FUNCIONES_EJECUTIVAS',
    isCore: true,
    sortOrder: 61,
    serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'],
    description: 'Capacidad de establecer metas y diseñar secuencias de pasos para alcanzarlas.',
    examples: 'No sabe por dónde empezar una tarea, no anticipa los materiales que necesita.',
  },
  {
    code: 'FE_ORGANIZACION',
    label: 'Organización',
    category: 'funcion_ejecutiva',
    parentCode: 'PROC_FUNCIONES_EJECUTIVAS',
    isCore: true,
    sortOrder: 62,
    serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'],
    description: 'Habilidad para ordenar materiales, tiempo e información de manera eficiente.',
    examples: 'Pierde objetos frecuentemente, cuaderno desorganizado, no cumple con fechas.',
  },
  {
    code: 'FE_FLEXIBILIDAD',
    label: 'Flexibilidad cognitiva',
    category: 'funcion_ejecutiva',
    parentCode: 'PROC_FUNCIONES_EJECUTIVAS',
    isCore: true,
    sortOrder: 63,
    serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'],
    description: 'Capacidad de adaptar el pensamiento y la conducta ante cambios o situaciones nuevas.',
    examples: 'Reacciones intensas ante cambios de rutina, insistencia en una sola forma de hacer las cosas.',
  },
  {
    code: 'FE_AUTORREGULACION',
    label: 'Autorregulación',
    category: 'funcion_ejecutiva',
    parentCode: 'PROC_FUNCIONES_EJECUTIVAS',
    isCore: true,
    sortOrder: 64,
    serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'],
    description: 'Capacidad de controlar impulsos, emociones y comportamientos para adaptarse a las demandas del entorno.',
    examples: 'Actúa sin pensar, interrumpe constantemente, dificultad para esperar su turno.',
  },
  {
    code: 'FE_AUTOMONITOREO',
    label: 'Automonitoreo',
    category: 'funcion_ejecutiva',
    parentCode: 'PROC_FUNCIONES_EJECUTIVAS',
    isCore: true,
    sortOrder: 65,
    serviceTags: ['PA', 'PEC', 'DV', 'RM', 'DM'],
    description: 'Habilidad de evaluar el propio desempeño y detectar errores durante la ejecución de una tarea.',
    examples: 'No revisa su trabajo antes de entregarlo, no detecta errores evidentes, sobreestima su desempeño.',
  },
] as const

// =============================================
// SPECIFIC LEARNING DIFFICULTIES — Dificultades específicas del aprendizaje (sección 5b)
// Migración + enriquecimiento desde DIFFICULTIES_CATALOG en código
// category: especifica | proceso_implicado
// =============================================
const SPECIFIC_LEARNING_DIFFICULTIES = [
  // — Dificultades específicas del aprendizaje (category: especifica) —
  {
    code: 'DISLEXIA',
    label: 'Dislexia',
    category: 'especifica',
    isCore: true,
    sortOrder: 10,
    serviceTags: ['PA'],
    description: 'Dificultad específica en la adquisición y el desarrollo de la lectura, con precisión, fluidez y/o comprensión lectora por debajo de lo esperado para la edad cronológica.',
    examples: 'Invierte letras (b/d, p/q), confunde sílabas, lectura silábica y lenta, evita leer en voz alta.',
  },
  {
    code: 'DISORTOGRAFIA',
    label: 'Disortografía',
    category: 'especifica',
    isCore: true,
    sortOrder: 20,
    serviceTags: ['PA'],
    description: 'Dificultad para aplicar las reglas ortográficas convencionales al escribir, con errores sistemáticos y persistentes.',
    examples: 'Omisiones, sustituciones o adiciones de letras; no respeta signos de puntuación ni mayúsculas.',
  },
  {
    code: 'DISGRAFIA',
    label: 'Disgrafía',
    category: 'especifica',
    isCore: true,
    sortOrder: 30,
    serviceTags: ['PA'],
    description: 'Dificultad en la producción gráfica de la escritura: trazado, presión, tamaño, linealidad y legibilidad.',
    examples: 'Letras irregulares en tamaño, escritura ilegible, presión excesiva o insuficiente, linealidad alterada.',
  },
  {
    code: 'DISCALCULIA',
    label: 'Discalculia',
    category: 'especifica',
    isCore: true,
    sortOrder: 40,
    serviceTags: ['PA'],
    description: 'Dificultad específica para adquirir habilidades aritméticas básicas y el sentido numérico.',
    examples: 'No domina la secuencia numérica, confunde operaciones, dificultad con tablas de multiplicar, errores en cálculo básico.',
  },
  {
    code: 'DISPRAXIA',
    label: 'Dispraxia',
    category: 'especifica',
    isCore: true,
    sortOrder: 50,
    serviceTags: ['PA'],
    description: 'Dificultad en la planificación, organización y ejecución de movimientos voluntarios coordinados.',
    examples: 'Torpeza motora, dificultad para seguir órdenes motoras, problemas con actividades de motricidad fina y gruesa.',
  },
  {
    code: 'TDA',
    label: 'Trastorno por Déficit de Atención (TDA)',
    category: 'especifica',
    isCore: true,
    sortOrder: 60,
    serviceTags: ['PA'],
    description: 'Dificultad persistente para mantener la atención, controlar impulsos y/o regular la actividad motora, que impacta el desempeño escolar.',
    examples: 'No termina tareas, se distrae con estímulos mínimos, impulsividad, movimiento constante.',
  },
  {
    code: 'APZ_LENTO',
    label: 'Aprendizaje lento',
    category: 'especifica',
    isCore: true,
    sortOrder: 70,
    serviceTags: ['PA'],
    description: 'Ritmo de aprendizaje más lento que el esperado para la edad, que requiere mayor tiempo, repetición y apoyo para consolidar conocimientos.',
    examples: 'Necesita más repeticiones para aprender, aplica conceptos más tarde que sus pares, requiere instrucciones simplificadas.',
  },
  {
    code: 'TANV',
    label: 'Aprendizaje no verbal (TANV)',
    category: 'especifica',
    isCore: true,
    sortOrder: 80,
    serviceTags: ['PA'],
    description: 'Dificultad en el procesamiento de información no verbal: espacio, tiempo, relaciones matemáticas y habilidades sociales implícitas.',
    examples: 'Buen vocabulario pero dificultad con matemáticas, problemas de orientación espacial, dificultad para leer lenguaje no verbal.',
  },
] as const

// =============================================
// MAIN
// =============================================
async function main() {
  const passwordHash = await bcrypt.hash('kata2026', 10)

  const teacher = await prisma.teacher.upsert({
    where: { email: 'docente@kata.cr' },
    update: {},
    create: {
      email: 'docente@kata.cr',
      passwordHash,
      name: 'Nadya Alán Soto',
      centerName: 'Escuela IDA Garabito',
      circuit: '04 Aguas Zarcas',
      specialty: 'Problemas de Aprendizaje',
    },
  })

  // — ParticipantRole —
  for (const row of PARTICIPANT_ROLES) {
    await prisma.participantRole.upsert({
      where: { code: row.code },
      update: { label: row.label, category: row.category, isCore: row.isCore, sortOrder: row.sortOrder, active: true },
      create: { code: row.code, label: row.label, category: row.category, isCore: row.isCore, sortOrder: row.sortOrder, active: true },
    })
  }

  // — StrengthItem —
  for (const row of STRENGTH_ITEMS) {
    await prisma.strengthItem.upsert({
      where: { code: row.code },
      update: {
        label: row.label,
        category: row.category,
        isCore: row.isCore,
        sortOrder: row.sortOrder,
        serviceTags: [...row.serviceTags],
        description: row.description,
        examples: row.examples,
        active: true,
      },
      create: {
        code: row.code,
        label: row.label,
        category: row.category,
        isCore: row.isCore,
        sortOrder: row.sortOrder,
        serviceTags: [...row.serviceTags],
        description: row.description,
        examples: row.examples,
        active: true,
      },
    })
  }

  // — LearningProcessItem —
  for (const row of LEARNING_PROCESS_ITEMS) {
    await prisma.learningProcessItem.upsert({
      where: { code: row.code },
      update: {
        label: row.label,
        category: row.category,
        parentCode: row.parentCode,
        isCore: row.isCore,
        sortOrder: row.sortOrder,
        serviceTags: [...row.serviceTags],
        description: row.description,
        examples: row.examples,
        active: true,
      },
      create: {
        code: row.code,
        label: row.label,
        category: row.category,
        parentCode: row.parentCode,
        isCore: row.isCore,
        sortOrder: row.sortOrder,
        serviceTags: [...row.serviceTags],
        description: row.description,
        examples: row.examples,
        active: true,
      },
    })
  }

  // — SpecificLearningDifficulty —
  for (const row of SPECIFIC_LEARNING_DIFFICULTIES) {
    await prisma.specificLearningDifficulty.upsert({
      where: { code: row.code },
      update: {
        label: row.label,
        category: row.category,
        isCore: row.isCore,
        sortOrder: row.sortOrder,
        serviceTags: [...row.serviceTags],
        description: row.description,
        examples: row.examples,
        active: true,
      },
      create: {
        code: row.code,
        label: row.label,
        category: row.category,
        isCore: row.isCore,
        sortOrder: row.sortOrder,
        serviceTags: [...row.serviceTags],
        description: row.description,
        examples: row.examples,
        active: true,
      },
    })
  }

  // — AssessmentObjective —
  // Seed en lotes para no saturar la conexión (664 registros)
  const BATCH_SIZE = 50
  let seededObjectives = 0
  for (let i = 0; i < ASSESSMENT_OBJECTIVES.length; i += BATCH_SIZE) {
    const batch = ASSESSMENT_OBJECTIVES.slice(i, i + BATCH_SIZE)
    for (const row of batch) {
      await prisma.assessmentObjective.upsert({
        where: { code: row.code },
        update: {
          difficulty:      row.difficulty,
          difficultyLabel: row.difficultyLabel,
          areaCode:        row.areaCode,
          areaLabel:       row.areaLabel,
          level:           row.level,
          levelLabel:      row.levelLabel,
          levelType:       row.levelType,
          levelSort:       row.levelSort,
          itemOrder:       row.itemOrder,
          description:     row.description,
          active:          true,
        },
        create: {
          code:            row.code,
          difficulty:      row.difficulty,
          difficultyLabel: row.difficultyLabel,
          areaCode:        row.areaCode,
          areaLabel:       row.areaLabel,
          level:           row.level,
          levelLabel:      row.levelLabel,
          levelType:       row.levelType,
          levelSort:       row.levelSort,
          itemOrder:       row.itemOrder,
          description:     row.description,
          active:          true,
        },
      })
      seededObjectives++
    }
    process.stdout.write(`\r  AssessmentObjective: ${seededObjectives}/${ASSESSMENT_OBJECTIVES.length}`)
  }
  process.stdout.write('\n')

  // =============================================
  // BARRIER ITEMS
  // =============================================
  console.log('  Seeding BarrierItem...')
  for (const row of BARRIER_ITEMS) {
    await prisma.barrierItem.upsert({
      where: { code: row.code },
      update: { label: row.label, category: row.category, description: row.description, serviceTags: row.serviceTags, isCore: row.isCore, sortOrder: row.sortOrder, active: true },
      create: { code: row.code, label: row.label, category: row.category, description: row.description, serviceTags: row.serviceTags, isCore: row.isCore, sortOrder: row.sortOrder, active: true },
    })
  }

  // =============================================
  // CONTEXT DIMENSIONS
  // =============================================
  console.log('  Seeding ContextDimension...')
  for (const row of CONTEXT_DIMENSIONS) {
    await prisma.contextDimension.upsert({
      where: { code: row.code },
      update: { label: row.label, dimension: row.dimension, description: row.description, guideText: row.guideText, sortOrder: row.sortOrder, active: true },
      create: { code: row.code, label: row.label, dimension: row.dimension, description: row.description, guideText: row.guideText, sortOrder: row.sortOrder, active: true },
    })
  }

  // =============================================
  // SUPPORT ITEMS
  // =============================================
  console.log('  Seeding SupportItem...')
  for (const row of SUPPORT_ITEMS) {
    await prisma.supportItem.upsert({
      where: { code: row.code },
      update: { label: row.label, category: row.category, description: row.description, serviceTags: row.serviceTags, isCore: row.isCore, sortOrder: row.sortOrder, active: true },
      create: { code: row.code, label: row.label, category: row.category, description: row.description, serviceTags: row.serviceTags, isCore: row.isCore, sortOrder: row.sortOrder, active: true },
    })
  }

  // =============================================
  // FOLLOWUP SCHEDULES
  // =============================================
  console.log('  Seeding FollowupSchedule...')
  for (const row of FOLLOWUP_SCHEDULES) {
    await prisma.followupSchedule.upsert({
      where: { code: row.code },
      update: { label: row.label, type: row.type, description: row.description, sortOrder: row.sortOrder, active: true },
      create: { code: row.code, label: row.label, type: row.type, description: row.description, sortOrder: row.sortOrder, active: true },
    })
  }

  console.log('✅ Seed completado:', teacher.name)
  console.log('✅ ParticipantRole:', PARTICIPANT_ROLES.length, 'registros')
  console.log('✅ StrengthItem:', STRENGTH_ITEMS.length, 'registros')
  console.log('✅ LearningProcessItem:', LEARNING_PROCESS_ITEMS.length, 'registros')
  console.log('✅ SpecificLearningDifficulty:', SPECIFIC_LEARNING_DIFFICULTIES.length, 'registros')
  console.log('✅ AssessmentObjective:', seededObjectives, 'registros')
  console.log('✅ BarrierItem:', BARRIER_ITEMS.length, 'registros')
  console.log('✅ ContextDimension:', CONTEXT_DIMENSIONS.length, 'registros')
  console.log('✅ SupportItem:', SUPPORT_ITEMS.length, 'registros')
  console.log('✅ FollowupSchedule:', FOLLOWUP_SCHEDULES.length, 'registros')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
