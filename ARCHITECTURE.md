# Arquitectura

Aplicación ES Modules sin compilación, desplegable desde la raíz en GitHub Pages.

- `config.js`: única matriz clínica y metadatos.
- `cmo-engine.js`: función pura de suma, bloques, excepciones y override.
- `clinical-extraction-service.js`: adaptador local/remoto.
- `heuristic-extraction.js`: patrones conservadores con evidencia.
- `needs-mapper.js`: trazabilidad variable→necesidad.
- `interventions-catalog.js`: catálogo acumulativo y recursos.
- `data-layer.js`: memoria de pestaña; sin `localStorage`.
- `assessment.js`: adaptador al flujo común (pendientes, alcance máximo, necesidades potenciales, informe `cmo-report/1`, exportación/importación `cmo-rcv-case/1`). Sin reglas clínicas.
- `assets/cmo-ds/`: copia fijada del CMO Design System y del núcleo común (`cmo-report.js`, `cmo-pdf.js`, `cmo-flow.js`).
- `app.js`: controlador de siete etapas y eventos UI.

El endpoint opcional se configura en `window.CMO_APP_CONFIG.extractionEndpointUrl`. No se incluyen secretos. El backend debe autenticar en servidor, aplicar minimización, devolver JSON validado y cumplir la normativa aplicable. La extracción solo produce sugerencias; el motor filtra por estado de validación.
