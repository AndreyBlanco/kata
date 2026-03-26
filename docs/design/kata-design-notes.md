# Katà — Notas de diseño y continuidad del proyecto

> Última actualización: 26 marzo 2026 (sesión 10)  
> Propósito: documento de continuidad para retomar el diseño en conversaciones futuras con el agente de desarrollo.

---

## 1. Descripción general del proyecto

**Katà** es una herramienta para docentes de servicios de apoyo educativo del MEP (Costa Rica), orientada a simplificar la generación de informes de periodo y la documentación pedagógica oficial.

- **Stack**: Next.js 16 (App Router) + React 19 + TypeScript.
- **Base de datos**: PostgreSQL vía Prisma (ORM).
- **Auth**: NextAuth v4 con CredentialsProvider (bcryptjs), JWT; `teacherId` en el token.
- **UI**: Tailwind CSS v4. Diseño mobile-first (max-w-lg / max-w-2xl).
- **Exportación**: librería `docx` para exportar Word. Lógica en `lib/word-export.ts` + `lib/report-engine.ts`.
- **Deploy**: Vercel (rama `main` del repo `AndreyBlanco/kata` en GitHub).
- **Base de datos en producción**: Prisma Postgres (db.prisma.io).

---

## 2. Flujo principal de la app (V0.9)

```
Login (/login)
  → Dashboard (/)
  → /estudiantes          — lista de estudiantes del docente
  → /estudiantes/nuevo    — crear estudiante
  → /estudiantes/[id]     — perfil (wizard de 5 pasos):
      1. Valoración Integral  (/valoracion)
      2. Plan de Apoyo         (/plan)
      3. Objetivos             (/objetivos)
      4. Sesiones del periodo  (/sesiones)
      5. Informe               → /informes/[studentId]
  → /sesiones             — vista global de sesiones
  → /informes             — vista global de informes
```

Cada módulo se alimenta del anterior:
- Valoración → fortalezas y apoyos → Plan de Apoyo.
- Plan (dificultades + procesos) → sugerencias de objetivos.
- Objetivos + sesiones registradas → informe narrativo automático (lib/report-engine.ts).

---

## 3. Modelo de datos actual (Prisma)

### Entidades principales
- **Teacher**: docente autenticado. Campos: email, passwordHash, name, centerName, circuit, specialty.
- **Student**: studentId, name, birthDate, grade, cedula?, medicalDiagnosis?, classroomTeacherName?, guardianName?, guardianPhone?, teacherId.
- **IntegralAssessment** (1-1 con Student):
  - `status: String @default("active")` — `"active"` | `"completed"`.
  - `requiresSupport: Boolean?` — `null`=pendiente | `true` | `false`.
  - elaborationDate, bsaReceivedDate.
  - participants: String[].
  - classroomContext, institutionalContext, familyContext.
  - strengths, `strengthCodes: String[]`.
  - barriers, `barrierCodes: String[]`.
  - curricularPerformance (legacy), instruments: String[], integralAnalysis.
  - requiredSupports, `supportCodes: String[]`.
  - agreements, followUp, `followupCodes: String[]`.
- **StudentSupportPlan** (1-1 con Student):
  - activeDifficulties: String[], priorityProcesses: String[], executiveSubprocesses: String[].
  - strengths, mediationStrategies, homeStrategies, specificStrategies.
- **SupportObjective**: teacherId, studentIds: String[], macroArea, subArea, specificGoal, frequencyPerWeek, duration, interventionType (enum: aula/personalizada/ambas), linkedProcesses: String[], linkedDifficulties: String[], active.
- **GeneratedSession**: studentId, supportObjectiveId, month, weekNumber, plannedType (enum), duration, executedDate?, attendance?, outcome?, supportLevel?, observationTags: String[], freeText?, isExtraordinary.

### Bibliotecas implementadas en BD
- **ParticipantRole** (migración `20260325013732_add_participant_role_catalog`):
  - id, code (unique), label, category, isCore, sortOrder, active, createdAt, updatedAt.
  - Índices: category, active.
  - 13 registros sembrados (ver sección 7).

- **StrengthItem** (migración `20260325020540_add_strength_learning_difficulty_catalogs`):
  - id, code (unique), label, category, description, examples, serviceTags[], isCore, sortOrder, active.
  - Categorías: `academica` | `cognitiva` | `socioemocional` | `interes` | `recurso_familia` | `recurso_escolar`.
  - 40 registros sembrados (ver sección 7).

- **LearningProcessItem** (misma migración):
  - id, code (unique), label, category, parentCode, description, examples, serviceTags[], isCore, sortOrder, active.
  - Categorías: `proceso` (6 ítems) | `funcion_ejecutiva` (5 subprocesos de FE).
  - parentCode vincula los subprocesos de FE a `PROC_FUNCIONES_EJECUTIVAS`.
  - 11 registros sembrados (ver sección 7).

- **SpecificLearningDifficulty** (misma migración):
  - id, code (unique), label, category, description, examples, serviceTags[], isCore, sortOrder, active.
  - Categoría actual: `especifica` (migra DIFFICULTIES_CATALOG del código).
  - 8 registros sembrados: Dislexia, Disortografía, Disgrafía, Discalculia, Dispraxia, TDA, Aprendizaje lento, TANV.

- **AssessmentObjective** (migración `20260325172416_add_assessment_objectives_and_results`):
  - id, code (unique, ej: "DISGRAFIA.A.B.1"), difficulty, difficultyLabel, areaCode, areaLabel, level (B/1/2/3/S), levelLabel, levelType (checkbox/scale), levelSort, itemOrder, description, active.
  - **899 objetivos** totales en BD: 664 extraídos de `miscelaneos/objetivos.docx` + 239 creados para TDA/APZ_LENTO/TANV.
  - 8 dificultades: DISGRAFIA (106), DISORTOGRAFIA (118), DISPRAXIA (111), DISCALCULIA (171), DISLEXIA (158), TDA (77), APZ_LENTO (72), TANV (90).
  - Datos en: `prisma/assessment-objectives-data.ts` + `prisma/assessment-objectives-new.ts` (NO editar manualmente).

- **StudentAssessmentResult** (misma migración):
  - id, studentId, objectiveId, result (enum: yes/no/withSupport), scaleValue? (1-5 para nivel S), notes?, assessedAt.
  - Unique constraint: (studentId, objectiveId) — un resultado por objetivo por estudiante (sobreescribe).
  - Índices: studentId, objectiveId, (studentId, result).

- **BarrierItem** (migración `20260325175151_add_catalogs_barriers_supports_followup_curricular`):
  - id, code (unique), label, category, description, serviceTags[], isCore, sortOrder, active.
  - Categorías: `contexto_aula` | `contexto_institucional` | `contexto_familiar` | `curriculo` | `metodologia` | `evaluacion` | `organizacion` | `actitudinal`.
  - **36 registros** sembrados. Fuente: Líneas de Acción MEP 2023. Datos en `prisma/catalogs-data.ts`.

- **ContextDimension** (misma migración):
  - id, code (unique), label, dimension, description, guideText (texto orientador para el wizard), sortOrder, active.
  - Dimensiones: `aula` | `institucional` | `familiar`.
  - **17 registros** sembrados (7 aula + 5 institucional + 5 familiar). Datos en `prisma/catalogs-data.ts`.

- **SupportItem** (misma migración):
  - id, code (unique), label, category, description, serviceTags[], isCore, sortOrder, active.
  - Categorías: `personal` | `curricular` | `metodologico` | `evaluativo` | `organizativo` | `material_tecnologico`.
  - **37 registros** sembrados. Fuente: Líneas de Acción MEP 2023, Cuaderno N°4. Datos en `prisma/catalogs-data.ts`.

- **FollowupSchedule** (misma migración):
  - id, code (unique), label, type, description, sortOrder, active.
  - Tipos: `periodicidad` | `modalidad` | `responsable`.
  - **14 registros** sembrados. Fuente: Cuaderno N°4, Proceso 3. Datos en `prisma/catalogs-data.ts`.

- **CurricularSubjectEntry** (misma migración):
  - id, assessmentId, subject, goalsToAchieve, progress, supportNeeds, sortOrder.
  - Relación: muchos → `IntegralAssessment`.
  - Tabla estructurada para la sección 6 del Informe 2026 (antes texto libre `curricularPerformance`).
  - El campo legado `curricularPerformance` en `IntegralAssessment` se mantiene como compatibilidad hacia atrás.

---

## 4. APIs existentes

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET/POST | /api/students | Listar / crear estudiantes |
| GET/PUT/DELETE | /api/students/[id] | Obtener / editar / eliminar estudiante |
| GET/PUT | /api/assessments/[studentId] | Valoración integral |
| GET/PUT | /api/support-plans/[studentId] | Plan de apoyo |
| GET/POST | /api/objectives | Listar / crear objetivos |
| GET/PUT/DELETE | /api/objectives/[id] | Gestionar objetivo individual |
| GET | /api/sessions | Listar sesiones (filtros: studentId, month, pending) |
| PUT | /api/sessions/[id] | Actualizar sesión individual |
| POST | /api/sessions/generate | Generar sesiones del mes para un objetivo |
| GET | /api/reports/[studentId] | JSON del informe generado |
| GET | /api/reports/export/[studentId] | Exportar informe en Word (.docx) |
| GET/POST/PUT | /api/auth/[...nextauth] | NextAuth |
| GET | /api/catalogs/participant-roles | Roles de participantes |
| GET | /api/catalogs/strength-items | Fortalezas, intereses y recursos |
| GET | /api/catalogs/learning-processes | Procesos implicados en el aprendizaje |
| GET | /api/catalogs/learning-difficulties | Dificultades específicas del aprendizaje |
| GET | /api/catalogs/assessment-objectives | Objetivos de valoración por dificultad (664 ítems) |
| GET | /api/assessments/[studentId]/results | Resultados de valoración del estudiante |
| POST | /api/assessments/[studentId]/results | Guardar/actualizar lote de resultados (upsert) |
| GET | /api/catalogs/barriers | Barreras para el aprendizaje y la participación (sección 5) |
| GET | /api/catalogs/context-dimensions | Dimensiones/indicadores de contexto educativo (sección 3) |
| GET | /api/catalogs/support-items | Apoyos educativos requeridos (sección 9) |
| GET | /api/catalogs/followup-schedules | Opciones de seguimiento y revisión (sección 11) |
| GET | /api/assessments/[studentId]/curricular-subjects | Tabla de desempeño curricular por asignatura (sección 6) |
| PUT | /api/assessments/[studentId]/curricular-subjects | Reemplazar tabla curricular completa |
| GET | /api/assessments/[studentId]/export | Descargar Informe de Valoración Integral como `.docx` |
| PATCH | /api/assessments/[studentId]/status | Cambiar estado del expediente (`status`, `requiresSupport`) |
| DELETE | /api/assessments/[studentId]/results | Eliminar resultado individual (`?objectiveId=XXX`) |
| GET | /api/assessments | Listar todos los expedientes del docente con progreso calculado |
| POST | /api/support-plans/[studentId]/generate | Generar borrador del Plan de Apoyo (no guarda; retorna draft) |
| GET | /api/support-plans/[studentId]/export | Descargar Plan de Apoyo como `.docx` |

### Parámetros comunes de los endpoints de catálogo
- `?category=<valor>` → filtra por categoría.
- `?coreOnly=true` → solo ítems isCore=true.
- `?serviceTag=PA` → filtra por tag de servicio (PA, PEC, DV, RM, DM).
- `?grouped=true` → (participant-roles, strength-items) respuesta agrupada por categoría.
- `?withChildren=true` → (learning-processes) árbol con subprocesos de FE anidados.
- `?parentCode=PROC_FUNCIONES_EJECUTIVAS` → (learning-processes) subprocesos de un proceso.

### /api/catalogs/assessment-objectives — query params
- `?difficulty=DISGRAFIA` → objetivos de una dificultad (DISGRAFIA / DISORTOGRAFIA / DISPRAXIA / DISCALCULIA / DISLEXIA).
- `?areaCode=A` → filtra por área dentro de la dificultad.
- `?level=B` → filtra por nivel (B / 1 / 2 / 3 / S).
- `?levelType=checkbox` → solo ítems con evaluación SÍ/NO/SÍ con apoyo; `scale` = seguimiento emocional.
- `?grouped=areas` → árbol jerárquico: difficulty → areas → levels → items.
- `?grouped=difficulties` → lista de dificultades disponibles.

### /api/assessments/[studentId]/results — query params GET
- `?difficulty=DISGRAFIA` → solo resultados de esa dificultad.
- `?withObjective=true` → incluye metadatos completos del objetivo en cada resultado.

---

## 5. Catálogos existentes en código (lib/catalogs.ts)

> Estos catálogos aún están en código (arrays estáticos). El plan es migrarlos progresivamente a tablas en BD para que sean administrables sin tocar código.

- **DIFFICULTIES_CATALOG**: Dislexia, Disortografía, Disgrafía, Discalculia, Dispraxia, TDA, Aprendizaje lento, Aprendizaje no verbal.
- **PROCESSES_CATALOG**: Percepción, Atención, Emoción, Motivación, Memoria, Funciones ejecutivas.
- **EXECUTIVE_FUNCTIONS_SUBPROCESSES**: Planificación, Organización, Flexibilidad, Autorregulación, Automonitoreo.
- **INSTRUMENTS_CATALOG**: 9 instrumentos base (Observación en aula, Entrevista a familia, etc.).
- **OBJECTIVES_CATALOG**: 72 objetivos fijos organizados en 11 macroáreas (CTX, GRA, MOT, VIS, AUD, ESP, TMP, MAD, LEC, ORT, MAT).
- **MACRO_AREAS**: 11 macroáreas.

---

## 6. Marco normativo de referencia (documentos leídos)

Todos los PDFs están en `miscelaneos/`:

| Archivo | Contenido clave |
|---------|----------------|
| `Anexo 1 Líneas de acción versión final 2023.pdf` | Marco rector general. 3 procesos: Identificación → Implementación → Reflexión. Énfasis en trabajo colaborativo, barreras del contexto (no déficits individuales), Plan de Acción Anual. |
| `Anexo 5 Cuaderno N4 Problemas de Aprendizaje 2023.pdf` | **Marco principal de Katà v0.9**. Población meta: dificultades específicas del aprendizaje (dislexia, discalculia, disgrafía, disortografía, dispraxia, TANV, aprendizaje lento) + dificultades en procesos implicados (atención, emoción, motivación, percepción, memoria, funciones ejecutivas). Plan de Apoyo personalizado por estudiante con 4 columnas: fortalezas, estrategias mediación, casa, específicas. Ruta de prestación del servicio. Prácticas por abandonar/implementar. Estrategias sugeridas por tipo de dificultad (tablas de identificación + aula + personalizado). |
| `Anexo 3 Cuaderno N2 PEC 2023.pdf` | Servicios PEC. Modelo Apoyo Conductual Positivo. Evaluación Funcional (conductas, antecedentes, variables, hipótesis de función). Plan de Apoyo Conductual (4 estrategias: antecedentes/variables, estilo de vida, nuevas habilidades —sustitutivas y afrontamiento—, consecuencias). Seguimiento continuo. |
| `Anexo 4 Cuaderno N3 Discapacidad Visual.pdf` | 3 áreas: Vida Cotidiana, Movilidad, Acceso a la Información. Énfasis en autonomía e independencia en entornos reales. Valoración integral como base de apoyos. |
| `FE ERRATAS Cuaderno N4 DVM-AC-CIR-0008-02-2023.pdf` | Correcciones al Cuaderno N°4: aclaración de población meta (2 grupos: dificultades específicas + procesos implicados; ambos requieren plan de apoyo), corrección de planificación mensual (no semanal/quincenal), y otras fe de erratas menores. |

### Servicios de apoyo contemplados en Katà

| Servicio | Versión | Estado |
|----------|---------|--------|
| Problemas de Aprendizaje (PA) | V0.9 actual | **Implementado** |
| Problemas Emocionales y de Conducta (PEC) | futuro | diseñado conceptualmente |
| Discapacidad Visual (DV) | futuro | diseñado conceptualmente |
| Retardo Mental (RM) | futuro | contemplado en catálogos |
| Discapacidad Múltiple (DM) | futuro | contemplado en catálogos |

---

## 7. Biblioteca ParticipantRole (primera implementada en BD)

13 roles sembrados con `npx prisma db seed`:

| code | label | category | isCore | sortOrder |
|------|-------|----------|--------|-----------|
| DOCENTE_GUIA | Docente guía | docente | true | 10 |
| APOYO_PA | Docente de apoyo — Problemas de Aprendizaje | servicio_apoyo | true | 20 |
| APOYO_PEC | Docente de apoyo — Problemas Emocionales y de Conducta | servicio_apoyo | true | 30 |
| APOYO_DV | Docente de apoyo — Discapacidad Visual | servicio_apoyo | true | 40 |
| APOYO_RM | Docente de apoyo — Retardo Mental | servicio_apoyo | true | 50 |
| APOYO_DM | Docente de apoyo — Discapacidad Múltiple | servicio_apoyo | true | 60 |
| DIRECCION | Dirección del centro educativo | institucional | true | 70 |
| FAMILIA_ENCARGADO | Madre / Padre / Encargado(a) | familia | true | 80 |
| ESTUDIANTE | Persona estudiante | estudiante | true | 90 |
| PSICOLOGIA_ORIENTACION | Psicología / Orientación | salud_apoyo | false | 100 |
| TRABAJO_SOCIAL | Trabajo social | salud_apoyo | false | 110 |
| SALUD_OTRO | Otro profesional de salud | salud_apoyo | false | 120 |
| OTRO | Otro | otro | false | 200 |

Seed usa `upsert` por `code` → idempotente.

---

## 8. Diseño de la valoración integral guiada (wizard)

### Objetivo
Reemplazar el formulario de texto libre actual (`/estudiantes/[id]/valoracion`) por un **wizard guiado por secciones** con ítems de tipo checklist/escala/tag-selector que:
- Genera automáticamente los textos de la Valoración Integral 2026.
- Alimenta directamente el Plan de Apoyo (4 columnas).
- Provee insumos para el motor de informes (`lib/report-engine.ts`).

### Tipos de ítem base para el wizard

| Tipo | Uso |
|------|-----|
| `single_choice` | radio, una opción |
| `multi_choice` | checkboxes |
| `likert` | escala 1–4 con etiquetas |
| `short_text` | respuesta corta (con autocompletar) |
| `long_text` | texto abierto |
| `tag_selector` | chips seleccionables + crear nuevo |
| `numeric` | para rangos / % (futuro) |

Cada ítem tiene: `id`, `sectionId`, `order`, `label`, `description`, `helpText`, `options[]`, `required`, `mapsTo` (campo de salida destino).

### Secciones del wizard y bibliotecas asociadas

| # | Sección | Biblioteca BD | Tipo ítem principal | Salida → campo(s) |
|---|---------|---------------|---------------------|-------------------|
| 1 | Datos generales | INSTITUTIONAL_SUGGESTIONS | short_text + autocompletar | elaborationDate, bsaReceivedDate |
| 2 | Participantes | **ParticipantRole** ✅ | tag_selector | participants[], participación estudiante |
| 3 | Contexto / barreras | CONTEXT_DIMENSIONS + BARRIER_ITEMS | likert + multi_choice | classroomContext, institutionalContext, familyContext, barriers |
| 4 | Fortalezas | STRENGTH_ITEMS | tag_selector + long_text | strengths (VI) + Plan.strengths |
| 5a | Procesos implicados | LEARNING_PROCESS_ITEMS | likert + short_text | Plan.priorityProcesses, Plan.executiveSubprocesses |
| 5b | Dificultades específicas | SPECIFIC_LEARNING_DIFFICULTIES | multi_choice | Plan.activeDifficulties, curricularPerformance |
| 6 | Instrumentos | INSTRUMENTS_CATALOG (BD) | tag_selector + short_text | instruments[] |
| 7 | Análisis integral | (derivado de secciones anteriores + 1-2 long_text) | long_text | integralAnalysis |
| 8a | Apoyos requeridos | SUPPORT_ITEMS | multi_choice | requiredSupports, Plan.mediationStrategies / homeStrategies / specificStrategies |
| 8b | Acuerdos | — | long_text | agreements |
| 8c | Seguimiento | FOLLOWUP_SCHEDULES | single_choice + short_text | followUp |

---

## 9. Bibliotecas pendientes de implementar (en orden sugerido)

### Orden priorizado

1. ~~**STRENGTH_ITEMS**~~ ✅ **Implementada** — 40 registros en BD, endpoint `/api/catalogs/strength-items`.
2. ~~**LEARNING_PROCESS_ITEMS**~~ ✅ **Implementada** — 11 registros (6 procesos + 5 FE), endpoint `/api/catalogs/learning-processes`.
3. ~~**SPECIFIC_LEARNING_DIFFICULTIES**~~ ✅ **Implementada** — 8 registros, endpoint `/api/catalogs/learning-difficulties`.
4. **BARRIER_ITEMS + CONTEXT_DIMENSIONS** — Barreras y contexto.
5. **INSTRUMENTS_CATALOG** (migrar a BD con flujo de aprobación) — Instrumentos + los del docente.
6. **SUPPORT_ITEMS** — Apoyos educativos requeridos.
7. **FOLLOWUP_SCHEDULES** — Opciones de seguimiento.
8. **INSTITUTIONAL_SUGGESTIONS** — Historial de autocompletar por docente.

### Estructura modelo para cada biblioteca (patrón)

```prisma
model NombreBiblioteca {
  id          String   @id @default(cuid())
  code        String   @unique          // para upserts idempotentes
  label       String
  category    String?                   // agrupación interna
  description String?                   // hint en UI
  examples    String?                   // casos concretos (del cuaderno)
  serviceTags String[]                  // PA, PEC, DV, RM, DM
  isCore      Boolean  @default(false)  // aparece primero
  sortOrder   Int      @default(0)
  active      Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([active])
  @@index([category])
}
```

---

## 10. Decisiones de arquitectura acordadas

### Bibliotecas administrables sin tocar código
- Catálogos → tablas en BD (no arrays en código).
- Admin UI futura o edición vía Prisma Studio / scripts de seed para actualizar.
- `INSTRUMENTS_CATALOG`: flujo especial con `status` (approved / pendingApproval / rejected) y campo `createdBy` para que docentes propongan sus instrumentos.

### Autocompletar institucional
- Tabla `INSTITUTIONAL_SUGGESTIONS` (por `teacherId` + `type` + `value`).
- Se puebla automáticamente al guardar valoraciones.
- Campos: centerName, circuit, gradeLabel, classroomTeacherName, etc.
- Ordenado por `usageCount` + `lastUsedAt`.
- No conectado a SIGMEP aún (ver sección 11).

### Seguridad
- Todas las APIs validan `teacherId` desde JWT.
- Datos de un docente nunca accesibles para otro.

### Motor de informes
- `lib/report-engine.ts` genera narrativas automáticas basadas en sesiones + plan.
- `lib/report-engine.ts` fue adaptado en esta sesión: `student.age` → `calculateAge(student.birthDate)`, `buildAnnualFramework` y `buildRecommendations` adaptados al modelo actual de `StudentSupportPlan`.

---

## 11. Integración SIGMEP (pendiente / condicional)

- SIGMEP ([sigmep.maps.arcgis.com](https://sigmep.maps.arcgis.com)) es el GIS del MEP con datos de centros educativos y circuitos.
- **No hay API pública documentada accesible** para Katà.
- **Decisión tomada**: diseñar campos institucionales preparados para recibir datos de SIGMEP u otro SIGED en el futuro (API REST o importación CSV), pero **usar autocompletar desde historial** del docente por ahora.
- Integración real queda sujeta a que MEP habilite acceso.

---

## 12. Lo que pide el Informe de Valoración Integral 2026 que NO se puede derivar automáticamente

Estos campos deben ser **inputs manuales** en el wizard (o "recordatorios") — no se pueden inferir de los anexos:

1. **Diagnósticos médicos/clínicos específicos** (oftalmología, salud mental, neurodesarrollo).
2. **Códigos oficiales** (código MEP del centro, matrícula, número de resolución de rangos).
3. **Firmas, sellos y referencias formales** (oficios, acuerdos del CSE).
4. **Resultados de pruebas psicométricas estandarizadas** (nombre del test + resultado numérico).
5. **Decisión formal de ingreso/egreso del servicio** (Katà puede sugerir, pero no decidir).

---

## 13. Ajustes técnicos por sesión

### Sesión 1 (24 mar 2026)

| Archivo | Cambio |
|---------|--------|
| `app/(dashboard)/page.tsx` | Estaba vacío → componente genérico válido |
| `app/(dashboard)/objetivos/page.tsx` | Estaba vacío → componente genérico válido |
| `app/(dashboard)/layout.tsx` | Estaba vacío → layout genérico válido |
| `app/sesiones/page.tsx` | Estaba vacío → componente genérico válido |
| `app/sesiones/registrar/page.tsx` | `useSearchParams` envuelto en `<Suspense>` (requerido Next 16) |
| `app/estudiantes/[id]/page.tsx` | `StudentData` type: agregado `birthDate: string` |
| `lib/report-engine.ts` | `student.age` → `calculateAge(student.birthDate)` + import utils; `buildAnnualFramework` adaptado a campos reales de `StudentSupportPlan`; `buildRecommendations` adaptado |
| `prisma.config.ts` | `DATABASE_URL` con `!` para evitar `string | undefined` |
| `prisma/schema.prisma` | Nuevo modelo `ParticipantRole` |
| `prisma/seed.ts` | Seed de `ParticipantRole` con 13 roles (upsert por code) |
| `app/api/catalogs/participant-roles/route.ts` | **Nuevo endpoint** GET con filtros category, coreOnly, grouped |

### Sesión 2 (25 mar 2026)

| Archivo | Cambio |
|---------|--------|
| `prisma/schema.prisma` | Nuevos modelos: `StrengthItem`, `LearningProcessItem`, `SpecificLearningDifficulty` |
| `prisma/migrations/20260325020540_*` | Migración aplicada en BD local y producción |
| `prisma/seed.ts` | Seed ampliado: 40 StrengthItem + 11 LearningProcessItem + 8 SpecificLearningDifficulty |
| `app/api/catalogs/strength-items/route.ts` | **Nuevo endpoint** GET con filtros category, coreOnly, serviceTag, grouped |
| `app/api/catalogs/learning-processes/route.ts` | **Nuevo endpoint** GET con filtros category, parentCode, coreOnly, serviceTag, withChildren |
| `app/api/catalogs/learning-difficulties/route.ts` | **Nuevo endpoint** GET con filtros category, coreOnly, serviceTag |
| `docs/design/kata-design-notes.md` | Actualizado: secciones 3, 4, 7, 9, 13, 15 |

### Sesión 3 (25 mar 2026)

| Archivo | Cambio |
|---------|--------|
| `miscelaneos/objetivos.docx` + carpeta | **Fuente**: herramienta de valoración por objetivos (5 dificultades) |
| `miscelaneos/gen_seed.py` | Script Python que extrae 664 objetivos del Word → `assessment-objectives-data.ts` |
| `miscelaneos/objetivos_extraidos.json` | JSON intermedio de verificación (auto-generado, no versionado) |
| `prisma/assessment-objectives-data.ts` | 664 objetivos de valoración en TypeScript (auto-generado, incluye plantilla para TDA/APZ_LENTO/TANV) |
| `prisma/schema.prisma` | Nuevos modelos: `AssessmentObjective`, `StudentAssessmentResult`, enum `AssessmentResultValue` |
| `prisma/migrations/20260325172416_*` | Migración aplicada |
| `prisma/seed.ts` | Seed ampliado: 664 AssessmentObjective (lotes de 50) |
| `app/api/catalogs/assessment-objectives/route.ts` | **Nuevo endpoint** GET con filtros difficulty, areaCode, level, levelType, grouped=areas/difficulties |
| `app/api/assessments/[studentId]/results/route.ts` | **Nuevos endpoints** GET (con filtros) + POST (upsert de lote) |
| `docs/design/kata-design-notes.md` | Actualizado: secciones 3, 4, 13, 15; añadida sección 16 |

---
### Sesión 4 (25 mar 2026)

| Archivo | Cambio |
|---------|--------|
| `miscelaneos/Anexo 1...pdf` | **Leído**: Líneas de Acción MEP 2023 — tipos de barreras, clasificación de apoyos educativos. |
| `miscelaneos/Anexo 5 Cuaderno N4...pdf` | **Leído**: estrategias por dificultad, Plan de Apoyo 4 columnas, ruta del servicio. |
| `prisma/schema.prisma` | Nuevos modelos: `BarrierItem`, `ContextDimension`, `SupportItem`, `FollowupSchedule`, `CurricularSubjectEntry`. Relación `curricularSubjects` añadida a `IntegralAssessment`. |
| `prisma/migrations/20260325175151_*` | Migración aplicada. |
| `prisma/catalogs-data.ts` | **Nuevo archivo**: 36 BarrierItem + 17 ContextDimension + 37 SupportItem + 14 FollowupSchedule con fundamento en documentos oficiales. |
| `prisma/seed.ts` | Seed ampliado: upsert de los 4 nuevos catálogos. |
| `app/api/catalogs/barriers/route.ts` | **Nuevo endpoint** GET (filtros: category, coreOnly, serviceTag, grouped). |
| `app/api/catalogs/context-dimensions/route.ts` | **Nuevo endpoint** GET (filtros: dimension, grouped). |
| `app/api/catalogs/support-items/route.ts` | **Nuevo endpoint** GET (filtros: category, coreOnly, serviceTag, grouped). |
| `app/api/catalogs/followup-schedules/route.ts` | **Nuevo endpoint** GET (filtros: type, grouped). |
| `app/api/assessments/[studentId]/curricular-subjects/route.ts` | **Nuevos endpoints** GET + PUT (reemplazo total de la tabla de sección 6). |
| `docs/design/kata-design-notes.md` | Actualizado: secciones 3, 4, 9, 13, 15. |
---
### Sesión 5 (25 mar 2026)

| Archivo | Cambio |
|---------|--------|
| `lib/valoracion-export.ts` | **Nuevo**: motor de exportación del Informe de Valoración Integral 2026 en `.docx`. Genera las 11 secciones oficiales + firmas usando la librería `docx`. Colores, fuentes y márgenes del template oficial MEP. |
| `app/api/assessments/[studentId]/export/route.ts` | **Nuevo endpoint** `GET` que carga todos los datos del estudiante + valoración + tabla curricular y devuelve el archivo `.docx` como descarga. |
| `docs/design/kata-design-notes.md` | Actualizado: secciones 4, 15 (Brecha 3 completada). |
---

## 14. Estado del deploy y entorno

- **Producción**: `https://kata-lyart.vercel.app`
- **Variables de entorno requeridas en Vercel**:
  - `DATABASE_URL` — Prisma Postgres en producción.
  - `NEXTAUTH_URL` — `https://kata-lyart.vercel.app` (¡sin barra final, con https://).
  - `NEXTAUTH_SECRET` — string aleatorio seguro (≥32 chars).
- **Build command sugerido para producción**: `npx prisma migrate deploy && next build`.
- **Seed en producción**: ejecutar localmente con `DATABASE_URL` de producción → `npx prisma db seed`.
- **Usuario semilla**: `docente@kata.cr` / `kata2026`.

---

## 15. Próximos pasos (en orden)

### Sesiones 2 y 3 — completado (25 mar 2026)
- ✅ Modelo + seed + endpoint `/api/catalogs/strength-items` (40 ítems).
- ✅ Modelo + seed + endpoint `/api/catalogs/learning-processes` (6 procesos + 5 FE).
- ✅ Modelo + seed + endpoint `/api/catalogs/learning-difficulties` (8 dificultades).
- ✅ Modelo `AssessmentObjective` + 664 objetivos extraídos de `objetivos.docx` (5 dificultades) + endpoint `/api/catalogs/assessment-objectives`.
- ✅ Modelo `StudentAssessmentResult` + endpoints GET/POST `/api/assessments/[studentId]/results`.

### Sesión 4 — completado (25 mar 2026)
- ✅ Revisión de Líneas de Acción MEP 2023 (Anexo 1) y Cuaderno N°4 para contextualizar catálogos.
- ✅ Modelos `BarrierItem`, `ContextDimension`, `SupportItem`, `FollowupSchedule`, `CurricularSubjectEntry` en schema.prisma.
- ✅ Migración `20260325175151_add_catalogs_barriers_supports_followup_curricular` aplicada.
- ✅ 36 BarrierItem + 17 ContextDimension + 37 SupportItem + 14 FollowupSchedule sembrados (`prisma/catalogs-data.ts`).
- ✅ Endpoint `GET /api/catalogs/barriers` (filtros: category, coreOnly, serviceTag, grouped).
- ✅ Endpoint `GET /api/catalogs/context-dimensions` (filtros: dimension, grouped).
- ✅ Endpoint `GET /api/catalogs/support-items` (filtros: category, coreOnly, serviceTag, grouped).
- ✅ Endpoint `GET /api/catalogs/followup-schedules` (filtros: type, grouped).
- ✅ Endpoints `GET/PUT /api/assessments/[studentId]/curricular-subjects` (sección 6 tabla estructurada).

### Sesión 5 — completado (25 mar 2026)
- ✅ `lib/valoracion-export.ts` — motor de exportación `.docx` del Informe de Valoración Integral 2026 (11 secciones + firmas, colores y márgenes del template oficial).
- ✅ `GET /api/assessments/[studentId]/export` — endpoint de descarga que ensambla todos los datos y devuelve el archivo.

### Sesión 6 — completado (25 mar 2026)
- ✅ Revisión de estructura del Plan de Apoyo (págs. 56-58 del Cuaderno N°4): encabezado + tabla 4 columnas.
- ✅ `lib/support-plan-generator.ts` — generador de borrador del Plan de Apoyo:
  - Carga `IntegralAssessment.strengths` → Columna 1 (fortalezas).
  - Carga `StudentAssessmentResult` con `result = no | withSupport`, agrupa por dificultad y área.
  - Aplica plantillas oficiales de estrategias (Cuaderno N°4) por dificultad (`DISLEXIA`, `DISGRAFIA`, `DISORTOGRAFIA`, `DISCALCULIA`, `DISPRAXIA`) → Columnas 2, 3 y 4.
  - Deriva `activeDifficulties` y `priorityProcesses` desde los resultados fallidos.
  - Retorna `SupportPlanDraft` con metadata (`_meta`) para la UI.
- ✅ `POST /api/support-plans/[studentId]/generate` — endpoint que llama al generador y retorna el borrador **sin guardar**. El docente lo edita y confirma con `PUT /api/support-plans/[studentId]`.

### Sesión 7 — completado (25 mar 2026)
- ✅ Diseño del Expediente de Valoración (no lineal, multi-semana, reversible).
- ✅ Migración `20260325192028_add_assessment_status_and_catalog_codes`: agrega `status`, `requiresSupport`, `strengthCodes[]`, `barrierCodes[]`, `supportCodes[]`, `followupCodes[]` a `IntegralAssessment`.
- ✅ `PUT /api/assessments/[studentId]` actualizado con los nuevos campos de códigos de catálogo.
- ✅ `PATCH /api/assessments/[studentId]/status` — endpoint para cambiar `status` (`active`/`completed`) y `requiresSupport` (`boolean | null`) de forma independiente al contenido.

### Sesión 8 — completado (25 mar 2026) — **Brecha 5 ✅**
- ✅ **Fase 1+2** — `app/estudiantes/[id]/valoracion/page.tsx` reescrito:
  - Header sticky con badge de estado (En proceso / Completada) + contador X/11 secciones.
  - Botón "Finalizar valoración" + `ConfirmModal` (guarda cambios pendientes antes de cerrar).
  - Panel post-cierre: descarga `.docx` + decisión `requiresSupport` (Sí→genera plan / No→archiva).
  - Botón "Reabrir expediente" (reversible en todo momento).
  - S2 Participantes: checkboxes del catálogo `ParticipantRole` agrupados por categoría + campo libre.
  - Indicador de cambios sin guardar (punto ámbar en botón de guardar).
- ✅ **Fase 3** — Catálogos en S4/S5/S9/S11 con componente `CatalogCheckboxGroup`:
  - Carga paralela de 8 endpoints en un solo `Promise.all` al montar.
  - S4 Fortalezas → `strengthCodes[]` (StrengthItem, 6 categorías, color indigo).
  - S5 Barreras → `barrierCodes[]` (BarrierItem, 8 categorías, color violet).
  - S9 Apoyos requeridos → `supportCodes[]` (SupportItem, 6 categorías, color sky).
  - S11 Seguimiento → `followupCodes[]` (FollowupSchedule, 3 tipos, color teal).
- ✅ **Fase 4** — S6 Desempeño curricular reemplaza el textarea legacy con editor de tabla:
  - Componente `SubjectCard` (asignatura + 3 textareas: logros / avances / necesidades de apoyo).
  - Guardado independiente vía `PUT /api/assessments/[studentId]/curricular-subjects`.
  - Estado `curricularDirty` separado del `isDirty` principal.
- ✅ **Fase 5** — Dashboard `/valoraciones`:
  - `GET /api/assessments` — lista con `computeProgress` (11 checks server-side) + `_count.curricularSubjects`.
  - Filtros Todas / En proceso / Completadas.
  - Cards con barra de progreso, badges de estado/apoyo, fecha relativa.
  - Alerta ámbar si hay valoraciones completadas con decisión de apoyo pendiente.
  - Enlace desde `app/page.tsx`.
- ✅ `app/estudiantes/[id]/page.tsx` — StepCard de Valoración refleja `status === 'completed'`.

### Sesión 9 — completado (25 mar 2026)
- ✅ Contenido herramienta TDA (77 objetivos), APZ_LENTO (72 obj.), TANV (90 obj.) → total 899 en BD.
- ✅ `lib/mep-data.ts` — datos estáticos MEP (direcciones, circuitos, especialidades) para autocompletar.
- ✅ `app/api/profile/route.ts` — GET/PATCH perfil del docente.
- ✅ `app/perfil/page.tsx` — formulario editable con `CircuitCombobox` y selección de especialidad.
- ✅ `AssessmentInstrument` en BD con `status` (approved/pendingApproval/rejected) + flujo de aprobación.
- ✅ `GET/POST /api/catalogs/instruments` + `PATCH/DELETE /api/catalogs/instruments/[id]`.
- ✅ `app/instrumentos/page.tsx` — gestión del catálogo de instrumentos.
- ✅ Fix de exportación `.docx` de valoración: `strengthCodes`, `barrierCodes`, `supportCodes` resueltos a etiquetas.
- ✅ `instrumentNotes: Json` en `IntegralAssessment` + textarea por instrumento en sección 7.
- ✅ Página `/herramientas/[difficulty]` — herramienta diagnóstica interactiva por dificultad con auto-guardado.
- ✅ Botón "Generar desempeño curricular desde herramientas" en sección 6 de la valoración.
- ✅ Fix: `participant-roles` y `strength-items` APIs devuelven objeto `Record<string, T[]>` cuando `?grouped=true`.

### Sesión 10 — completado (26 mar 2026)
- ✅ `lib/support-plan-generator.ts` — generador de borrador completamente reescrito:
  - `AREA_TO_PROCESSES`: 30+ áreas diagnósticas → 6 procesos oficiales MEP.
  - `AREA_TO_EF_SUBPROCESSES`: áreas → subprocesos de Funciones Ejecutivas (Planificación, Organización, Flexibilidad, Autorregulación, Automonitoreo).
  - `DIFFICULTY_LABEL_TO_CATALOG`: normaliza `difficultyLabel` de BD al valor exacto del catálogo UI.
  - `BARRIER_CATEGORY_TO_MEDIATION`: 8 categorías de barreras → estrategia de mediación contextual.
  - `SUPPORT_CATEGORY_TO_SPECIFIC`: 6 categorías de apoyos → estrategia específica del docente.
  - Plantillas de estrategias ampliadas: TDA, APZ_LENTO, TANV + estrategias específicas por área para las 8 dificultades.
  - Columna 1: resuelve `strengthCodes` a etiquetas + combina con texto libre.
  - Columna 2: plantillas + estrategias contextuales por categoría de barreras identificadas.
  - Columna 3: plantillas + acuerdos de la valoración (`agreements`).
  - Columna 4: estrategias por área + estrategias contextuales por categoría de apoyos requeridos.
- ✅ `app/estudiantes/[id]/plan/page.tsx` — botón "Generar borrador desde Valoración Integral":
  - Pre-marca automáticamente dificultades, procesos, subprocesos FE y las 4 columnas.
  - Badges **VI** en todos los campos pre-llenados.
  - Banner verde de confirmación con métricas de generación.
- ✅ `lib/support-plan-export.ts` — motor de exportación del Plan de Apoyo en `.docx`:
  - Sección de encabezado: datos generales, checkboxes de dificultades/procesos/subprocesos FE.
  - Tabla oficial de 4 columnas con formato MEP (colores azul, sombreado, márgenes).
  - Texto multilinea con `▸` y `•` renderizado como párrafos con sangría y estilos.
  - Sección de firmas al final.
- ✅ `GET /api/support-plans/[studentId]/export` — endpoint de descarga del Plan en `.docx`.
- ✅ Botón verde "Exportar Plan (.docx)" en la página del plan (aparece tras primer guardado).
- ✅ `app/estudiantes/[id]/objetivos/page.tsx` — reescrito como tracker de objetivos de apoyo:
  - Fuente: `StudentAssessmentResult` con `result: no | withSupport | yes` (no `SupportObjective`).
  - Barra de progreso general + mini barra por dificultad.
  - Agrupación: dificultad → área → objetivos (ordenados: no → withSupport → yes).
  - Botón "Logrado" (marca `yes`) / "Deshacer" (revierte a `withSupport`) con auto-guardado.
  - Filtros: Pendientes | Todos | Logrados.
  - Banner de alta sugerida cuando todos los objetivos están en `yes`.
- ✅ `app/estudiantes/[id]/page.tsx` — StepCard "Objetivos de Apoyo" usa conteos reales:
  - `objectivesPending` + `objectivesAchieved` desde `StudentAssessmentResult`.
  - `started` = "X pendientes · Y logrados", `complete` = "¡Alta sugerida!".

### Próximos pasos (sesión 11 en adelante)

1. **Dashboard principal** — resumen de actividad reciente (valoraciones activas, objetivos pendientes, sesiones del mes).
2. **Sesiones del periodo** — revisar flujo y vinculación con los nuevos "Objetivos de Apoyo" (los objetivos de diagnóstico reemplazan conceptualmente al `SupportObjective` para reportes).
3. **`lib/mep-data.ts` — datos oficiales**: reemplazar datos aproximados con listado oficial del MEP (27 direcciones regionales + circuitos exactos).
4. **Motor de informes** — actualizar `lib/report-engine.ts` para que el informe de periodo se alimente de `StudentAssessmentResult` (logros/pendientes) en lugar de `SupportObjective`.

---

## 16. Herramienta de valoración por objetivos (`AssessmentObjective`)

### Origen y estructura
- **Fuente**: `miscelaneos/objetivos.docx` — herramienta diseñada por el docente para valorar el estado del estudiante en cada dificultad específica.
- **Extracción**: script `miscelaneos/gen_seed.py` → genera `prisma/assessment-objectives-data.ts` (NO editar manualmente).

### Estructura del código de objetivo
```
DISGRAFIA.A.B.1
   │      │ │ └── ítem dentro del nivel (1, 2, 3...)
   │      │ └──── nivel: B (básico) | 1 | 2 | 3 | S (seguimiento emocional)
   │      └────── área: A, B, C, D, E, F, G, H
   └───────────── dificultad: DISGRAFIA | DISORTOGRAFIA | DISPRAXIA | DISCALCULIA | DISLEXIA
```

### Sistema de niveles
| Nivel | Código | Tipo evaluación | Significado |
|-------|--------|-----------------|-------------|
| Básico | B | checkbox (SÍ/NO/SÍ con apoyo) | Habilidades prerequisito (señales de alerta) |
| Nivel 1 | 1 | checkbox | Competencia inicial |
| Nivel 2 | 2 | checkbox | Competencia intermedia |
| Nivel 3 | 3 | checkbox | Competencia avanzada |
| Seguimiento emocional | S | scale (1-5) | Frustración y ansiedad ante la tarea |

### Dificultades y áreas implementadas (899 objetivos totales)
| Dificultad | Áreas | Objetivos |
|---|---|---|
| DISGRAFIA | A: Trazo/letras · B: Organización espacial · C: Fluidez/velocidad · D: Presión/agarre · E: Dibujo geométrico · F: Indicadores emocionales | 106 |
| DISORTOGRAFIA | A: Fonema-grafema · B: Ortografía reglada · C: Visual/memorística · D: Segmentación · E: Escritura espontánea · F: Copia · G: Indicadores emocionales | 118 |
| DISPRAXIA | A: Motricidad gruesa · B: Motricidad fina · C: Planificación motora · D: Conciencia corporal/espacial · E: Indicadores emocionales | 111 |
| DISCALCULIA | A: Sentido numérico · B: Reconocimiento números · C: Cálculo · D: Organización espacial · E: Resolución problemas · F: Espacio-temporal · G: Memoria trabajo · H: Indicadores emocionales | 171 |
| DISLEXIA | A: Conciencia fonológica · B1: Decodificación precisión · B2: Decodificación fluidez · C: Comprensión lectora · D: Ruta léxica · E1: Codificación fonológica · E2: Ortografía/gramática · F: Indicadores emocionales | 158 |
| TDA ✅ | Inatención sostenida · Impulsividad · Hiperactividad motora · Funciones ejecutivas · Rendimiento académico · Regulación emocional · Indicadores conductuales/emocionales | 77 |
| APZ_LENTO ✅ | Velocidad de procesamiento · Memoria de trabajo · Comprensión verbal · Razonamiento · Habilidades académicas · Desarrollo del lenguaje y vocabulario | 72 |
| TANV ✅ | Habilidades visoespaciales/visoconstructivas · Habilidades motoras · Funciones ejecutivas y planificación · Procesamiento táctil y sensorial · Habilidades sociales y comunicación no verbal | 90 |

### Flujo de uso en la app
```
1. Seleccionar dificultad(es) del estudiante
        ↓
2. GET /api/catalogs/assessment-objectives?difficulty=DISGRAFIA&grouped=areas
        ↓
3. UI: mostrar tabla por área → nivel → ítem con botones SÍ / NO / SÍ con apoyo
        ↓
4. POST /api/assessments/[studentId]/results  (lote de resultados)
        ↓
5. GET /api/assessments/[studentId]/results?withObjective=true
        ↓
6. Objetivos "no" y "withSupport" → alimentar Plan de Apoyo
        ↓
7. Opcional: convertir en SupportObjective para planificación mensual
```

---

---

## 10. Perfil del docente e INSTITUTIONAL_SUGGESTIONS (sesión 9)

### Problema
Los campos `centerName`, `circuit` y `specialty` del Teacher se creaban al registrar la cuenta pero no había forma de editarlos. Afectan directamente los encabezados de los documentos exportados (informes Word, valoración integral Word).

### Solución implementada

**`lib/mep-data.ts`** — datos estáticos del MEP:
- `MEP_REGIONAL_DIRECTIONS[]`: 18 direcciones regionales con sus circuitos.
- `ALL_CIRCUITS`: lista plana ordenada para combobox.
- `CIRCUIT_TO_REGION`: mapa circuito → dirección regional (para mostrar contexto).
- `MEP_SPECIALTIES`: 9 especialidades del servicio de apoyo (PA, PEC, DV, DA, RM, DM, TEA, Aula Integrada, Aula Recurso).

**`app/api/profile/route.ts`**:
- `GET` — retorna `{ id, name, email, centerName, circuit, specialty, createdAt }`.
- `PATCH` — actualiza cualquiera de `name | centerName | circuit | specialty`.

**`app/perfil/page.tsx`**:
- Formulario editable con `isDirty` → botón habilitado solo si hay cambios.
- `CircuitCombobox`: input + dropdown filtrado por región. Normalización de tildes para búsqueda.
- Muestra la dirección regional inferida al seleccionar un circuito.
- `<select>` con `MEP_SPECIALTIES` para la especialidad.
- Aviso informativo: datos aparecen en todos los documentos exportados.

**`app/page.tsx`**:
- Ícono ⚙️ en header → `/perfil`.
- Tarjeta "Mi perfil" al final del menú principal.

### Tareas pendientes
- **`lib/mep-data.ts` — datos aproximados (piloto)**: reemplazar con el listado oficial del MEP (27 direcciones regionales + circuitos exactos con numeración correcta). Los datos actuales son suficientes para pruebas pero no para producción.
- Dashboard principal — resumen de actividad reciente (sesiones pendientes, valoraciones activas, etc.).

---

## 11. INSTRUMENTS_CATALOG migrado a BD (sesión 9)

### Problema
El `INSTRUMENTS_CATALOG` era un array estático hardcodeado en `lib/catalogs.ts`. No permitía que los docentes propusieran nuevos instrumentos ni gestionar su ciclo de vida.

### Solución implementada

**`prisma/schema.prisma`** — nuevo modelo `AssessmentInstrument`:
- Campos: `code (unique)`, `label`, `category`, `description?`, `isCore`, `status`, `suggestedBy?`, `sortOrder`, `active`.
- `status`: `"approved"` | `"pendingApproval"` | `"rejected"`.
- `isCore: true` = los 9 instrumentos oficiales del MEP (no editables).
- `suggestedBy: teacherId` = quien lo propuso (null = sistema).
- Migración: `20260325210821_add_assessment_instrument_catalog`.

**`prisma/seed.ts`** — 9 instrumentos core sembrados:
- `INS_OBS_AULA`, `INS_OBS_OTROS`, `INS_REG_OBS` → categoría `observacion`
- `INS_ENT_FAMILIA`, `INS_ENT_DOCENTES` → `entrevista`
- `INS_CURR_BASE`, `INS_EVAL_DIAG` → `curriculum`
- `INS_ESCALA_CALIF`, `INS_LISTA_COTEJO` → `escala`

**`app/api/catalogs/instruments/route.ts`**:
- `GET`: retorna todos `approved` + propios `pendingApproval` del docente autenticado.
- `POST`: docente propone instrumento nuevo → `status: pendingApproval`. Valida duplicados.

**`app/api/catalogs/instruments/[id]/route.ts`**:
- `PATCH { status }`: aprueba o rechaza instrumentos pendientes (cualquier docente en piloto).
- `DELETE`: el docente que lo propuso puede eliminarlo si sigue pendiente.

**`app/estudiantes/[id]/valoracion/page.tsx`** — sección 7 actualizada:
- `instrumentCatalog` state cargado desde API en el `Promise.all` inicial.
- Chips dinámicos con badge "pendiente" en amarillo para los de `pendingApproval`.
- `addOtherInstrument` ahora hace `POST /api/catalogs/instruments` al proponer uno nuevo.
- Retrocompatibilidad: instrumentos guardados en BD que ya no están en el catálogo se muestran en azul.

**`app/instrumentos/page.tsx`** — página de gestión:
- Filtros: Todos / Aprobados / Pendientes (con contador).
- Agrupados por categoría.
- Acciones: Aprobar, Rechazar, Eliminar (solo para no-core y pendientes).
- Badge MEP para instrumentos oficiales.

**`app/page.tsx`**:
- Tarjeta "🔬 Instrumentos de valoración" en el menú principal.

---

### Sesión 10 (26 mar 2026)

| Archivo | Cambio |
|---------|--------|
| `lib/support-plan-generator.ts` | Reescrito: mapeos `AREA_TO_PROCESSES`, `AREA_TO_EF_SUBPROCESSES`, `DIFFICULTY_LABEL_TO_CATALOG`, `BARRIER_CATEGORY_TO_MEDIATION`, `SUPPORT_CATEGORY_TO_SPECIFIC`; plantillas TDA/APZ_LENTO/TANV; Columna 1 desde `strengthCodes`; Columna 2 enriquecida con barreras; Columna 3 con acuerdos; Columna 4 con apoyos |
| `app/estudiantes/[id]/plan/page.tsx` | `handleGenerate`: llama a `POST /generate`, pre-marca todos los campos; badges **VI** en los 6 campos del encabezado + 4 columnas; banner verde post-generación con métricas; `handleExport`: descarga `.docx`; botón verde "Exportar Plan (.docx)" |
| `lib/support-plan-export.ts` | **Nuevo**: motor docx del Plan de Apoyo (encabezado + checkboxes + tabla 4 columnas + firmas) |
| `app/api/support-plans/[studentId]/export/route.ts` | **Nuevo endpoint** `GET` — ensambla y descarga el Plan en `.docx` |
| `app/estudiantes/[id]/objetivos/page.tsx` | **Reescrito**: tracker basado en `StudentAssessmentResult`; barra de progreso; agrupación dificultad→área; botones Logrado/Deshacer con auto-guardado; banner de alta sugerida |
| `app/estudiantes/[id]/page.tsx` | StepCard "Objetivos" usa `objectivesPending`/`objectivesAchieved` desde API real; estados dinámicos |
| `docs/design/kata-design-notes.md` | Actualizado: header sesión 10, tabla APIs, sección 16 (TDA/APZ_LENTO/TANV completadas), sesión 10 en próximos pasos |

---

*Este documento debe actualizarse al inicio/cierre de cada sesión de desarrollo.*
