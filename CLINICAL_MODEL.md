# Modelo clínico CMO cardiovascular

## Control documental

La fuente clínica declarada es **“Adaptación del Modelo de Atención Farmacéutica CMO en el Paciente con Patologías Cardiovasculares”**. La aplicación centraliza la matriz ejecutable en `assets/modules/config.js`; ningún componente de interfaz asigna puntos. Dado que el documento original no está redistribuido en el repositorio, esta transcripción requiere validación documental final por el responsable clínico antes de uso asistencial.

## Matriz de 20 variables (máximo 42)

| # | Bloque | Variable | Respuestas y puntos | Máx. |
|---:|---|---|---|---:|
| 1 | Demográfico | Edad | 18–64: 0; 65–74: 1; ≥75: 2; <18: no aplicable | 2 |
| 2 | Demográfico | Embarazo | No: 0; sí: 2 y regla P1 | 2 |
| 3 | Demográfico | Peso/estado nutricional | normal: 0; sobrepeso: 1; obesidad/desnutrición: 2 | 2 |
| 4 | Demográfico | Sexo en situaciones cardiovasculares específicas | no: 0; situación específica: 1 | 1 |
| 5 | Clínico | Patología cardiovascular de base | sin mayor complejidad: 0; mayor complejidad: 3 | 3 |
| 6 | Clínico | Comorbilidad cardiovascular/combinación de especial riesgo | no: 0; sí: 3 | 3 |
| 7 | Clínico | Comorbilidad no cardiovascular | no relevante: 0; relevante: 2 | 2 |
| 8 | Clínico | Dislipemia/objetivo LDL | controlado: 0; no alcanzado: 2 | 2 |
| 9 | Clínico | Gravedad de la afectación | no grave: 0; grave: 3 | 3 |
| 10 | Clínico | Fracción de eyección | preservada: 0; reducida: 2 | 2 |
| 11 | Clínico | Tromboembolismo | no: 0; antecedente/evento: 2 | 2 |
| 12 | Clínico | Hipertensión arterial | controlada/no: 0; no controlada: 2 | 2 |
| 13 | Clínico | Ingresos/urgencias relacionados, últimos 12 meses | ninguno: 0; ≥1: 1 | 1 |
| 14 | Clínico | Primer año tras evento coronario | no: 0; sí: 1 | 1 |
| 15 | Farmacoterapéutico | Cambios del régimen desde última visita | no: 0; sí: 2 | 2 |
| 16 | Farmacoterapéutico | Complejidad/polimedicación | no: 0; sí: 2 | 2 |
| 17 | Farmacoterapéutico | Medicamentos de alto riesgo | no: 0; ≥1: 2 | 2 |
| 18 | Farmacoterapéutico | Objetivos farmacoterapéuticos | alcanzados: 0; no alcanzados: 2 | 2 |
| 19 | Farmacoterapéutico | Adherencia/persistencia | adecuada: 0; inadecuada: 2 | 2 |
| 20 | Sociosanitario | Actividad física y tabaquismo | actividad adecuada/no fuma: 0; uno de los riesgos: 2; ambos: 4 | 4 |

Máximos por bloque: demográfico **7**, clínico **21**, farmacoterapéutico **10**, sociosanitario **4**. Total: **42**.

## Reglas y cortes

- **P3:** ≤16; **P2:** 17–22; **P1:** ≥23.
- Embarazo confirmado fuerza P1, cualquiera que sea la suma.
- Menores de 18 años no se estratifican: usar CMO pediátrico.
- El profesional solo puede elevar el nivel calculado; debe motivarlo y el informe lo destaca.
- Solo estados `confirmed`, `modified` o `manual` puntúan. Sugerido, rechazado o ausente no puntúa.
- Ausencia de mención nunca equivale a respuesta negativa. Adherencia y estilo de vida requieren entrevista si no existe evidencia.

## Actuaciones

Son acumulativas: P3 incluye educación y revisión basal; P2 añade adherencia, interacciones, conciliación y coordinación; P1 añade seguimiento intensivo, telefarmacia/telemonitorización y coordinación multidisciplinar. El catálogo ejecutable conserva nivel, categoría y recurso necesario. La periodicidad es orientativa: P1 cada 3–6 meses; P2 anual salvo cambios; P3 según necesidad/cambios/criterio.

## Anexos y alertas

Las alertas farmacoterapéuticas se muestran separadas y **no puntúan**. La lista exhaustiva de medicamentos de anexos no se incorpora hasta completar el cotejo autorizado, para evitar inventar reglas clínicas.
