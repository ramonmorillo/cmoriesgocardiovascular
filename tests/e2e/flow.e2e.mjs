// Recorrido extremo a extremo de CMO Cardiovascular en Chromium (Playwright). Datos ficticios.
//   npm run test:e2e            (requiere Playwright con Chromium)
//   AXE_PATH=<axe.min.js>       añade la auditoría WCAG A/AA en cada etapa
//   E2E_OUT=<carpeta>           guarda el PDF, el texto y las capturas
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { try { ({ chromium } = await import('playwright')); } catch { chromium = null; } }
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = process.env.E2E_OUT;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.json': 'application/json' };
let server, browser, base;
const external = [];

before(async () => {
  if (!chromium) return;
  server = http.createServer((req, res) => {
    let file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(root)) { res.writeHead(403); res.end(); return; }
    if (file.endsWith(path.sep)) file += 'index.html';
    fs.readFile(file, (err, data) => { if (err) { if (process.env.E2E_DEBUG) console.log('404', req.url); res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' }); res.end(data); });
  });
  await new Promise(r => server.listen(0, r));
  base = `http://localhost:${server.address().port}/`;
  browser = await chromium.launch();
  if (OUT) fs.mkdirSync(OUT, { recursive: true });
});
after(async () => { await browser?.close(); server?.close(); });

async function open(viewport = { width: 1280, height: 900 }) {
  const context = await browser.newContext({ viewport, acceptDownloads: true, permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('data:') && !r.url().startsWith('blob:') && r.url() !== 'about:srcdoc') external.push(r.url()); });
  await page.goto(base);
  return { page, errors, context };
}
const save = async (download, name) => { const file = path.join(OUT || fs.mkdtempSync('/tmp/cmo-rcv-'), name); await download.saveAs(file); return file; };
async function axe(page, label) {
  if (!process.env.AXE_PATH) return;
  await page.evaluate(() => { const t = document.querySelector('.cmo-toast'); if (t) t.hidden = true; }); // el aviso temporal no forma parte de la etapa
  await page.addScriptTag({ path: process.env.AXE_PATH });
  const violations = await page.evaluate(async () => (await window.axe.run(document, { preload: false, runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations.map(v => `${v.id}(${v.nodes.length}): ${v.nodes.map(n => n.html.slice(0, 90)).join(' | ')}`));
  assert.deepEqual(violations, [], `axe ${label}`);
}
const skip = { skip: !chromium && 'Playwright no disponible' };
const identify = async page => { await page.fill('#hospital', 'Hospital Ficticio'); await page.fill('#pharmacist', 'Farmacéutica Ficticia'); await page.fill('#patient-code', 'RCV-0001'); };
const current = page => page.locator('#steps [aria-current="step"]').textContent();
const set = (page, id, value) => page.selectOption(`#var-${id}`, value);
const dialog = (page, label) => page.click(`dialog button:has-text("${label}")`);

test('recorrido manual: provisional → definitivo, elevación, intervenciones, informes y exportación', skip, async () => {
  const { page, errors } = await open();
  await axe(page, 'inicio');
  await page.click('#manual-route');
  assert.match(await page.textContent('#start-error'), /Indique el hospital/);
  await identify(page);
  await page.click('#manual-route');
  assert.match(await current(page), /4 Estratificación/);
  assert.equal(await page.locator('#steps button:disabled').count(), 5, 'los pasos sin resultado están bloqueados');
  // Sin datos: Prioridad 3 pero PROVISIONAL, con alcance máximo
  await page.click('#calculate');
  assert.match(await page.textContent('#calculation'), /PRIORIDAD 3 · PROVISIONAL/);
  assert.match(await page.textContent('#calculation'), /20 de 20 variables pendientes[\s\S]*podría alcanzar 42\/42 y la prioridad podría llegar a Prioridad 1/);
  // Dos variables positivas; después una se deja pendiente y deja de puntuar (defecto corregido)
  await set(page, 'age', '75+'); await set(page, 'hypertension', 'risk');
  await page.click('#calculate');
  const two = Number((await page.textContent('#calculation .score')).split('/')[0]);
  assert.ok(two > 2);
  await set(page, 'hypertension', '');
  await page.click('#calculate');
  assert.equal(await page.textContent('#calculation .score'), '2/42');
  // Completar todo a «sin riesgo» salvo edad: definitivo
  for (const id of await page.$$eval('[data-var]', els => els.map(e => e.dataset.var))) {
    if (id === 'age') continue;
    const zero = await page.$eval(`#var-${id}`, el => [...el.options].find(o => / — 0$/.test(o.textContent) && o.value).value);
    await set(page, id, zero);
  }
  await page.click('#calculate');
  assert.doesNotMatch(await page.textContent('#calculation'), /PROVISIONAL/);
  assert.match(await page.textContent('#calculation'), /20\/20 variables validadas/);
  // Elevación sin motivo: no se aplica y se explica; con motivo: se aplica y se conserva la calculada
  await page.selectOption('#override', '1'); await page.click('#calculate');
  assert.match(await page.textContent('#calculation'), /PRIORIDAD 3[\s\S]*Falta el motivo/);
  await page.fill('#reason', 'Fragilidad clínica ficticia'); await page.click('#calculate');
  assert.match(await page.textContent('#calculation'), /PRIORIDAD 1[\s\S]*calculada por el modelo: Prioridad 3[\s\S]*Elevación profesional documentada/);
  await axe(page, 'estratificación');
  await page.click('#next');
  assert.match(await current(page), /5 Necesidades/);
  await page.fill('#goal-patient', '<img src=x onerror="window.__xss=1">');
  await axe(page, 'necesidades');
  // Volver al paso 4 conserva la elevación (defecto corregido)
  await page.click('#steps button[data-stage="3"]');
  assert.equal(await page.inputValue('#override'), '1');
  assert.equal(await page.inputValue('#reason'), 'Fragilidad clínica ficticia');
  assert.match(await page.textContent('#calculation'), /PRIORIDAD 1/);
  await page.click('#next'); await page.click('#next');
  assert.match(await current(page), /6 Intervenciones/);
  assert.equal(await page.locator('[data-int]').count(), 10, 'Prioridad 1: catálogo acumulado completo');
  await page.selectOption('[data-int="review"]', 'done'); await page.selectOption('[data-int="telepharmacy"]', 'planned'); await page.selectOption('[data-int="education"]', 'not_applicable');
  await page.check('[data-resource="seguimiento"]');
  assert.equal(await page.inputValue('[data-int="review"]'), 'done', 'cambiar recursos no pierde lo registrado');
  await axe(page, 'intervenciones');
  await page.click('#next');
  const text = await page.inputValue('#report');
  assert.match(text, /RESULTADO DE ESTRATIFICACIÓN: PRIORIDAD 1$/m);
  assert.match(text, /Puntuación total: 2\/42/);
  assert.match(text, /Resultado calculado por el modelo: Prioridad 3/);
  assert.match(text, /Realizadas en esta consulta:\n\s+- Seguimiento farmacoterapéutico: Revisar efectividad/);
  assert.match(text, /Planificadas \/ pendientes:\n\s+- Oportunidad\/telefarmacia/);
  assert.match(text, /Identificador del paciente \(seudonimizado\): RCV-0001/);
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.equal(await page.locator('#report-preview img').count(), 0);
  await axe(page, 'informe');
  await page.click('#copy');
  await page.waitForFunction(() => document.getElementById('copy-status').textContent !== '');
  assert.equal(await page.evaluate(() => navigator.clipboard.readText()), text);
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.click('#pdf')]);
  const bytes = fs.readFileSync(await save(pdf, 'informe-ficticio.pdf'));
  assert.equal(bytes.subarray(0, 8).toString('latin1'), '%PDF-1.4');
  assert.ok(bytes.toString('latin1').includes('RCV-0001'));
  const [txt] = await Promise.all([page.waitForEvent('download'), page.click('#download')]);
  assert.equal(fs.readFileSync(await save(txt, 'informe-ficticio.txt'), 'utf8'), text);
  const printed = page.evaluate(() => new Promise(r => document.addEventListener('cmo:print', () => r(document.querySelector('iframe.cmo-print-frame').contentDocument.body.textContent), { once: true })));
  await page.click('#print');
  assert.ok((await printed).includes('Resultado de estratificación: Prioridad 1'));
  const [json] = await Promise.all([page.waitForEvent('download'), page.click('#export-json')]);
  const jsonFile = await save(json, 'caso-ficticio.json');
  const env = JSON.parse(fs.readFileSync(jsonFile, 'utf8'));
  assert.equal(env.schema, 'cmo-export/1'); assert.equal(env.dataSchema, 'cmo-rcv-case/1'); assert.equal(env.data.records.length, 20);
  const [csv] = await Promise.all([page.waitForEvent('download'), page.click('#export-csv')]);
  assert.match(fs.readFileSync(await save(csv, 'caso-ficticio.csv'), 'utf8'), /"prioridad_final";"1"/);
  // Reinicio con confirmación; importación validada y recalculada
  await page.click('#reset'); await dialog(page, 'Cancelar');
  assert.match(await current(page), /7 Informe/);
  await page.click('#reset'); await dialog(page, 'Borrar todo');
  assert.match(await current(page), /1 Inicio/);
  assert.equal(await page.evaluate(() => localStorage.length + sessionStorage.length), 0, 'sin almacenamiento');
  await identify(page); await page.click('#manual-route'); await set(page, 'age', '65-74'); await page.click('#calculate'); await page.click('#next'); await page.click('#next'); await page.click('#next');
  const tampered = { ...env, data: { ...env.data, result: { total: 1 }, records: [...env.data.records, { id: 'x', value: 'risk', validation: 'manual' }] } };
  const bad = path.join(path.dirname(jsonFile), 'manipulado.json'); fs.writeFileSync(bad, JSON.stringify(tampered));
  const wrong = path.join(path.dirname(jsonFile), 'otro.json'); fs.writeFileSync(wrong, '{"schema":"otro"}');
  await page.setInputFiles('#import-file', wrong);
  await page.waitForFunction(() => /No se ha podido importar/.test(document.querySelector('.cmo-toast')?.textContent || ''));
  await page.setInputFiles('#import-file', bad); await dialog(page, 'Importar y sustituir');
  assert.match(await current(page), /4 Estratificación/);
  assert.match(await page.textContent('#calculation'), /PRIORIDAD 1[\s\S]*20\/20 variables validadas/);
  assert.equal(await page.textContent('#calculation .score'), '2/42', 'el resultado se recalcula; no se toma del fichero');
  assert.deepEqual(errors, []);
});

test('análisis asistido: evidencia, aviso de negación, nada puntúa sin validar y reentrada segura', skip, async () => {
  const { page, errors } = await open();
  await identify(page);
  await page.click('#assisted-route');
  await page.click('#analyse');
  assert.match(await page.textContent('.cmo-toast'), /Introduzca texto/);
  await page.fill('#clinical', 'Mujer de 70 años. Niega HTA. Fumadora no; sedentaria. Polimedicada. FEVI 35 %.');
  await page.click('#analyse');
  assert.match(await current(page), /3 Revisión/);
  const card = id => page.locator(`.review[data-id="${id}"]`);
  assert.match(await card('hypertension').textContent(), /Posible negación/);
  assert.doesNotMatch(await card('complexity').textContent(), /Posible negación/);
  await axe(page, 'revisión');
  await card('age').locator('[data-a="confirm"]').click();
  await card('complexity').locator('[data-a="confirm"]').click();
  await card('hypertension').locator('[data-a="reject"]').click();
  await card('complexity').locator('[data-a="pending"]').click();
  await page.click('#continue');
  await page.click('#calculate');
  assert.equal(await page.textContent('#calculation .score'), '1/42', 'solo la edad confirmada puntúa; lo pendiente y lo descartado no');
  assert.match(await page.textContent('#calculation'), /PROVISIONAL/);
  await page.click('#next'); await page.click('#next'); await page.click('#next');
  const text = await page.inputValue('#report');
  assert.match(text, /PRIORIDAD 3 \(PROVISIONAL\)/);
  assert.match(text, /1 variable\(s\) incorporada\(s\) desde el análisis asistido/);
  assert.doesNotMatch(text, /Niega HTA|Mujer de 70/, 'el texto clínico pegado no llega al informe');
  // Reentrada: volver a Inicio y empezar a mano no deja pasos desbloqueados sin resultado (antes: TypeError)
  await page.click('#steps button[data-stage="0"]');
  await page.click('#manual-route'); await dialog(page, 'Descartar y empezar');
  assert.match(await current(page), /4 Estratificación/);
  assert.equal(await page.locator('#steps button[data-stage="5"]').isDisabled(), true);
  assert.deepEqual(errors, []);
});

test('móvil 375 px: sin desbordamiento horizontal', skip, async () => {
  const { page, errors } = await open({ width: 375, height: 740 });
  await identify(page); await page.click('#manual-route'); await set(page, 'pregnancy', 'risk'); await page.click('#calculate');
  assert.match(await page.textContent('#calculation'), /PRIORIDAD 1[\s\S]*regla de embarazo/);
  for (const n of [3, 4, 5, 6]) {
    if (n > 3) await page.click('#next');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `paso ${n + 1}: desbordamiento ${overflow}px`);
  }
  assert.deepEqual(errors, []);
});

test('sin peticiones a terceros en todo el recorrido', skip, () => { assert.deepEqual(external, []); });
