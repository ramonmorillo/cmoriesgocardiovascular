# Changelog

## 1.3.0 — 2026-11-11

Adopción del núcleo común del ecosistema CMO (informe único, PDF, exportación) y corrección de defectos funcionales. **Sin cambios en la matriz clínica ni en el motor**: `config.js`, `cmo-engine.js`, `needs-mapper.js`, `interventions-catalog.js`, `heuristic-extraction.js` y `clinical-extraction-service.js` son idénticos byte a byte (huellas en `tests/fixtures/clinical.sha256.json`). Por eso `APP_CONFIG.version` sigue en 1.2.0: la versión se fija en el commit de publicación.

### Estado provisional
- Con variables pendientes el resultado se rotula **PROVISIONAL** y se informa de cuántas faltan y de la puntuación y prioridad máximas alcanzables (calculadas con el motor original). Antes, con 0/20 variables se mostraba «PRIORIDAD 3» sin matiz.
- Necesidades: confirmadas (igual que antes) y **potenciales** (las que `needs-mapper` asociaría a variables aún pendientes).

### Defectos corregidos
- Una variable validada en la revisión que luego se dejaba pendiente en el paso 4 seguía puntuando.
- Marcar un recurso borraba las intervenciones seleccionadas.
- Volver a Inicio y pulsar «Estratificar a mano» dejaba los pasos 5–7 desbloqueados sin resultado (`TypeError`).
- La elevación profesional se perdía al volver al paso 4; una elevación sin motivo o que no elevaba se ignoraba sin explicarlo.
- El informe afirmaba «Sin alertas adicionales detectadas» aunque la herramienta no evalúa alertas: se elimina esa sección.

### Flujo e informe
- Revisión: aviso de posible negación junto a la evidencia (no cambia la propuesta del extractor) y opción «Dejar pendiente».
- Intervenciones: estado por intervención (realizada, planificada, no procede) en lugar de casilla.
- Informe único `cmo-report/1`: copiar para historia clínica (con confirmación visible), **PDF real**, imprimir solo el informe y descarga `.txt` (sustituye a la descarga Markdown).
- Exportación JSON (`cmo-export/1` + `cmo-rcv-case/1`) y CSV protegido frente a fórmulas; **importación validada** que recalcula siempre el resultado con el motor.
- Confirmación accesible antes de borrar o sustituir; aviso al salir con datos sin exportar; avisos no bloqueantes en lugar de `alert()`.
- Accesibilidad: `aria-current` en el paso activo, etiquetas asociadas en los pasos 3, 4, 5 y 7 (antes 42 campos sin nombre accesible), 0 infracciones axe WCAG A/AA en las 7 etapas.

### Pruebas
- `npm test`: 22 (7 del motor originales, 11 del adaptador, 4 de firma). `npm run test:e2e`: 4 recorridos en Chromium.

### Pendiente de decisión del autor
- El extractor sigue sin tratar la negación ni el género («Niega HTA» se propone como riesgo; «fumadora» no se detecta): ahora se avisa, pero las reglas no se han tocado.
- Pie «Septiembre de 2026» y `releaseDate` 2026-10-30 no se han tocado.

## 1.2.0 — 2026-10-30 — Identidad CMO Design System

Publicación: 1.1.0 → 1.2.0 (decisión del autor: versión menor por el cambio de interfaz) en `APP_CONFIG.version`, `package.json` y `cmo-app-meta`. CMO Design System actualizado a 0.2.0 (firma multilingüe, compatible). `cmo-app-meta`: `status: "released"`, `releaseDate: "2026-10-30"`. Sin cambios en el motor ni en las variables.

### Cambios incluidos (antes «sin publicar»)

Cambio exclusivamente visual. Sin cambios en `assets/modules/*` ni `assets/app.js`.
- Copia fijada del CMO Design System 0.1.0 en `assets/cmo-ds/` (manifiesto SHA-256).
- `assets/cmo-visual.css` reescrito como tema «Estratos» (cargado tras `styles.css`); `styles.css` remapea `--ink/--muted/--brand/--brand2/--soft/--line` a tokens. `--warn`, `--danger` y avisos sin cambios.
- Accesibilidad: foco con teclado de #ffbf47 (1,6:1) a #1f3aa8 (9,4:1); borde de campos de #b8c9c7 (1,7:1) a #7b8495 (≥3:1). Corrige dos defectos previos en móvil: barra de pasos con los primeros pasos cortados e inalcanzables, y desbordamiento horizontal (107 px a 320 px; 52 px a 375 px).
- Pie: firma `<cmo-author-signature>` (fuente clínica declarada en `CLINICAL_MODEL.md`); favicon del ecosistema.
- Pruebas: `tests/cmo-ds.test.js` (versión = `APP_CONFIG.version` = `package.json`, atribución, integridad).

## 1.1.0 — 2026-09-10

- Nueva pantalla inicial con hospital/centro, farmacéutico responsable e identificador pseudonimizado opcional.
- Dos itinerarios de entrada: estratificación manual o análisis asistido de texto clínico.
- Navegación adaptada al itinerario elegido y aclaración visible sobre el uso de reglas locales cuando no existe un endpoint seguro de IA.
- Autoría y fecha de creación visibles en el pie de la herramienta.

## 1.0.0 — 2026-09-09

- Flujo completo en seis etapas con extracción local y revisión humana.
- Motor de 20 variables, suma sobre 42, reglas especiales y tests.
- Necesidades, intervenciones acumulativas/factibles, objetivos compartidos e informe exportable.
- Diseño responsive, impresión, reinicio seguro y documentación técnica/clínica.
