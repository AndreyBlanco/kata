// lib/mep-data.ts
// Datos de la estructura del MEP (Costa Rica) para autocompletar perfil del docente.
// IMPORTANTE: Datos aproximados generados para el piloto — requieren validación oficial.
// TODO: Reemplazar con el listado oficial del MEP (27 direcciones regionales + circuitos exactos).
// Fuente oficial pendiente: https://www.mep.go.cr (Organización Regional)

// =============================================
// DIRECCIONES REGIONALES Y CIRCUITOS
// Formato circuito: "NN NombreLugar" (ej. "04 Aguas Zarcas")
// =============================================

export interface RegionalDirection {
  name: string
  circuits: string[]
}

export const MEP_REGIONAL_DIRECTIONS: RegionalDirection[] = [
  {
    name: 'Alajuela',
    circuits: [
      '01 Alajuela Centro',
      '02 San Carlos Sur',
      '03 Grecia Norte',
      '04 Grecia Sur',
      '05 Naranjo',
      '06 Zarcero',
      '07 Palmares',
      '08 San Ramón',
      '09 Alfaro Ruiz',
      '10 Valverde Vega',
    ],
  },
  {
    name: 'Alajuela Norte (San Carlos)',
    circuits: [
      '01 Ciudad Quesada',
      '02 Florencia',
      '03 Pital',
      '04 Aguas Zarcas',
      '05 Venecia',
      '06 Los Chiles',
      '07 Guatuso',
      '08 Upala',
      '09 La Fortuna',
      '10 Boca Tapada',
    ],
  },
  {
    name: 'Cartago',
    circuits: [
      '01 Cartago Centro',
      '02 El Guarco',
      '03 Alvarado',
      '04 Oreamuno',
      '05 La Unión',
      '06 Turrialba Norte',
      '07 Turrialba Sur',
      '08 Jiménez',
      '09 Pejibaye',
      '10 Cot',
    ],
  },
  {
    name: 'Central (San José)',
    circuits: [
      '01 San José Centro',
      '02 Montes de Oca',
      '03 Moravia',
      '04 Coronado',
      '05 Goicoechea',
      '06 Vásquez de Coronado',
      '07 Tibás',
      '08 Santo Domingo',
      '09 Santa Bárbara',
      '10 Barva',
    ],
  },
  {
    name: 'Coto (Zona Sur)',
    circuits: [
      '01 Corredores',
      '02 Golfito',
      '03 Osa',
      '04 Buenos Aires',
      '05 Coto Brus',
      '06 Palmar Norte',
      '07 Boruca',
    ],
  },
  {
    name: 'Desamparados',
    circuits: [
      '01 Desamparados Centro',
      '02 Aserrí',
      '03 Acosta',
      '04 Tarrazú',
      '05 Dota',
      '06 León Cortés',
      '07 Puriscal',
      '08 Mora',
      '09 Turrubares',
    ],
  },
  {
    name: 'Gran Área Metropolitana Norte (Heredia)',
    circuits: [
      '01 Heredia Centro',
      '02 San Pablo',
      '03 San Isidro',
      '04 San Rafael',
      '05 Belén',
      '06 Flores',
      '07 Santo Domingo',
      '08 San Joaquín',
    ],
  },
  {
    name: 'Liberia (Guanacaste Norte)',
    circuits: [
      '01 Liberia',
      '02 Santa Cruz Norte',
      '03 Santa Cruz Sur',
      '04 Nicoya Norte',
      '05 Nicoya Sur',
      '06 Hojancha',
      '07 Nandayure',
      '08 Carrillo',
    ],
  },
  {
    name: 'Limón',
    circuits: [
      '01 Limón Centro',
      '02 Pococí Norte',
      '03 Pococí Sur',
      '04 Guácimo',
      '05 Siquirres',
      '06 Matina',
      '07 Talamanca',
      '08 Bataan',
    ],
  },
  {
    name: 'Los Santos',
    circuits: [
      '01 Tarrazú Centro',
      '02 Dota',
      '03 León Cortés',
      '04 Santa Cruz de Puriscal',
    ],
  },
  {
    name: 'Occidente (San Ramón)',
    circuits: [
      '01 San Ramón Centro',
      '02 Alfaro Ruiz',
      '03 Naranjo',
      '04 Palmares',
      '05 Atenas',
      '06 Grecia',
    ],
  },
  {
    name: 'Puntarenas',
    circuits: [
      '01 Puntarenas Centro',
      '02 Esparza',
      '03 Montes de Oro',
      '04 Miramar',
      '05 Jicaral',
      '06 Paquera',
      '07 Cóbano',
      '08 Lepanto',
    ],
  },
  {
    name: 'Sarapiquí',
    circuits: [
      '01 Puerto Viejo',
      '02 La Virgen',
      '03 Horquetas',
      '04 Chilamate',
      '05 Las Horquetas',
    ],
  },
  {
    name: 'San José Norte',
    circuits: [
      '01 Guadalupe',
      '02 Goicoechea Norte',
      '03 Moravia Norte',
      '04 Coronado Norte',
      '05 Vásquez de Coronado Norte',
    ],
  },
  {
    name: 'San José Oeste',
    circuits: [
      '01 Escazú',
      '02 Santa Ana',
      '03 Mora',
      '04 Ciudad Colón',
    ],
  },
  {
    name: 'Sulá (Zona Atlántica Sur)',
    circuits: [
      '01 Bataan Sur',
      '02 Matina Sur',
      '03 Siquirres Sur',
    ],
  },
  {
    name: 'Turrialba',
    circuits: [
      '01 Turrialba Centro',
      '02 Pejibaye Sur',
      '03 Jiménez',
      '04 Chirripó',
    ],
  },
  {
    name: 'Upala (Zona Norte)',
    circuits: [
      '01 Upala',
      '02 Bijagua',
      '03 Aguas Claras',
    ],
  },
]

// Lista plana de todos los circuitos para el combobox
export const ALL_CIRCUITS: string[] = MEP_REGIONAL_DIRECTIONS.flatMap(
  (region) => region.circuits
).sort((a, b) => a.localeCompare(b, 'es'))

// Mapeo circuito → dirección regional (para mostrar contexto)
export const CIRCUIT_TO_REGION: Record<string, string> = {}
for (const region of MEP_REGIONAL_DIRECTIONS) {
  for (const circuit of region.circuits) {
    CIRCUIT_TO_REGION[circuit] = region.name
  }
}

// =============================================
// ESPECIALIDADES DEL SERVICIO DE APOYO
// =============================================
export const MEP_SPECIALTIES = [
  { value: 'Problemas de Aprendizaje', label: 'Problemas de Aprendizaje (PA)' },
  { value: 'Problemas Emocionales y de Conducta', label: 'Problemas Emocionales y de Conducta (PEC)' },
  { value: 'Discapacidad Visual', label: 'Discapacidad Visual (DV)' },
  { value: 'Discapacidad Auditiva', label: 'Discapacidad Auditiva (DA)' },
  { value: 'Retardo Mental', label: 'Discapacidad Intelectual (RM)' },
  { value: 'Discapacidad Múltiple', label: 'Discapacidad Múltiple (DM)' },
  { value: 'Trastorno del Espectro Autista', label: 'Trastorno del Espectro Autista (TEA)' },
  { value: 'Aula Integrada', label: 'Aula Integrada' },
  { value: 'Aula Recurso', label: 'Aula Recurso' },
] as const

export type MepSpecialty = typeof MEP_SPECIALTIES[number]['value']
