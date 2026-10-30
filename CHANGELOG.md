# Changelog

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
