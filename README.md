# CMO Cardiovascular

Herramienta estática de apoyo a la decisión para el farmacéutico hospitalario: historia clínica → extracción orientativa → validación → estratificación → necesidades → intervenciones → informe.

> No sustituye el juicio profesional. La transcripción clínica debe cotejarse con el documento autorizado antes del uso asistencial; consulte `CLINICAL_MODEL.md`.

## Uso local

```bash
python3 -m http.server 8000
# abrir http://localhost:8000
npm test
```

No requiere instalación ni build. GitHub Pages puede publicar la rama principal desde `/ (root)`. Todos los enlaces son relativos.

## Flujo y garantías

1. Pegado de texto pseudonimizado y extractor heurístico conservador.
2. Revisión de evidencia/confianza; confirmación, modificación o descarte.
3. Completar pendientes y calcular solo con validaciones humanas.
4. Necesidades trazables y objetivos compartidos.
5. Intervenciones acumulativas filtradas por factibilidad, sin ocultar carencias.
6. Informe Markdown, portapapeles, descarga, impresión/PDF y trazabilidad.

El estado solo vive en memoria. No se usan dependencias externas, trackers ni persistencia. “Nueva estratificación” solicita confirmación y borra todo.

## Endpoint opcional

Defina antes de `app.js`:

```html
<script>window.CMO_APP_CONFIG={extractionEndpointUrl:'https://endpoint-seguro.example/extract'}</script>
```

El navegador envía `{ clinicalText, variables, instructions }`. Nunca coloque claves API en frontend. Consulte `AI_POLICY.md`, `PRIVACY.md` y `ARCHITECTURE.md`.

## Limitaciones

- La heurística local no comprende plenamente negaciones, temporalidad ni contexto.
- No existe validación clínica/regulatoria ni integración HCE.
- Las alertas exhaustivas de anexos quedan pendientes de cotejo con el documento fuente redistribuible.
- La exactitud de la matriz y actuaciones requiere firma del responsable clínico antes de despliegue asistencial.
