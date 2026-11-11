// Adaptador de CMO Cardiovascular al flujo común CMO (núcleo en assets/cmo-ds/).
// No contiene reglas clínicas: el único motor es stratify() de cmo-engine.js; necesidades e
// intervenciones salen de needs-mapper.js e interventions-catalog.js, que no se modifican.
import { VARIABLES, BLOCKS, MAX_SCORE } from './config.js';
import { stratify } from './cmo-engine.js';
import { mapNeeds } from './needs-mapper.js';
import { interventionsFor, periodicity } from './interventions-catalog.js';
import { INTERVENTION_STATUSES } from '../cmo-ds/cmo-report.js';

export const CASE_SCHEMA = 'cmo-rcv-case/1';
export const APP_ID = 'cmo-riesgo-cardiovascular';
export const TOOL_NAME = 'CMO Cardiovascular';
export const SOURCE_DOCUMENT = 'Adaptación del Modelo de Atención Farmacéutica CMO en el Paciente con Patologías Cardiovasculares';
export const VALIDATED = ['confirmed', 'modified', 'manual'];
export const priorityLabel = p => `Prioridad ${p}`;
export const GOAL_LABELS = { pharmacotherapy: 'Objetivos farmacoterapéuticos acordados', patient: 'Objetivos del paciente', barriers: 'Barreras y disposición al cambio', actions: 'Acciones acordadas' };
const ORIGIN_LABELS = { confirmed: 'análisis de texto, confirmada', modified: 'análisis de texto, corregida', manual: 'manual' };

const variable = id => VARIABLES.find(v => v.id === id);
const option = (v, value) => v?.options.find(o => o.value === value);
const isValidated = r => !!r && VALIDATED.includes(r.validation) && !!option(variable(r.id), r.value);
const str = (v, max) => String(v ?? '').trim().slice(0, max);

/** Ejecuta el motor original y añade la información de flujo: pendientes, provisionalidad y alcance máximo. */
export function evaluate(state) {
  const records = state.records || [];
  const o = state.override || {};
  const manualPriority = [1, 2].includes(Number(o.priority)) ? Number(o.priority) : null;
  const base = stratify(records);
  if (!base.applicable) return { result: base, applicable: false, pending: [], provisional: false, details: [] };
  // La elevación solo se pasa al motor si eleva de verdad y tiene motivo: así el motor nunca lanza y el resultado calculado se conserva.
  const elevates = manualPriority && manualPriority < base.calculated && str(o.reason, 2000).length > 0;
  const result = elevates ? stratify(records, { manualPriority, manualReason: str(o.reason, 2000) }) : base;
  const byId = new Map(records.map(r => [r.id, r]));
  const details = VARIABLES.map(v => {
    const r = byId.get(v.id), ok = isValidated(r), op = ok ? option(v, r.value) : null;
    return { variable: v, record: r, pending: !ok, response: op?.label || 'Pendiente', points: op?.score || 0, origin: ok ? ORIGIN_LABELS[r.validation] : '', assisted: ok && r.validation !== 'manual' };
  });
  const pending = details.filter(d => d.pending).map(d => d.variable);
  // Peor escenario: cada variable pendiente con su opción de mayor puntuación, calculado con el motor original.
  const worstRecords = [...records.filter(isValidated), ...pending.filter(v => v.id !== 'age' || true).map(v => ({ id: v.id, value: [...v.options].filter(x => x.value !== '<18').sort((a, b) => b.score - a.score)[0].value, validation: 'manual' }))];
  const worst = pending.length ? stratify(worstRecords) : base;
  return {
    result, applicable: true, details, pending, provisional: pending.length > 0,
    maxPossible: { total: worst.total, priority: worst.calculated }, priorityMayChange: worst.calculated !== base.calculated,
    overrideRequested: !!manualPriority, overrideApplied: !!result.override,
    overrideIgnoredReason: manualPriority && !result.override ? (manualPriority >= base.calculated ? 'La prioridad elegida no eleva la calculada por el modelo: no se aplica.' : 'Falta el motivo de la elevación: no se aplica.') : '',
    assistedCount: details.filter(d => d.assisted).length
  };
}

/** Necesidades confirmadas (needs-mapper original) y potenciales: las que generaría una variable pendiente si resultara positiva. */
export function needsFor(state, ev) {
  const confirmed = mapNeeds(state.records || []);
  const potential = ev.pending.flatMap(v => {
    const worst = [...v.options].filter(x => x.value !== '<18').sort((a, b) => b.score - a.score)[0];
    return worst.score > 0 ? mapNeeds([{ id: v.id, value: worst.value, validation: 'manual' }]) : [];
  });
  return { confirmed, potential };
}

export const interventionStatus = (state, id) => (Object.hasOwn(INTERVENTION_STATUSES, state.statuses?.[id]) ? state.statuses[id] : 'recommended');

/** Entrada para createReport() (cmo-report/1): única fuente del texto para HCE, la impresión y el PDF. */
export function buildReportInput(state, ev, { version = '' } = {}) {
  const r = ev.result;
  const base = {
    title: 'Atención farmacéutica cardiovascular — Modelo CMO', tool: { name: TOOL_NAME, version },
    model: { name: SOURCE_DOCUMENT, source: `Basado en el documento «${SOURCE_DOCUMENT}» (metodología CMO, MAPEX-SEFH).` },
    evaluationDate: state.meta?.date || '', hospital: state.meta?.hospital, pharmacist: state.meta?.pharmacist, patientId: state.meta?.code
  };
  if (!ev.applicable) return { ...base, status: 'provisional', stratification: { calculatedLevel: 'Modelo no aplicable', finalLevel: 'Modelo no aplicable' }, warnings: [r.reason] };
  const needs = needsFor(state, ev);
  const catalog = interventionsFor(r.priority, state.resources || []);
  const byStatus = status => catalog.filter(i => interventionStatus(state, i.id) === status).map(i => ({ group: i.category, label: i.label }));
  const label = id => variable(id)?.label || id;
  const warnings = [];
  if (ev.provisional) {
    warnings.push(`Resultado provisional: ${ev.pending.length} de ${VARIABLES.length} variable(s) pendiente(s) de valoración. Una variable pendiente no se ha considerado negativa: no puntúa hasta que se valide.`);
    warnings.push(`Si las variables pendientes resultaran positivas, la puntuación podría alcanzar ${ev.maxPossible.total}/${MAX_SCORE}${ev.priorityMayChange ? ` y la prioridad podría llegar a ${priorityLabel(ev.maxPossible.priority)}` : '; la prioridad no cambiaría'}.`);
  }
  const unavailable = catalog.filter(i => !i.available && interventionStatus(state, i.id) === 'recommended');
  if (unavailable.length && (state.resources || []).length) warnings.push(`Intervenciones recomendadas por el modelo sin recurso disponible en el centro: ${unavailable.map(i => i.label).join('; ')}.`);
  return {
    ...base, status: ev.provisional ? 'provisional' : 'final',
    stratification: {
      score: r.total, maxScore: MAX_SCORE, subtotals: Object.entries(BLOCKS).map(([k, b]) => ({ label: b.label, points: r.blocks[k], max: b.max })),
      calculatedLevel: priorityLabel(r.calculated), finalLevel: priorityLabel(r.priority), levelCode: r.priority,
      rules: r.pregnancy ? ['Prioridad 1 por regla de embarazo'] : [],
      override: r.override ? { level: priorityLabel(r.priority), motive: 'Elevación por criterio profesional', justification: r.manualReason } : null,
      pending: ev.pending.map(v => v.label), assistedCount: ev.assistedCount
    },
    factors: ev.details.filter(d => !d.pending && d.points > 0).map(d => ({ dimension: BLOCKS[d.variable.block].label, label: d.variable.label, detail: d.response, points: d.points })),
    needs: {
      confirmed: needs.confirmed.map(n => ({ label: n.label, detail: `variable: ${label(n.trigger)}` })),
      potential: needs.potential.map(n => ({ label: n.label, detail: `variable pendiente: ${label(n.trigger)}` }))
    },
    interventions: { done: byStatus('done'), planned: byStatus('planned'), recommended: byStatus('recommended'), notApplicableCount: byStatus('not_applicable').length },
    plan: {
      periodicity: `Periodicidad orientativa según el modelo CMO: ${periodicity(r.priority)}`,
      goals: Object.entries(GOAL_LABELS).filter(([k]) => state.goals?.[k]).map(([k, l]) => ({ label: l, detail: state.goals[k] }))
    },
    warnings
  };
}

/** Datos estructurados confirmados (cmo-rcv-case/1). El texto clínico pegado y las propuestas sin validar no se exportan. */
export function serializeCase(state) {
  const n = normalizeCase(state);
  return { schema: CASE_SCHEMA, meta: n.meta, records: n.records.map(({ id, value, validation }) => ({ id, value, validation })), override: n.override, goals: n.goals, resources: n.resources, statuses: n.statuses };
}

const RESOURCES = ['seguimiento', 'educacion', 'adherencia', 'telefarmacia', 'telemonitorizacion', 'conciliacion', 'interacciones', 'cardiologia'];
/** Valida y sanea un caso importado. Solo sobreviven variables, valores y estados que existen en el modelo. */
export function normalizeCase(input) {
  const src = input && typeof input === 'object' ? input : {};
  const records = [];
  for (const v of VARIABLES) {
    const r = (Array.isArray(src.records) ? src.records : []).find(x => x && x.id === v.id);
    if (r && VALIDATED.includes(r.validation) && option(v, r.value)) records.push({ id: v.id, value: r.value, validation: r.validation, origin: r.validation === 'manual' ? 'manual' : 'local', evidence: r.validation === 'manual' ? 'Introducción manual por el farmacéutico' : str(r.evidence, 300), finding: 'validada' });
  }
  const o = src.override || {};
  const m = src.meta || {};
  const ids = interventionsFor(1).map(i => i.id);
  return {
    meta: { date: /^\d{4}-\d{2}-\d{2}$/.test(m.date || '') ? m.date : '', hospital: str(m.hospital, 200), pharmacist: str(m.pharmacist, 200), code: str(m.code, 60) },
    records,
    override: [1, 2].includes(Number(o.priority)) ? { priority: Number(o.priority), reason: str(o.reason, 2000) } : { priority: '', reason: '' },
    goals: Object.fromEntries(Object.keys(GOAL_LABELS).map(k => [k, str(src.goals?.[k], 2000)])),
    resources: (Array.isArray(src.resources) ? src.resources : []).filter(x => RESOURCES.includes(x)),
    statuses: Object.fromEntries(Object.entries(src.statuses && typeof src.statuses === 'object' ? src.statuses : {}).filter(([id, s]) => ids.includes(id) && Object.hasOwn(INTERVENTION_STATUSES, s) && s !== 'recommended'))
  };
}

export function csvRows(state, ev) {
  const r = ev.result;
  return [['campo', 'valor'], ['esquema', CASE_SCHEMA], ['codigo', state.meta.code], ['hospital', state.meta.hospital], ['farmaceutico', state.meta.pharmacist], ['fecha', state.meta.date],
    ['aplicable', ev.applicable ? 'si' : 'no'], ['estado', ev.provisional ? 'provisional' : 'definitiva'], ['puntuacion_total', r.total ?? ''], ['puntuacion_maxima', MAX_SCORE],
    ...Object.keys(BLOCKS).map(k => [`puntuacion_${k}`, r.blocks?.[k] ?? '']), ['prioridad_calculada', r.calculated ?? ''], ['prioridad_final', r.priority ?? ''],
    ['regla_embarazo', r.pregnancy ? 'si' : 'no'], ['elevacion_profesional', r.override ? r.manualReason : ''], ['variables_pendientes', ev.pending.length],
    ...ev.details.map(d => [`var_${d.variable.id}`, d.pending ? 'pendiente' : d.record.value])];
}
