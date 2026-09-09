import {VARIABLES,BLOCKS} from './config.js'; import {periodicity} from './interventions-catalog.js';
export function report(s){const r=s.result;if(!r?.applicable)return '# Informe CMO cardiovascular\n\nModelo no aplicable. '+(r?.reason||'Evaluación incompleta.');const rows=s.records.filter(x=>['confirmed','modified','manual'].includes(x.validation));const pending=s.records.filter(x=>!['confirmed','modified','manual'].includes(x.validation));const ints=s.interventions||[];return `# Informe CMO cardiovascular

## Datos de la evaluación
- Fecha: ${s.meta.date||'No consta'}
- Hospital: ${s.meta.hospital||'No consta'}
- Farmacéutico/a: ${s.meta.pharmacist||'No consta'}
- Identificador pseudonimizado: ${s.meta.code||'No consta'}

## Resumen
**PRIORIDAD ${r.priority} — ${r.total}/42 puntos.** ${r.pregnancy?'Prioridad 1 por regla de embarazo. ':''}${r.override?`Nivel elevado por criterio profesional. Motivo: ${r.manualReason}.`:''}

## Resultado por bloques
${Object.entries(BLOCKS).map(([k,b])=>`- ${b.label}: ${r.blocks[k]}/${b.max}`).join('\n')}

## Variables relevantes
${rows.filter(x=>VARIABLES.find(v=>v.id===x.id)?.options.find(o=>o.value===x.value)?.score>0).map(x=>`- ${VARIABLES.find(v=>v.id===x.id).label}: ${VARIABLES.find(v=>v.id===x.id).options.find(o=>o.value===x.value)?.label} (${x.validation})`).join('\n')||'- Ninguna con puntuación positiva.'}

## Información pendiente
${pending.map(x=>`- ${VARIABLES.find(v=>v.id===x.id).label}: ${x.finding||'no confirmada'}`).join('\n')||'- Ninguna.'}

## Necesidades detectadas
${s.needs.map(n=>`- ${n.label} (variable: ${n.trigger})`).join('\n')||'- Ninguna registrada.'}

## Objetivos farmacoterapéuticos y plan compartido
${Object.entries(s.goals).filter(([,v])=>v).map(([k,v])=>`- ${k}: ${v}`).join('\n')||'- No registrados.'}

## Intervenciones seleccionadas
${ints.filter(i=>s.selected.includes(i.id)).map(i=>`- [${i.category}] ${i.label}`).join('\n')||'- Ninguna.'}

## Recomendadas no disponibles
${ints.filter(i=>!i.available).map(i=>`- ${i.label}`).join('\n')||'- Ninguna.'}

## Alertas farmacoterapéuticas
${s.alerts.map(a=>`- ${a}`).join('\n')||'- Sin alertas adicionales detectadas.'}

## Plan de seguimiento
Periodicidad orientativa según el modelo CMO: ${periodicity(r.priority)}

## Trazabilidad de la extracción
${rows.map(x=>`- ${VARIABLES.find(v=>v.id===x.id).label}: ${x.origin||'manual'} / ${x.validation}; evidencia: ${x.evidence||'no aportada'}`).join('\n')}

> Herramienta de apoyo a la decisión clínica; no sustituye el juicio profesional del farmacéutico.`;}
export const download=(content,name='informe-cmo-cardio.md')=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([content],{type:'text/markdown'}));a.download=name;a.click();URL.revokeObjectURL(a.href);};
