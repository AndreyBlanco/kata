# Katà — Notas de diseño y continuidad del proyecto

> Última actualización: mayo 2026 (post sesión D — Fase 2 cerrada; Fase 3a/3b documentadas)  
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

### Próximos pasos (continuidad mayo 2026)

> **Plan maestro:** **`docs/design/plan-trabajo-maestro.md`** — leer bloque **«Punto de continuación»** al iniciar sesión.  
> **Esquema expediente:** **`docs/design/expediente-interno.md`** — orden hub: expediente → obs → entrevistas → **pruebas** → VI.

**Próxima sesión de código:** **Sesión E′ → Fase 3a** (pruebas diagnósticas en el circuito de valoración, antes de planificación).

| Prioridad | Fase | Entregas clave |
|---|---|---|
| 1 | **3a** | Checklist pruebas en hub; progreso 8/nivel en VI; completitud VI; objetivos ↔ dificultades activas |
| 2 | **5+6** | `ApprovedSchedule` + `ActionPlan` (consume `StudentAssessmentResult`) |
| 3 | **7–8** | Pipeline sesiones + `PeriodReport` formato oficial |
| par. | **3b** | 48 `.md`, 6 TANV, parser, IA v2 |

Items técnicos heredados:

1. **Pipeline unificado** — sesiones e informe desde `StudentAssessmentResult`, no solo `SupportObjective`.
2. **Motor de informes** — alinear a formato oficial + persistir `PeriodReport` (Fase 8).
3. **`lib/mep-data.ts`** — datos oficiales 27 DR + circuitos (piloto).
4. **Dashboard docente** — actividad reciente (hub).

Contenido misceláneos: **42/48** pruebas `.md` (faltan 6 TANV) → **Fase 3b**; circuito mínimo en app → **Fase 3a**.

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

## 17. Expediente interno Katà (diseño v0.2 — mayo 2026)

Documento maestro: **`docs/design/expediente-interno.md`**

Decisiones clave:

- **Expediente único institucional** ≠ expediente interno Katà. Solo el **Informe de periodo** (formato `miscelaneos/Formato de informe de servicios de apoyo`) se archiva en el único del centro y se traslada si el estudiante cambia de escuela.
- Expediente interno: capas **0–8** (metadatos, identificación, entrada diagnóstica, VI, plan, seguimiento, informes, legacy, timeline).
- **Capa 6 — `PeriodReport`:** un informe por estudiante y periodo lectivo; estados internos `draft` → `exported` → `delivered` (entrega al único = `deliveredAt`, sin capa 9 separada).
- Historial de reexportaciones: tabla hija opcional `PeriodReportExport`.
- Planificación de acciones y registros comunidad/familias/articulación: **fuera** del expediente por estudiante.

Pendiente de implementación en Prisma/UI (ver §8 de `expediente-interno.md`).

---

## 18. Alcance global de Katà (mayo 2026)

**Documento maestro de producto:** `docs/design/alcance-global-kata.md`

- **Propósito:** asistir el trabajo **diario** del docente de apoyo para que el **informe de periodo** pase de semanas a horas/minutos si hubo uso metódico en el periodo.
- **v1:** solo **Problemas de aprendizaje (PA)**.
- **No hace:** plan anual / plan de acción anual del centro (si se cargan, los respeta); no tramita boleta de solicitud BSA (solo flag/recuerdo).
- **Agente IA:** práctica + **consultas sobre Líneas de acción** (corpus graphify-out).
- **Futuro:** módulo institucional o app aparte; posible app para docentes regulares.

---

## 19. Sesión 11 — diseño y plan de trabajo (mayo 2026, sin código)

**Documento de continuidad para código:** `docs/design/plan-trabajo-maestro.md`

Resumen de decisiones no cubiertas solo por §17:

| Área | Decisión |
|---|---|
| Planificación de acciones | Incluye todas las lecciones del horario (Anexo 1: 40 fijo / 44 itinerante); entrega a dirección = documento oficial; IA sugiere ajustes **después** del borrador mensual |
| Horario | Base **aprobado por dirección** (regulador); Katà respeta franjas; flexibilidad semanal con compensación documentada |
| Registros institucionales | Plano B; no alimentan expediente individual; IA puede usar patrones agregados de expedientes |
| Agente IA | v1 primero en entrevistas y observaciones |
| Pruebas (8 por nivel) | Parte de entrada diagnóstica / VI; perfilan necesidades y objetivos; **3a** antes de planificación; **3b** = 48 `.md` (42/48; faltan 6 TANV) |
| Orden implementación | Fase 0–2 ✅ → **3a** → Fase 5+6 → 7–8 → **3b** (incremental) → Fase 9 |

**Próxima acción acordada (mayo 2026):** **Sesión E′ — Fase 3a** (ver `plan-trabajo-maestro.md` § Punto de continuación).

---

### Sesión 11 (mayo 2026) — archivos de diseño

| Archivo | Cambio |
|---------|--------|
| `docs/design/alcance-global-kata.md` | **Nuevo** — propósito, límites, v1 PA, IA + Líneas de acción, visión futura |
| `docs/design/expediente-interno.md` | **Nuevo** — esquema capas 0–8, `PeriodReport`, frontera institucional |
| `docs/design/plan-trabajo-maestro.md` | **Nuevo** — fases 0–10, IA, orden sesiones de código |
| `docs/design/kata-design-notes.md` | §17–§19, §15 próximos pasos actualizado |

---

## 20. Sesión post-D — Fase 2 refinada + decisión Fase 3a/3b (mayo 2026)

**Contexto de producto (acordado):** las 48 pruebas diagnósticas (8 por nivel de grado) no son un módulo aislado posterior a la valoración. Son el **filtro** que perfila si el estudiante presenta comportamientos en dificultades de aprendizaje o en procesos de aprendizaje, y de ahí salen los **objetivos** con los que se trabaja en aula u otros contextos mientras permanece en el servicio PA.

**Implementación en esta sesión (Fase 2 — refinamiento, sin abrir 3a aún):**

| Área | Cambio |
|---|---|
| `lib/instruments.ts` | Normalización código ↔ etiqueta; §7 VI sin duplicar borrador Capa 2 |
| `lib/vi-capa2-derived.ts` | `buildDerivedInstruments`, `buildDerivedParticipants`, `buildViSectionFeeds` (barreras, apoyos) |
| `lib/apply-to-assessment.ts` | Incorporar evidencia sin repetir narrativa en `instrumentNotes` |
| API | `GET .../capa2-evidence` → `derivedInstruments`, `derivedParticipants`, `sectionFeeds` |
| UI VI | `ViSectionInstruments`, `ViSectionParticipants`, `ViCapa2NarrativeSection`, hints §2/4/5/9 |
| Sesión D previa | Panel Capa 2, bulk apply, `serviceIntakeType`, `review_vi`, completitud |

**Decisión de roadmap:** no esperar a Fase 6 (planificación) para integrar pruebas en el flujo. La planificación **requiere** objetivos ya perfilados → **Fase 3a** antes de Sesión E (horario + planificación). El refactor masivo de archivos `.md` queda en **Fase 3b** (Sesión H, incremental).

**Archivos de diseño actualizados:** `plan-trabajo-maestro.md` (§ Punto de continuación, Fases 2/3a/3b, orden sesiones E′→E).

**Código existente a reutilizar en 3a:** `/herramientas/[difficulty]`, `StudentAssessmentResult`, `GET/POST .../results`, generador §6 VI, `/objetivos`, plan generator desde valoración.

---

## 21. Sesión E′-1 — Reemplazo total de herramientas por pruebas diagnósticas (mayo 2026)

**Cambio arquitectónico:** rechazo de user test del módulo `Herramientas de valoración diagnóstica` (cuestionario sí/no/con-apoyo, sin pruebas estandarizadas) → sustitución completa por sistema basado en **Pruebas Diagnósticas Markdown** diseñadas por docente asesora. Compatibilidad histórica: **R1** = sin datos reales en BD → migración destructiva con `db push --accept-data-loss`.

**Cambios principales:**

| Área | Cambio |
|---|---|
| Schema | Removido `AssessmentObjective`, `StudentAssessmentResult`, enum `AssessmentResultValue`. Añadidos `DiagnosticTest`, `DiagnosticTestActivity`, `DiagnosticTestItem`, `DiagnosticTestRecommendation`, `StudentDiagnosticTest` (con `attemptNumber` + `draftPayload` JSON), `StudentDiagnosticItemResult`, `StudentDiagnosticActivityObservation`, `StudentRecommendationSelection`. Enum nuevo `DiagnosticItemResult` (`LOGRADO`/`EN_PROCESO`/`PRESENTA_DIFICULTAD`). |
| Seed | `prisma/seed-diagnostic-tests.ts` parsea `miscelaneos/Pruebas diagnósticas-MD/**.md` y siembra 42 pruebas (faltan 6 TANV — sesión H). Regex flexible para `## A. Actividad: X` / `## A. X` y `### Items evaluados` / `### Ítems`. Transacciones con timeout 90s. |
| APIs | `/api/students/[id]/diagnostic-tests` (lista por grado), `/diagnostic-tests/[testId]` (estructura), `.../applications` (POST con attemptNumber++), `/diagnostic-test-applications/[id]` (GET/PUT/DELETE — promoción de draft a tablas), `.../draft` (PATCH autosave 1.5s), `.../complete` (POST/DELETE). |
| UI | `/estudiantes/[id]/pruebas` (lista por dificultad, modal de elección si hay aplicaciones previas), `/pruebas/[applicationId]` (formulario con autosave + impresión + confirmación de salida). |
| Hub | `StepCard` paso 4 «Pruebas diagnósticas» (visible; no altera el checklist MEP). |
| VI §7 | Componente `ViSectionDiagnosticTests` (read-only); eliminada toda la sección antigua de Herramientas. |
| Stubs temporales E′-1 | `support-plan-generator` neutralizado, `/objetivos` reemplazada por explicación. |

---

## 22. Sesión E′-2 — Integración VI + Plan multifuente (mayo 2026)

**Objetivo:** todas las fuentes Capa 2 (pruebas, entrevistas, observaciones) alimentan las secciones correspondientes de la VI; preparar el bus de aportes para informes de periodo (Fase 6/G).

**Decisiones consolidadas:**

- **D1 a D7:** preferencias persisten en `StudentObjectivePreference`; objetivos derivados de `EN_PROCESO`/`PRESENTA_DIFICULTAD` están activos por defecto; mapeo MEP procesos↔áreas conserva el catálogo existente; recomendaciones se mapean a columnas del Plan por heurística D5 (keywords `aula`, `hogar`, `familia` → categoría).
- **D8:** §6 Desempeño curricular se alimenta **por asignatura** desde pruebas (asignaturas mapeadas por dificultad), observaciones y entrevistas. «Avances» solo cuando hay dos o más aplicaciones de la misma prueba con mejora entre intentos. Generador **no destructivo** — respeta entradas manuales.
- **R7 (Capa 2 MEP):** el checklist MEP sigue en 4 pasos; las pruebas son visibles pero no participan del conteo.
- **Sesión H (Fase 3b):** IA `recommend_tests` y guía durante aplicación.

**Cambios principales:**

| Capa | Archivo / Componente | Cambio |
|---|---|---|
| Schema | `StudentObjectivePreference` | Nueva tabla `(studentId, itemId)` única; `isActive`, `priority`, `notes`. Migración additiva (`db push` no destructivo). Añadido también `recommendationCategory` opcional en `StudentRecommendationSelection`. |
| Lógica | `lib/diagnostic-objectives.ts` | `buildDerivedObjectives` toma última aplicación por prueba y aplica preferencias. `detectProgressBetweenAttempts` compara los dos últimos intentos por prueba. |
| Lógica | `lib/vi-contribution-types.ts` | Tipo compartido `ViContribution` + `Capa2Source` + `ContributionCategory`. Mapeo `CONTRIBUTION_TO_VI_SECTION` reusable para informe de periodo. |
| Lógica | `lib/diagnostic-vi-derived.ts` | Convierte resultados/avances/recomendaciones en `ViContribution`s. Mapeo dificultad→asignatura. Heurística D5 `classifyRecommendation`. Resumen para §8 `summarizeForAnalysis`. |
| API | `/api/students/[id]/objectives` (GET) + `[itemId]/preference` (PATCH) | Devuelve derivados + avances; upsert/delete de preferencia (default-collapse para mantener tabla limpia). |
| API | `/api/students/[id]/vi-contributions` (GET) | Bus multifuente — devuelve `contributions`, `summary` por sección, `analysisDraft`. Preparado para sumar contribuciones de entrevistas/observaciones en futura sesión. |
| UI | `/estudiantes/[id]/objetivos` | Reemplaza stub. Filtros (activos / fortalezas / todos), agrupación por dificultad o resultado, toggle isActive con persistencia, sección de «Avances entre aplicaciones». |
| UI | `components/vi/diagnostic-contributions-hint.tsx` | Hint colapsable con checkboxes; detecta items ya en el texto, evita duplicar; botón «Aplicar al texto». |
| UI | VI §4/§5/§9 | Integran `DiagnosticContributionsHint` para strength/barrier/support. |
| UI | VI §6 | Botón «Actualizar desde Capa 2» llama a `updateCurricularFromCapa2` (no destructivo, por asignatura). Avances entran como `curricular_progress`. |
| UI | VI §8 | Bloque con resumen automático + «Pegar como borrador» / «Copiar». |
| Lógica | `lib/support-plan-generator.ts` | Reconectado: arma árbol `byDifficulty → areas → objectives` desde `StudentDiagnosticItemResult` (última aplicación, respetando preferencia activa). Recomendaciones marcadas clasificadas por D5 enriquecen columnas 2 (aula), 3 (hogar) y 4 (específica). Mantiene plantillas MEP del Cuaderno N°4. |

**Hub**: `StepCard` paso 7 «Objetivos» ya muestra conteo real (activos + fortalezas) desde `/api/students/[id]/objectives`.

**Próxima sesión:** **Sesión E → Fases 5+6** (horario base + planificación de acciones).

---

## 23. Sesión E — Horario base + Planificación de acciones MVP (mayo 2026)

**Contexto:** primera versión funcional del **plano B** (servicio docente). Cierra Fases 5 y 6 del plan maestro con un MVP completo: horario semanal por categoría Anexo 1, plan mensual operable, y exportación Word del Anexo 5 (3 columnas).

**Decisiones de scope (P1–P11):**

| Decisión | Resultado |
|---|---|
| P1 — Modalidad | `Teacher.workModality` enum (`FIJO` default / `ITINERANTE`); editable en `/perfil`. Piloto se prepara para ambas; en producción se valida según docente. |
| P2 — Granularidad horario | Grilla semanal 5d × bloques. Referencia única: `miscelaneos/Horario` (jornada única). Deuda técnica documentada: jornada doble, unidocentes y horarios variables van a v2. |
| P3 — Categorías Anexo 1 | Hardcoded en `lib/schedule-template.ts` con cupos `FIJO`/`ITINERANTE` y color Tailwind. Migrar a catálogo BD es v2. |
| P4 — Granularidad plan | **Mensual**, un plan por (docente, año, mes), editable individualmente. Solo meses del periodo activo. |
| P5 — Estados | `BORRADOR` ↔ `APROBADO`. Aprobación del docente = autorización (Katà no fiscaliza). Reabrir → borrador → sobrescribe `approvedAt`. Sin historial de versiones. |
| P6 — Línea | `category`, `mepProcess`, `description`, `observations`, `lessonCount`, `studentId?`, `linkedItemIds[]`, `sortOrder`. |
| P7 — Export oficial | Word `.docx` (`lib/action-plan-word-export.ts`) — Anexo 5 con tabla 3 columnas por categoría + impresión navegador. |
| P8 — Vínculo objetivos | Multi-checkbox de items derivados activos (filtrados por estudiante seleccionado). Modal lateral muestra la lista en línea. |
| P9 — Lectura agregada | Cabecera `/planificacion` con contadores estáticos (`/api/teacher/service-summary`: activos, con plan, con VI, distribución por dificultad). |
| P10 — Legacy | `SupportObjective` y `/sesiones/registrar` quedan vivos hasta Sesión F (Fase 7). |
| P11 — Validación | Panel numérico — cupo por categoría (semanal × semanas del mes) con badge `ok` / `under` / `over`. Sin IA en E. |

**UI preferences confirmadas por el usuario:**
- **Color por categoría** en celdas del horario y del calendario del plan.
- **Modal lateral** (no popover) para detalles de lección al hacer click sobre un slot.

**Entregables Sesión E:**

| Capa | Archivo | Detalle |
|---|---|---|
| Prisma | `prisma/schema.prisma` | Enums: `WorkModality`, `ScheduleBlockType`, `AfternoonVariant` (A/B reservados), `ServiceLessonCategory` (6 categorías), `MepProcess`, `ActionPlanStatus`. Modelos: `ApprovedSchedule`, `ScheduleSlot`, `ActionPlan`, `ActionPlanLine`, `ActionPlanSlot`. Unique constraints `(teacherId, schoolPeriod)` y `(teacherId, year, month)`. Push no-destructivo. |
| Lib | `lib/schedule-template.ts` | `SERVICE_CATEGORIES` (código, label, short, color Tailwind, cupos por modalidad), `buildWeeklyScheduleTemplate()` que materializa la jornada de `miscelaneos/Horario`. |
| Lib | `lib/action-plan-validation.ts` | `weeksInMonth`, `listMonthWeekdays` (lun-vie), `isMonthInSchoolPeriod`, `validateMonthlyPlan`, helpers UI (`categoryStatusBadge`, `monthLabel`). |
| Lib | `lib/action-plan-word-export.ts` | Builder docx Anexo 5: encabezado con datos del docente + tabla por categoría con `Proceso · Lecciones · Descripción`. Incluye estudiante asociado y conteo de objetivos vinculados. |
| API | `/api/schedule` (GET/PUT) | GET hace seed automático del horario si no existe (jornada referencia). PUT actualiza categorías de slots LESSON + flag `approve`. |
| API | `/api/action-plans` (GET/POST) | Lista planes del periodo (con `linesCount`); POST valida `isMonthInSchoolPeriod`, devuelve 409 si ya existe. |
| API | `/api/action-plans/[id]` (GET/PATCH/DELETE) | GET enriquece con `weekdays`, `schedule`, `validation` (cupos). PATCH reemplaza atómicamente líneas+slots (saneamiento + detección de colisiones). DELETE sólo si BORRADOR. |
| API | `/api/action-plans/[id]/approve` (POST/DELETE) | POST → APROBADO (`approvedAt = now`); DELETE → reabre como BORRADOR (conserva `approvedAt` histórico). |
| API | `/api/action-plans/[id]/export` | Devuelve `.docx` Anexo 5; filename `plan_acciones_{mes}_{año}_{docente}.docx`. |
| API | `/api/teacher/service-summary` | Cabecera P9 — contadores activos / con plan / con VI + distribución por dificultad. |
| API | `/api/teacher/students-with-objectives` | Lista compacta para el selector del modal (estudiantes activos + objetivos derivados isActive). |
| API | `/api/profile` (PATCH) | Acepta `workModality` y persiste `activeSchoolPeriod` (corrige bug previo donde la UI lo enviaba sin guardarse). |
| UI | `/perfil` | Selector segmentado `FIJO`/`ITINERANTE` con cupos visibles. |
| UI | `/horario` | `ScheduleGrid` con celdas coloreadas por categoría, popover de asignación, panel de cupos en cabecera, botones `Guardar` / `Guardar + aprobar` / `Reabrir`. |
| UI | `/planificacion` | Cabecera resumen (contadores P9) + lista de planes + wizard «Nuevo plan mensual» (sólo meses del periodo sin plan). |
| UI | `/planificacion/[id]` | 3 tabs: **Calendario** (semana × día × bloque con click → `PlanSlotModal` lateral), **Documento** (Anexo 5 — 3 cols con totales por categoría), **Validación** (cupos calculados en cliente en vivo). Acciones: `Guardar borrador`, `Aprobar`, `Reabrir`, `Exportar Word`, `Borrar`. |
| Componentes | `components/schedule/schedule-grid.tsx` | Grilla semanal reutilizable. |
| Componentes | `components/plan/plan-calendar.tsx` | Calendario mensual (semanas × días × bloques LESSON; muestra snippet de la línea asignada). |
| Componentes | `components/plan/plan-slot-modal.tsx` | Modal lateral: si la lección está libre → crear línea o asignar a existente de la misma categoría; si tiene línea → editar descripción/proceso/categoría/estudiante + lista de objetivos derivados con checkbox. Vaciar lección libera el slot. |
| Componentes | `components/plan/plan-document.tsx` | Vista tabla Anexo 5 print-friendly agrupada por categoría. |
| Componentes | `components/plan/plan-validation.tsx` | Panel de cupos con badge por categoría. |
| Componentes | `components/plan/plan-types.ts` | Tipos compartidos entre tabs. |
| Nav | `app/(app)/page.tsx` | Quick links añadidos a Horario y Planificación (barra inferior mantiene 5 items; ver deuda técnica). |
| Docs | `docs/design/plan-trabajo-maestro.md` | Fases 5 y 6 marcadas como completadas (Sesión E); siguiente = Sesión F (Fase 7). |

**Deuda técnica registrada (Sesión E):**

- **Jornada única solamente**: la plantilla horaria es fija (referencia `miscelaneos/Horario`). Jornada doble, unidocentes, horarios variables por centro → v2. El enum `AfternoonVariant` y campo `notes` están preparados.
- **Categorías Anexo 1 hardcoded** en `lib/schedule-template.ts`. Migrar a tabla BD requerirá script de seed y editor admin → v2.
- **Sin historial de versiones del plan** ni del horario: al reabrir+reaprobar se sobrescribe `approvedAt`. `SupportPlanVersion` es el patrón a replicar.
- **`ActionPlanSlot.weekNumber`** se almacena tal como llega del cliente (semana ISO calculada en `listMonthWeekdays`); validar consistencia futura si cambia la regla de semanas.
- **Validación únicamente numérica**: cupos por categoría vs. lecciones. Sin IA, sin sugerencias post-borrador (Fase 7+).
- **Barra inferior de navegación saturada** (5 items). Horario y Planificación viven en quick links de home. Si la fricción se manifiesta en piloto, evaluar tab «Plan» que agrupe ambos.
- **Word Anexo 5 simplificado**: encabezado con datos del docente + tabla 3 cols. El formato MEP oficial puede requerir logos/pies institucionales que se evaluará al confirmar plantilla 2026.
- **`/api/profile` PATCH previamente no persistía `activeSchoolPeriod`**: bug aprovechado y corregido en Sesión E.

**Próxima sesión:** **Sesión F → Fase 7** (pipeline de sesiones unificado: bitácoras alimentadas por objetivos derivados, vínculo planificación → sesiones programadas por estudiante, `/sesiones` global, adjuntos).

---

## 24. Sesión F-1 — Documentos institucionales: Plan de Acción Anual (Anexo 2) (mayo 2026)

**Contexto:** preparación de la entrada de IA preliminar (Sesión F-2). La planificación de acciones mensual del docente PA debe "desprenderse" del Plan de Acción Anual del servicio (Anexo 2, Líneas de Acción MEP 2023). Antes de que la IA pueda generar borradores, necesita un payload estructurado a partir del documento que la dirección/equipo PA elabora externamente.

**Decisión de scope clave:** revisión textual del Anexo 1 (líneas 1208–1210, 1340–1341, 1621, 2525) confirma que **solo el Plan de Acción Anual** alimenta directamente la planificación mensual. El PAT del centro consume al Plan de Acción Anual (no al revés) — queda fuera. La autoevaluación (Anexo 1 Cuaderno 1) es insumo del Plan Anual pero también externa.

**Decisiones de implementación (Q1–Q3):**

| Decisión | Resultado |
|---|---|
| Q1 — Cómo registramos el documento | a) **Solo extraemos texto** (sin guardar binario) + payload IA en BD. El docente conserva el original. |
| Q2 — Flujo de IA | b) **Genera + asigna a slots automáticamente** respetando cupos del horario. (Aplica a F-2; F-1 solo extrae el insumo.) |
| Q3 — Alcance de la sesión | b) **F-1 solo upload + extracción IA + UI documentos**. F-2 (IA preliminar mensual) en sesión siguiente. |

**Decisiones técnicas confirmadas:**
- Tamaño máximo: 5 MB
- Tipos permitidos: PDF (.pdf) + Word (.docx). `.doc` legacy excluido (mammoth no lo lee bien).
- Procesamiento: síncrono (HTTP espera hasta ~30s). Migrar a job queue es deuda técnica para v2.
- Año lectivo: dropdown con años disponibles del calendario MEP (`lib/school-periods.ts`).
- Storage: solo texto + payload en BD, no binario.
- Proveedor IA: hereda del configurado en `lib/assistant/client.ts` (Google → OpenAI → Anthropic; fallback heurístico si no hay key).
- Solo `PLAN_ACCION_ANUAL` activo; enum `InstitutionalDocumentType` deja preparados `PAT`, `AUTOEVALUACION`, `OTRO` para futuro.

**Entregables Sesión F-1:**

| Capa | Archivo | Detalle |
|---|---|---|
| Prisma | `prisma/schema.prisma` | Enums `InstitutionalDocumentType` (4 valores, 1 activo), `InstitutionalDocumentStatus` (UPLOADED/PROCESSING/PROCESSED/ERROR). Modelo `InstitutionalDocument` con texto extraído + payload JSON + metadata IA (provider, model, summary, error). FK a `Teacher` con cascade. Push no-destructivo. |
| Lib | `lib/institutional-document-types.ts` | `ActionPlanAnnualPayload` (ejes/objetivos/actividades + `suggestedCategory: ServiceLessonCategory \| null` + `suggestedProcess: MepProcess \| null` + `months: number[]` + `objectiveIds[]` para vincular actividades a objetivos). `ExtractionResult`, helpers `emptyAnnualPayload`/`countAnnualPayload`. |
| Lib | `lib/text-extraction.ts` | `extractTextFromUpload({buffer, mime, filename})` con import dinámico de `pdf-parse` y `mammoth` (compatibilidad Node runtime). `TextExtractionError` con códigos identificables (UNSUPPORTED_MIME, TOO_LARGE, EMPTY_TEXT, PARSE_FAILED, EMPTY_FILE). Limpieza básica de texto (nbsp → espacio, colapso de saltos). |
| Lib | `lib/assistant/institutional-doc-prompts.ts` | System prompt MEP/CR + user prompt con esquema JSON estricto, hints para mapear actividades a categorías Anexo 1 y procesos MEP, truncado a 60K caracteres. Prompt separado para resumen ejecutivo. |
| Lib | `lib/institutional-document-parser.ts` | `parseActionPlanDocument` con flujo IA → parsing JSON robusto (acepta backticks) → normalización (filtra enums inválidos, valida `objectiveIds`, hace IDs locales O1/O2/E1/A1...). Fallback heurístico por regex cuando no hay IA configurada (status='partial'). Resumen ejecutivo en segunda pasada IA (con fallback humano). |
| API | `POST/GET /api/institutional-documents` | POST multipart/form-data, validación, extracción texto, IA sync, persistencia. `runtime = 'nodejs'`, `maxDuration = 60`. GET lista con filtros por type/year/status. |
| API | `GET/PATCH/DELETE /api/institutional-documents/[id]` | Detalle completo, edición de metadata (title/year/notes), borrado. |
| API | `POST /api/institutional-documents/[id]/reprocess` | Re-corre IA sobre el `extractedText` ya guardado, sin re-subir archivo. Útil tras configurar API key o cuando IA falló por rate-limit. |
| UI | `/planificacion/documentos` | Form de upload (título, año del calendario MEP, archivo), listado con tarjetas (badge de estado, contadores `objectives/activities`, summary IA en línea, fecha de procesamiento, botones reprocesar/borrar). Aviso si IA no configurada. Redirección automática al detalle tras upload exitoso. |
| UI | `/planificacion/documentos/[id]` | Resumen IA + datos del plan (centro, servicio, docentes, objetivo general) + ejes + objetivos numerados (con población meta, eje, resultados esperados) + actividades con tarjeta enriquecida (categoría sugerida con color Anexo 1, proceso MEP, meses, cronograma textual, responsables, vínculos a objetivos). Texto extraído colapsable para auditoría. Botones reprocesar/borrar. |
| Nav | `app/(app)/planificacion/page.tsx` | Botón "Documentos institucionales" en cabecera de la lista de planes mensuales. |
| Deps | `package.json` | `pdf-parse` + `mammoth` + `@types/pdf-parse` (devDep). |
| Docs | `docs/design/plan-trabajo-maestro.md` | Nueva Fase 6b documentada como completa; Fase 6c proyectada como F-2. |

**Deuda técnica registrada (F-1):**

- **Procesamiento síncrono**: el cliente espera hasta 30s. Cuando el piloto crezca, migrar a job queue con polling (status PROCESSING → PROCESSED).
- **Sin OCR**: PDFs escaneados sin capa de texto fallan con `TextExtractionError code=EMPTY_TEXT` y mensaje sugiriendo conversión a Word u OCR previo.
- **Truncado a 60K caracteres**: documentos muy largos pierden contenido del final. Solución v2: chunking multi-pass + síntesis.
- **No conservamos binario**: si en el futuro la dirección pide auditoría del PDF original, no podremos recuperarlo. Aceptado para piloto.
- **Sin editor del payload extraído**: si la IA extrae mal, el flujo es reprocesar o re-subir. Editor campo-por-campo queda para v2.
- **PAT y autoevaluación Anexo 1** reservados en el enum pero sin UI/lógica. Cuando se activen requerirán prompts dedicados y posiblemente nuevas tablas (objetivos del PAT podrían linkearse a objetivos del Plan de Acción Anual).
- **Sin historial de versiones**: cada upload crea un documento nuevo. El docente debe borrar el anterior si quiere reemplazarlo.
- **Fallback heurístico es muy básico**: solo busca encabezados "Objetivo N..." y "Actividad N...". Útil para piloto local sin API key, no para producción seria.
- **Mapeo a `ServiceLessonCategory`/`MepProcess` es opinable**: depende de qué tan bien describa el Plan Anual cada actividad. F-2 deberá validar y ajustar cuando use estos campos para asignar a slots.

**Cadena documental MEP confirmada (citas oficiales):**

```
Anexo 1 Cuaderno 1 — Informe autoevaluación del centro
  ↓ "del cual se desprende el Plan de acción anual" (L1072-1073)
Anexo 2 — Plan de Acción Anual ← ÚNICO insumo cargado en Katà
  ↓ "del cual se desprende la planificación de acciones (anexo 5)" (L1621, L1341)
  ↓ "se deriva del plan de acción anual Y de la identificación de los
    requerimientos de apoyo de la persona estudiante" (L2525) ← clave para
    modo B (fallback expedientes) en F-2
Anexo 5 — Planificación de acciones (mensual) ← Sesión E ya construida
PAT del centro
  ↑ "las acciones... deben ser insumos para el PAT del año siguiente" (L1208-1209)
  ↑ Plan Anual del servicio "responde al PAT vigente" (L1210)
  No es insumo directo del mensual; queda fuera de scope.
```

**Próxima sesión:** **Sesión F-2 — IA preliminar mensual** que genera líneas completas del plan a partir de `InstitutionalDocument` (modo A) o expedientes de estudiantes activos (modo B fallback), asignando automáticamente a slots del horario y respetando cupos.

---

## 25. Sesión F-2 — IA preliminar del plan mensual (mayo 2026)

**Contexto:** cerrada la Sesión F-1 (carga + extracción del Plan de Acción Anual), faltaba el paso central de la Fase 6: que la IA genere el contenido del plan mensual a partir de ese insumo (Modo A) o, cuando no exista, desde los expedientes (Modo B). La conversación de planeamiento abrió decisiones G1–G5 y validó la decisión arquitectónica que unifica los modos.

**Decisiones de implementación (G1–G5):**

| Decisión | Resultado |
|---|---|
| G1 — Selección de modo | a) **Auto-detect** + variante: cuando no hay doc institucional, Katà **genera un documento suplente** con el mismo esquema (Objetivos · Actividades · Cronograma · Responsables) desde los expedientes, marcando `responsibleTeachers = [docente actual]`. Eso unifica el flujo en uno solo (siempre hay plan anual que alimenta al mensual). |
| G2 — Plan no vacío | c) **Confirmación con advertencia**: si hay líneas existentes, la API responde 409 `CONFIRM_OVERWRITE` con el conteo; el modal en UI re-pide con `overwriteExisting=true`. Plan vacío → directo. |
| G3 — Trazabilidad | a) **Sí**: `ActionPlanLine` += `aiGenerated`, `sourceDocumentId` (FK), `linkedAnnualActivityId` (id local de la actividad anual). `InstitutionalDocument` += `aiGenerated` para distinguir oficial vs suplente. |
| G4 — Preview vs aplicar | a) **Directo al plan**: el docente recibe el plan completo (líneas + asignaciones) y edita con las herramientas que ya existen (`PlanSlotModal`, `PlanValidationPanel`). Sin pantalla intermedia. |
| G5 — IA + backend | **División de responsabilidades**: la IA genera líneas con `lessonCount` por categoría (contenido pedagógico); el `slot-assigner` determinístico decide a qué `scheduleSlotId + date` va cada lección, respetando cupos y equilibrando semanas. |

**Por qué la variante del doc suplente importa:** con ella, no hay dos flujos paralelos (un parser para doc oficial y otro para expedientes). Todo desemboca en un `ActionPlanAnnualPayload` (oficial o IA-generado) y un único prompt mensual lo consume. El docente además ve el suplente en `/planificacion/documentos`, puede revisar y editar conceptos, o reemplazarlo subiendo el oficial cuando llegue.

**Entregables Sesión F-2:**

| Capa | Archivo | Detalle |
|---|---|---|
| Prisma | `prisma/schema.prisma` | `ActionPlanLine` += `aiGenerated`, `sourceDocumentId`, `linkedAnnualActivityId` + índice por documento. `InstitutionalDocument` += `aiGenerated`; campos de archivo opcionales para suplentes; relación inversa `actionPlanLines[]`. Push no-destructivo. |
| Lib | `lib/action-plan-context.ts` | Colector unificado: plan + horario aprobado + cupos mensuales (semana × modalidad × weeksInMonth) + doc institucional vigente del año (ordenado preferiendo oficial sobre suplente) + estudiantes activos con barreras/apoyos requeridos y objetivos derivados activos. `summarizeContextForPrompt` genera el bloque legible para los prompts. Tipos: `ActionPlanGenerationContext`, `ContextScheduleSlot`, `ContextStudent`, `ContextCategoryQuota`. Errores tipificados (`PLAN_NOT_FOUND`, `SCHEDULE_NOT_FOUND`, `SCHEDULE_NOT_APPROVED`, `NO_ACTIVE_STUDENTS`). |
| Lib | `lib/assistant/action-plan-ai-prompts.ts` | System prompt MEP. Dos prompts: `buildAnnualPayloadFromRecordsPrompt` (genera `ActionPlanAnnualPayload` suplente desde expedientes; obliga a cubrir las 6 categorías Anexo 1) + `buildMonthlyLinesFromAnnualPrompt` (genera líneas con cupos exactos; filtra actividades anuales por mes; aclara si es plan oficial o suplente; describe los 3 procesos MEP). |
| Lib | `lib/action-plan-slot-assigner.ts` | Algoritmo: por categoría arma instancias (slot × fecha) del mes, ordena por semana/día/bloque, reparte demanda de líneas en rondas. Reporta `unassigned[]` con razón. Devuelve `AssignmentResult` con `perCategory` (demand vs capacity vs assigned). |
| Lib | `lib/action-plan-ai-generator.ts` | Orquestador `generateMonthlyPlanDraft({teacherId, planId})`. Flujo: 1) contexto, 2) IA configurada o `AI_NOT_CONFIGURED`, 3) auto-detect modo y si Modo B genera + persiste doc suplente (`aiGenerated=true`, sin archivo fuente), 4) IA mensual, 5) normalización (valida categoría/proceso/studentId/itemId/activityId; recorta excesos por categoría; agrega línea genérica si falta cupo), 6) `assignLinesUsingContext`, 7) devuelve outcome. `defaultLineDescription` provee fallback por categoría. |
| API | `POST /api/action-plans/[id]/ai-generate` | Body `{ overwriteExisting?: boolean }`. 409 `CONFIRM_OVERWRITE` con `existingLines` si hay contenido y no se confirma. 422 con `code` (`PLAN_NOT_FOUND`, `SCHEDULE_NOT_FOUND`, `SCHEDULE_NOT_APPROVED`, `NO_ACTIVE_STUDENTS`, `AI_NOT_CONFIGURED`, `AI_FAILED`, `AI_INVALID_JSON`). Transacción atómica que borra líneas previas y crea las nuevas con sus slots + persiste `notes` IA. `runtime = 'nodejs'`, `maxDuration = 60`. |
| API | `GET/PATCH /api/action-plans/[id]` | Extendido: devuelve y persiste `aiGenerated`, `sourceDocumentId`, `linkedAnnualActivityId` en cada línea. |
| API | `GET /api/institutional-documents[/...]` | Extendido: devuelve `aiGenerated` para distinguir oficial vs suplente. |
| Types | `components/plan/plan-types.ts` | `PlanLine` += `aiGenerated?`, `sourceDocumentId?`, `linkedAnnualActivityId?`. |
| UI | `/planificacion/[id]` | Botón "✨ Generar con IA" (sólo cuando BORRADOR). `AiGenerateModal` interno: explica modo automático + crea suplente si hace falta + advierte de overwrite con conteo. Estados: idle / busy (spinner bloqueante) / error (con re-intentar `overwriteExisting=true` si conflicto) / success (resumen + link al doc suplente cuando se creó + warnings de cupo/asignación). |
| UI | `PlanDocument` + `PlanSlotModal` | Badge `⚙ IA` en líneas generadas (tooltip con `linkedAnnualActivityId` si aplica). En el modal de edición, banner indicando origen IA cuando corresponde. |
| UI | `/planificacion/documentos` (lista y detalle) | Badge `⚙ Generado por Katà` para suplentes. Banner destacado en el detalle invitando a reemplazarlo cuando llegue el oficial. Manejo seguro de campos opcionales del archivo (`originalFileName/mimeType/fileSizeBytes/extractedText`) ahora que pueden ser null. |

**Cadena documental con doc suplente:**

```
¿Existe InstitutionalDocument PROCESSED del año?
   ├── SÍ (oficial o suplente previo)
   │     └── Modo A: IA mensual lo consume
   └── NO
         ├── Modo B paso 1: IA genera ActionPlanAnnualPayload suplente
         │     desde expedientes (objetivos comunes, dificultades repetidas,
         │     cobertura mínima de las 6 categorías Anexo 1)
         ├── Persistir como InstitutionalDocument con aiGenerated=true
         │     (sin archivo fuente, responsibleTeachers=[docente actual])
         └── Modo B paso 2: IA mensual lo consume (igual que Modo A)

Salida común:
   - lines[] con lessonCount por categoría = cupo mensual exacto
   - assigner determinístico: cada lección → (scheduleSlotId, date) libre
   - Persistir con aiGenerated=true, sourceDocumentId, linkedAnnualActivityId
```

**Deuda técnica registrada (F-2):**

- **Assigner pedagógicamente ciego**: no prioriza continuidad semanal por estudiante ni por línea. Cualquier slot libre de la categoría es candidato. v2 → preferir mismo día/semana para una misma línea cuando aplica.
- **Sin embeddings ni agrupación previa para Modo B**: la IA detecta patrones en lo que le mostramos en bruto. Si hay >30 estudiantes, parte del contexto se pierde por límites de tokens.
- **Sin re-generación parcial**: una sola categoría, una sola semana o un solo estudiante no se pueden regenerar. Todo o nada.
- **Sin historial de generaciones IA**: cada `/ai-generate` pisa la corrida anterior. Conservar versiones del payload generado por trazabilidad queda para v2.
- **Doc suplente sin archivo fuente**: al borrarlo (`onDelete: SetNull`), las líneas mensuales pierden la referencia pero no se borran. No se regenera automáticamente.
- **Cupos asumen distribución uniforme** (`weeksInMonth()`): no contempla feriados, semanas reducidas o jornadas especiales. Las definidas por el calendario MEP se asumen "hábiles".
- **Slots LESSON sin categoría asignada**: si el docente dejó slots LESSON con `category=null`, el cupo de esa categoría queda en 0 capacidad. La IA igual genera líneas hasta el cupo Anexo 1 y el assigner las marca como `NO_SLOTS_FOR_CATEGORY` en warnings. Solución: completar el horario en `/horario` antes de generar.
- **Validación de cupos vs IA**: si la IA propone más que el cupo, `normalizeMonthlyLines` recorta empezando por la última línea (puede dejar descripciones cortadas o líneas con `lessonCount=0` que se eliminan). Si propone menos, se agrega una línea genérica con `defaultLineDescription`. Comportamiento conservador; un re-prompt con feedback queda para v2.
- **Prompts no editables desde UI**: los prompts viven en `lib/assistant/`; ajustes finos requieren código + redeploy.
- **Fallback heurístico no aplica a F-2**: si no hay IA configurada, `/ai-generate` responde 422 `AI_NOT_CONFIGURED`. El heurístico de F-1 (extracción) no genera planes mensuales razonables, así que no se reusa.
- **Modal IA es bloqueante (~20-40s)**: igual que F-1, el cliente espera. Cuando el piloto crezca, migrar a job queue con polling.

**Próxima sesión:** **Sesión G → Fase 7** (pipeline de sesiones unificado: bitácora alimentada por objetivos derivados, vínculo planificación → sesiones programadas por estudiante, `/sesiones` global, adjuntos).

---

*Este documento debe actualizarse al inicio/cierre de cada sesión de desarrollo.*
