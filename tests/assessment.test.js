// Adaptador de flujo (assets/modules/assessment.js). El motor y los catálogos clínicos no se modifican.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
globalThis.window = { CMO_APP_CONFIG: {} };
const { VARIABLES, MAX_SCORE } = await import('../assets/modules/config.js');
const { stratify } = await import('../assets/modules/cmo-engine.js');
const { mapNeeds } = await import('../assets/modules/needs-mapper.js');
const { interventionsFor } = await import('../assets/modules/interventions-catalog.js');
const A = await import('../assets/modules/assessment.js');
const { createReport, validateReport, reportToText } = await import('../assets/cmo-ds/cmo-report.js');
const { reportToPdf } = await import('../assets/cmo-ds/cmo-pdf.js');

const max = v => [...v.options].sort((a, b) => b.score - a.score)[0];
const zero = v => v.options.find(o => o.score === 0 && o.value !== '<18');
const rec = (v, o, validation = 'manual') => ({ id: v.id, value: o.value, validation });
const state = (records, extra = {}) => ({ records, meta: { date: '2026-11-10', hospital: 'Hospital Ficticio', pharmacist: 'Farmacéutica Ficticia', code: 'RCV-0001' }, goals: {}, resources: [], statuses: {}, override: { priority: '', reason: '' }, ...extra });
// Misma construcción que tests/cmo-engine.test.js para alcanzar un total exacto.
const fakeTotal = n => { let left = n; return VARIABLES.map(v => { const opts = [...v.options].sort((a, b) => b.score - a.score), o = (n < 42 && v.id === 'pregnancy' ? null : opts.find(x => x.score <= left && x.value !== '<18')) || zero(v); left -= o.score; return { id: v.id, value: o.value, validation: 'confirmed' }; }); };

test('los ficheros clínicos no se han modificado (huellas de la versión 1.2.0)', () => {
  const expected = JSON.parse(fs.readFileSync(new URL('./fixtures/clinical.sha256.json', import.meta.url), 'utf8'));
  for (const [file, hash] of Object.entries(expected)) assert.equal(crypto.createHash('sha256').update(fs.readFileSync(new URL(`../assets/modules/${file}`, import.meta.url))).digest('hex'), hash, file);
});

test('fronteras 16/17 y 22/23: el adaptador devuelve exactamente el resultado del motor', () => {
  for (const [n, p] of [[0, 3], [16, 3], [17, 2], [22, 2], [23, 1], [42, 1]]) {
    const records = fakeTotal(n), ev = A.evaluate(state(records));
    assert.equal(ev.result.total, n); assert.equal(ev.result.priority, p);
    assert.deepEqual(ev.result, stratify(records));
    assert.equal(ev.provisional, false);
  }
});

test('paridad por variable y opción', () => {
  for (const v of VARIABLES) for (const o of v.options) {
    const records = [rec(v, o)];
    assert.deepEqual(A.evaluate(state(records)).result, stratify(records), `${v.id}=${o.value}`);
  }
});

test('sin datos: provisional, 20 pendientes y alcance máximo calculado con el motor', () => {
  const ev = A.evaluate(state([]));
  assert.equal(ev.provisional, true); assert.equal(ev.pending.length, VARIABLES.length);
  assert.deepEqual(ev.maxPossible, { total: MAX_SCORE, priority: 1 });
  const text = reportToText(createReport(A.buildReportInput(state([]), ev)));
  assert.match(text, /PRIORIDAD 3 \(PROVISIONAL\)/);
  assert.match(text, /no se ha considerado negativa/);
});

test('propuestas sin validar o descartadas no puntúan ni se exportan', () => {
  const v = VARIABLES.find(x => x.id === 'hypertension');
  const s = state([{ id: v.id, value: 'risk', validation: 'suggested', evidence: 'HTA' }, { id: 'lifestyle', value: null, validation: 'rejected' }]);
  const ev = A.evaluate(s);
  assert.equal(ev.result.total, 0); assert.equal(ev.pending.length, VARIABLES.length);
  assert.deepEqual(A.serializeCase(s).records, []);
});

test('embarazo → Prioridad 1 (regla del modelo) y menor de 18 → no aplicable', () => {
  const preg = VARIABLES.find(v => v.id === 'pregnancy');
  const ev = A.evaluate(state([rec(preg, max(preg))]));
  assert.equal(ev.result.priority, 1);
  assert.match(reportToText(createReport(A.buildReportInput(state([rec(preg, max(preg))]), ev))), /Regla especial: Prioridad 1 por regla de embarazo/);
  const s = state([{ id: 'age', value: '<18', validation: 'manual' }]);
  const minor = A.evaluate(s);
  assert.equal(minor.applicable, false);
  assert.match(reportToText(createReport(A.buildReportInput(s, minor))), /Modelo no aplicable[\s\S]*pediátrico/);
});

test('elevación profesional: solo eleva, exige motivo, conserva la prioridad calculada y nunca lanza', () => {
  const s = state(fakeTotal(10), { override: { priority: 1, reason: '' } });
  let ev = A.evaluate(s);
  assert.equal(ev.result.priority, 3); assert.match(ev.overrideIgnoredReason, /Falta el motivo/);
  s.override.reason = 'Fragilidad clínica documentada';
  ev = A.evaluate(s);
  assert.equal(ev.result.priority, 1); assert.equal(ev.result.calculated, 3); assert.equal(ev.result.override, true);
  const text = reportToText(createReport(A.buildReportInput(s, ev)));
  assert.match(text, /Resultado calculado por el modelo: Prioridad 3/);
  assert.match(text, /Modificación por criterio profesional: Prioridad 1[\s\S]*Fragilidad clínica documentada/);
  const high = state(fakeTotal(30), { override: { priority: 2, reason: 'x' } });
  ev = A.evaluate(high);
  assert.equal(ev.result.priority, 1, 'no se puede rebajar'); assert.match(ev.overrideIgnoredReason, /no eleva/);
});

test('necesidades: confirmadas = needs-mapper original; potenciales solo de variables pendientes', () => {
  const lip = VARIABLES.find(v => v.id === 'lipids'), records = [rec(lip, max(lip))];
  const s = state(records), n = A.needsFor(s, A.evaluate(s));
  assert.deepEqual(n.confirmed, mapNeeds(records));
  assert.ok(n.potential.length > 0 && n.potential.every(x => x.trigger !== 'lipids'));
  const full = state(fakeTotal(42));
  assert.deepEqual(A.needsFor(full, A.evaluate(full)).potential, []);
});

test('informe: intervenciones por estado según el catálogo original; sin afirmaciones no respaldadas', () => {
  const s = state(fakeTotal(23), { resources: ['seguimiento'], statuses: { review: 'done', adherence: 'planned', education: 'not_applicable' } });
  const ev = A.evaluate(s), report = createReport(A.buildReportInput(s, ev, { version: '1.2.0' }));
  assert.deepEqual(validateReport(report), []);
  assert.equal(report.status, 'final');
  const catalog = interventionsFor(1, ['seguimiento']);
  assert.equal(report.interventions.done.length + report.interventions.planned.length + report.interventions.recommended.length + report.interventions.notApplicableCount, catalog.length);
  assert.equal(report.interventions.done[0].label, catalog.find(i => i.id === 'review').label);
  const text = reportToText(report);
  assert.match(text, /RESULTADO DE ESTRATIFICACIÓN: PRIORIDAD 1$/m);
  assert.match(text, /Puntuación total: 23\/42/);
  assert.match(text, /Revaloración orientativa cada 3–6 meses|Revaloración orientativa cada 3-6 meses/);
  assert.doesNotMatch(text, /Sin alertas adicionales/, 'no se afirma la ausencia de alertas que nunca se evalúan');
  assert.ok(Buffer.from(reportToPdf(report)).toString('latin1').includes('RCV-0001'));
});

test('importación: se sanea y el resultado se recalcula; lo ajeno al modelo se descarta', () => {
  const s = state(fakeTotal(17), { override: { priority: 1, reason: 'Motivo' }, statuses: { review: 'done', inventada: 'done' }, resources: ['seguimiento', 'x'] });
  const data = JSON.parse(JSON.stringify(A.serializeCase(s)));
  data.records.push({ id: 'inventada', value: 'risk', validation: 'manual' }, { id: 'lipids', value: '<script>', validation: 'manual' });
  data.result = { total: 1, priority: 3 };
  const back = A.normalizeCase(data);
  assert.equal(back.records.length, 20);
  assert.deepEqual(Object.keys(back.statuses), ['review']);
  assert.deepEqual(back.resources, ['seguimiento']);
  assert.equal(A.evaluate({ ...state([]), ...back }).result.total, 17);
  assert.equal(back.result, undefined);
});

test('sin red (salvo el endpoint opcional ya existente), sin almacenamiento y sin rótulo de IA para las reglas locales', () => {
  for (const f of ['../assets/app.js', '../assets/modules/assessment.js']) {
    const src = fs.readFileSync(new URL(f, import.meta.url), 'utf8');
    assert.doesNotMatch(src, /\bfetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB|\balert\s*\(|https?:\/\//, f);
  }
});
