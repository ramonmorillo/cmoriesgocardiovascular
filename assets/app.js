import { VARIABLES, BLOCKS, APP_CONFIG, MAX_SCORE } from "./modules/config.js";
import { extractClinical } from "./modules/clinical-extraction-service.js";
import { getState, update, reset } from "./modules/data-layer.js";
import { interventionsFor } from "./modules/interventions-catalog.js";
import * as A from "./modules/assessment.js";
import { createReport, validateReport, reportToText, reportToHtml, exportEnvelope, parseEnvelope, toCsv, evidenceAt, NEGATION_NOTE, INTERVENTION_STATUSES } from "./cmo-ds/cmo-report.js";
import { reportToPdf } from "./cmo-ds/cmo-pdf.js";
import { toast, confirmDialog, guardUnsaved, copyText, download, printHtml, safeFilename } from "./cmo-ds/cmo-flow.js";
const stages = [
  "Inicio",
  "Historia clínica",
  "Revisión",
  "Estratificación",
  "Necesidades",
  "Intervenciones",
  "Informe",
];
let stage = 0;
const unlockedStages = new Set([0]);
const app = document.querySelector("#app"),
  nav = document.querySelector("#steps");
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const vBy = (id) => VARIABLES.find((v) => v.id === id);
const option = (v, val) => v.options.find((o) => o.value === val);
function goTo(nextStage) {
  stage = nextStage;
  unlockedStages.add(nextStage);
  render();
}
const needsResult = (i) => i >= 4;
const hasData = () => { const s = getState(); return !!(s.meta.hospital || s.meta.pharmacist || s.meta.code || s.records.some((r) => A.VALIDATED.includes(r.validation))); };
function shell() {
  const s = getState();
  nav.innerHTML = `<ol>${stages
    .map((x, i) => {
      const locked = !unlockedStages.has(i) || (needsResult(i) && !s.result?.applicable);
      return `<li><button type="button" class="step ${i === stage ? "active" : ""}" data-stage="${i}" ${i === stage ? 'aria-current="step"' : ""} ${locked ? "disabled" : ""}><span>${i + 1}</span> ${x}</button></li>`;
    })
    .join("")}</ol>`;
  nav.querySelectorAll("button:not(:disabled)").forEach(
    (b) =>
      (b.onclick = () => {
        stage = +b.dataset.stage;
        render();
      }),
  );
}
function start() {
  const s = getState();
  app.innerHTML = `<section class="panel hero start-panel">
    <span class="badge">NUEVA ESTRATIFICACIÓN</span>
    <h2>Datos de la evaluación</h2>
    <p class="lead">Identifique el centro y al profesional responsable antes de elegir cómo desea iniciar la estratificación.</p>
    <div class="fields start-fields">
      <div><label for="hospital">Hospital o centro sanitario</label><input id="hospital" value="${esc(s.meta.hospital)}" autocomplete="organization" placeholder="Hospital o centro sanitario" required></div>
      <div><label for="pharmacist">Farmacéutico/a responsable</label><input id="pharmacist" value="${esc(s.meta.pharmacist)}" autocomplete="name" placeholder="Nombre del profesional" required></div>
      <div><label for="patient-code">Identificador pseudonimizado <span class="badge">opcional</span></label><input id="patient-code" value="${esc(s.meta.code)}" autocomplete="off" placeholder="Código interno sin datos identificativos"></div>
    </div>
    <div id="start-error" class="error" role="alert" aria-live="polite"></div>
    <h3 class="route-title">¿Cómo desea realizar la estratificación?</h3>
    <div class="route-grid">
      <article class="route-card">
        <span class="route-icon" aria-hidden="true">✍️</span>
        <h3>Estratificación manual</h3>
        <p>Complete directamente las variables del modelo CMO a partir de la información clínica comprobada.</p>
        <button id="manual-route">Estratificar a mano</button>
      </article>
      <article class="route-card">
        <span class="route-icon" aria-hidden="true">✨</span>
        <h3>Análisis asistido del texto clínico</h3>
        <p>Pegue un texto pseudonimizado, revise cada dato extraído y complete después la información pendiente.</p>
        <button id="assisted-route">Analizar el texto clínico</button>
      </article>
    </div>
    <p class="info-note"><b>Importante:</b> si no se configura un servicio seguro de IA, la versión pública utiliza reglas locales orientativas. Ningún resultado se incorpora al cálculo hasta que el farmacéutico lo valida.</p>
  </section>`;

  const saveMeta = () => {
    const hospital = document.querySelector("#hospital").value.trim();
    const pharmacist = document.querySelector("#pharmacist").value.trim();
    const code = document.querySelector("#patient-code").value.trim();
    if (!hospital || !pharmacist) {
      document.querySelector("#start-error").textContent =
        "Indique el hospital o centro sanitario y el farmacéutico responsable.";
      return false;
    }
    s.meta.hospital = hospital;
    s.meta.pharmacist = pharmacist;
    s.meta.code = code;
    return true;
  };
  document.querySelector("#manual-route").onclick = () => {
    if (!saveMeta()) return;
    const proceed = async () => {
      if (s.records.some((r) => A.VALIDATED.includes(r.validation)) && !(await confirmDialog({ title: "Empezar de nuevo a mano", message: "Se descartarán las variables ya validadas de esta estratificación.", confirmLabel: "Descartar y empezar", danger: true }))) return;
      update({ clinicalText: "", records: [], result: null, needs: [], override: { priority: "", reason: "" }, statuses: {}, selected: [] });
      unlockedStages.clear(); unlockedStages.add(0);
      goTo(3);
    };
    proceed();
  };
  document.querySelector("#assisted-route").onclick = () => {
    if (saveMeta()) goTo(1);
  };
}
function history() {
  const s = getState();
  app.innerHTML = `<section class="panel hero"><span class="badge">EXTRACCIÓN LOCAL ORIENTATIVA</span><h2>Extraer información desde la historia clínica</h2><p class="lead">Pegue informe, evolución, antecedentes, analítica, tratamiento o conciliación. Nada se considera cierto hasta que usted lo confirma.</p><label for="clinical">Texto clínico pseudonimizado</label><textarea id="clinical" placeholder="Pegue aquí el texto sin nombre, DNI ni número de historia…">${esc(s.clinicalText)}</textarea><p><small>El texto permanece únicamente en memoria y se elimina al recargar o iniciar una nueva estratificación.</small></p><div class="actions"><button id="analyse">Analizar historia clínica</button></div></section>`;
  document.querySelector("#analyse").onclick = async (e) => {
    const text = document.querySelector("#clinical").value.trim();
    if (!text) { toast("Introduzca texto clínico pseudonimizado.", { type: "warn" }); return; }
    e.target.disabled = true;
    e.target.textContent = "Analizando…";
    try {
      update({ clinicalText: text, records: await extractClinical(text) });
      goTo(2);
    } catch (err) {
      toast(err.message, { type: "error" });
      e.target.disabled = false;
    }
  };
}
// Aviso de posible negación alrededor de la evidencia (solo informa; no cambia la propuesta del extractor).
function negationHint(text, r) {
  if (!text || !r.evidence || r.validation !== "suggested") return false;
  const m = /^Edad: (\d+) años$/.exec(r.evidence);
  const needle = m ? m[1] : r.evidence;
  const i = text.toLowerCase().indexOf(String(needle).toLowerCase());
  return i >= 0 && evidenceAt(text, i, String(needle).length).negated;
}
function review() {
  const s = getState();
  app.innerHTML = `<h2>Revisión de la extracción</h2><p class="lead">Confirme, modifique, descarte o deje pendiente cada hallazgo. Solo lo validado puntuará.</p><div class="grid">${s.records
    .map((r) => {
      const v = vBy(r.id),
        op = option(v, r.value);
      return `<article class="review ${r.validation}" data-id="${r.id}"><div><span class="badge">${esc(r.finding)}</span> · confianza ${esc(r.confidence)}</div><h3>${esc(v.label)}</h3><label for="rev-${r.id}">Valor sugerido</label><select id="rev-${r.id}">${`<option value="">No consta / pendiente</option>` + v.options.map((o) => `<option value="${o.value}" ${o.value === r.value ? "selected" : ""}>${esc(o.label)} — ${o.score} puntos</option>`).join("")}</select><p><b>Puntuación propuesta:</b> ${op?.score ?? "—"}</p><div class="evidence"><b>Evidencia:</b> ${esc(r.evidence) || "No encontrada"}${negationHint(s.clinicalText, r) ? `<p class="warning">${esc(NEGATION_NOTE)}</p>` : ""}</div><div class="review-actions"><button data-a="confirm">Confirmar</button><button class="secondary" data-a="modify">Modificar</button><button class="secondary danger" data-a="reject">Descartar</button><button class="secondary" data-a="pending">Dejar pendiente</button></div></article>`;
    })
    .join(
      "",
    )}</div><div class="actions"><button id="continue">Completar información pendiente →</button></div>`;
  app.querySelectorAll(".review").forEach(
    (card) =>
      (card.onclick = (e) => {
        const a = e.target.dataset.a;
        if (!a) return;
        const r = s.records.find((x) => x.id === card.dataset.id),
          value = card.querySelector("select").value;
        if (a === "pending") {
          r.validation = r.evidence ? "suggested" : "missing";
          r.finding = "pendiente";
        } else if (a === "reject") {
          r.validation = "rejected";
          r.value = null;
          r.finding = "descartada";
        } else if (!value) { toast("Seleccione un valor.", { type: "warn" }); return; }
        else {
          r.value = value;
          r.validation = a === "modify" ? "modified" : "confirmed";
          r.finding = "validada";
        }
        render();
      }),
  );
  document.querySelector("#continue").onclick = () => {
    goTo(3);
  };
}
function stratification() {
  const s = getState();
  s.override = s.override || { priority: "", reason: "" };
  app.innerHTML = `<h2>Completar información pendiente y estratificar</h2><p class="lead">Registre manualmente solo los datos comprobados. Puede dejar cualquier variable pendiente: no puntuará y el resultado quedará como provisional.</p><section class="panel"><div class="grid">${VARIABLES.map(
    (v) => {
      const r = s.records.find((x) => x.id === v.id),
        valid = A.VALIDATED.includes(r?.validation);
      return `<div><label for="var-${v.id}">${esc(v.label)} ${v.interview ? '<span class="badge">entrevista</span>' : ""}</label><select id="var-${v.id}" data-var="${v.id}"><option value="">Pendiente / no consta</option>${v.options.map((o) => `<option value="${o.value}" ${valid && r.value === o.value ? "selected" : ""}>${esc(o.label)} — ${o.score}</option>`).join("")}</select></div>`;
    },
  ).join(
    "",
  )}</div><hr><label for="override">Elevar prioridad por criterio profesional (opcional)</label><select id="override"><option value="">Sin elevación</option><option value="2" ${String(s.override.priority) === "2" ? "selected" : ""}>Prioridad 2</option><option value="1" ${String(s.override.priority) === "1" ? "selected" : ""}>Prioridad 1</option></select><label for="reason">Motivo obligatorio si se eleva el nivel</label><input id="reason" maxlength="2000" value="${esc(s.override.reason)}" placeholder="Criterio clínico y justificación"><div class="actions"><button id="calculate">Calcular con variables validadas</button></div><div id="calculation" aria-live="polite"></div></section>`;
  const show = (ev) => {
    const result = ev.result;
    if (!ev.applicable) {
      document.querySelector("#calculation").innerHTML = `<p class="warning">${esc(result.reason)}</p>`;
      return;
    }
    document.querySelector("#calculation").innerHTML =
      `<div class="panel"><div class="score">${result.total}<small>/${MAX_SCORE}</small></div><div class="priority"><span class="cmo-level" data-level="${result.priority}">PRIORIDAD ${result.priority}${ev.provisional ? " · PROVISIONAL" : ""}</span></div>`
      + `<p>Prioridad calculada por el modelo: <b>Prioridad ${result.calculated}</b>.${result.pregnancy ? " Prioridad 1 por regla de embarazo." : ""}</p>`
      + (result.override ? `<p class="warning">Elevación profesional documentada: ${esc(result.manualReason)}</p>` : "")
      + (ev.overrideIgnoredReason ? `<p class="warning">${esc(ev.overrideIgnoredReason)}</p>` : "")
      + (ev.provisional ? `<p class="warning"><b>Resultado provisional:</b> ${ev.pending.length} de ${VARIABLES.length} variables pendientes no puntúan (no se consideran negativas). Si resultaran positivas, la puntuación podría alcanzar ${ev.maxPossible.total}/${MAX_SCORE}${ev.priorityMayChange ? ` y la prioridad podría llegar a Prioridad ${ev.maxPossible.priority}` : "; la prioridad no cambiaría"}.</p><details><summary>Ver variables pendientes</summary><ul>${ev.pending.map((v) => `<li>${esc(v.label)}</li>`).join("")}</ul></details>` : "")
      + `<div class="grid">${Object.entries(BLOCKS).map(([k, b]) => `<div><b>${b.label}: ${result.blocks[k]}/${b.max}</b><div class="bar"><i style="width:${(result.blocks[k] / b.max) * 100}%"></i></div></div>`).join("")}</div><p>${result.confirmedCount}/${VARIABLES.length} variables validadas.</p><div class="actions"><button id="next">Ver necesidades →</button></div></div>`;
    document.querySelector("#next").onclick = () => goTo(4);
  };
  document.querySelector("#calculate").onclick = () => {
    document.querySelectorAll("[data-var]").forEach((el) => {
      let r = s.records.find((x) => x.id === el.dataset.var);
      if (!r) {
        r = { id: el.dataset.var };
        s.records.push(r);
      }
      if (el.value && (!["confirmed", "modified"].includes(r.validation) || r.value !== el.value)) {
        r.value = el.value;
        r.validation = "manual";
        r.origin = "manual";
        r.evidence = "Introducción manual por el farmacéutico";
        r.finding = "validada";
      } else if (!el.value && A.VALIDATED.includes(r.validation)) {
        // Corregido: una variable validada (también desde la revisión) que se deja pendiente deja de puntuar.
        r.value = null;
        r.validation = "missing";
        r.finding = "pendiente";
      }
    });
    s.override = { priority: document.querySelector("#override").value, reason: document.querySelector("#reason").value.trim() };
    try {
      const ev = A.evaluate(s);
      update({ result: ev.result, needs: ev.applicable ? A.needsFor(s, ev).confirmed : [] });
      dirty = true;
      shell();
      show(ev);
    } catch (e) {
      toast(e.message, { type: "error" });
    }
  };
  if (s.result) show(A.evaluate(s));
}
function needs() {
  const s = getState();
  const ev = A.evaluate(s), n = A.needsFor(s, ev);
  const item = (x, potential) => `<div class="check"><span aria-hidden="true">${potential ? "…" : "✓"}</span><div><b>${esc(x.label)}</b><br><small>Variable ${potential ? "pendiente" : "desencadenante"}: ${esc(vBy(x.trigger)?.label || x.trigger)}</small></div></div>`;
  app.innerHTML = `<h2>Necesidades detectadas</h2><p class="lead">Cada propuesta mantiene la trazabilidad con la variable que la origina.</p><section class="panel"><h3>Confirmadas</h3>${n.confirmed.map((x) => item(x, false)).join("") || "<p>No se detectaron necesidades automáticas con las variables positivas confirmadas.</p>"}</section>${n.potential.length ? `<section class="panel"><h3>Potenciales, pendientes de evaluación</h3><p><small>Necesidades que el modelo asociaría a variables aún pendientes si resultaran positivas. No están confirmadas.</small></p>${n.potential.map((x) => item(x, true)).join("")}</section>` : ""}<section class="panel"><h3>Objetivos y plan compartido <span class="badge">opcional</span></h3><div class="grid">${Object.entries(A.GOAL_LABELS)
    .map(([k, l]) => `<div><label for="goal-${k}">${l}</label><textarea id="goal-${k}" data-goal="${k}" maxlength="2000" style="min-height:80px">${esc(s.goals[k])}</textarea></div>`)
    .join("")}</div></section><div class="actions"><button id="next">Seleccionar intervenciones →</button></div>`;
  document.querySelectorAll("[data-goal]").forEach((x) => (x.oninput = () => { s.goals[x.dataset.goal] = x.value.trim(); }));
  document.querySelector("#next").onclick = () => goTo(5);
}
function interventions() {
  const s = getState();
  s.statuses = s.statuses || {};
  const resources = [
    ["seguimiento", "Seguimiento farmacoterapéutico"],
    ["educacion", "Educación sanitaria"],
    ["adherencia", "Entrevista motivacional / adherencia"],
    ["telefarmacia", "Telefarmacia"],
    ["telemonitorizacion", "Telemonitorización"],
    ["conciliacion", "Conciliación"],
    ["interacciones", "Revisión de interacciones"],
    ["cardiologia", "Coordinación asistencial"],
  ];
  s.interventions = interventionsFor(s.result.priority, s.resources);
  app.innerHTML = `<h2>Intervenciones farmacéuticas</h2><section class="panel"><h3>¿Qué intervenciones son factibles en tu entorno?</h3><div class="grid">${resources.map(([k, l]) => `<label class="check"><input type="checkbox" data-resource="${k}" ${s.resources.includes(k) ? "checked" : ""}> ${l}</label>`).join("")}</div></section><section class="panel"><h3>Registrar el estado de cada intervención</h3><p><small>Intervenciones del modelo para la Prioridad ${s.result.priority} (acumulativas). Indique cuáles ha realizado, cuáles quedan planificadas y cuáles no proceden.</small></p>${s.interventions.map((i) => `<div class="check intervention"><span id="int-${i.id}"><b>${esc(i.label)}</b> <span class="badge">P${i.level} · ${esc(i.category)}</span><br><small>${i.available ? "Factible con recursos seleccionados" : "Recomendada, actualmente no disponible"}</small></span><select data-int="${i.id}" aria-labelledby="int-${i.id}">${Object.entries(INTERVENTION_STATUSES).map(([k, l]) => `<option value="${k}" ${A.interventionStatus(s, i.id) === k ? "selected" : ""}>${l}</option>`).join("")}</select></div>`).join("")}</section><div class="actions"><button id="next">Generar informe →</button></div>`;
  const keep = () => {
    document.querySelectorAll("[data-int]").forEach((x) => { if (x.value === "recommended") delete s.statuses[x.dataset.int]; else s.statuses[x.dataset.int] = x.value; });
    s.selected = Object.entries(s.statuses).filter(([, v]) => v === "done" || v === "planned").map(([k]) => k);
  };
  document.querySelectorAll("[data-int]").forEach((x) => (x.onchange = keep));
  document.querySelectorAll("[data-resource]").forEach(
    (x) =>
      (x.onchange = () => {
        keep(); // Corregido: cambiar un recurso ya no pierde lo registrado.
        s.resources = x.checked ? [...new Set([...s.resources, x.dataset.resource])] : s.resources.filter((k) => k !== x.dataset.resource);
        render();
      }),
  );
  document.querySelector("#next").onclick = () => {
    keep();
    s.interventions = interventionsFor(s.result.priority, s.resources);
    goTo(6);
  };
}
function finalReport() {
  const s = getState();
  const build = () => { const ev = A.evaluate(s); return { ev, report: createReport(A.buildReportInput(s, ev, { version: APP_CONFIG.version })) }; };
  let cur = build();
  const fileBase = () => safeFilename("cmo-cardio", s.meta.code || "caso", s.meta.date);
  app.innerHTML = `<h2>Informe CMO cardiovascular</h2><section class="panel no-print"><div class="fields"><div><label for="meta-date">Fecha</label><input id="meta-date" data-meta="date" type="date" value="${esc(s.meta.date)}"></div><div><label for="meta-hospital">Hospital</label><input id="meta-hospital" data-meta="hospital" maxlength="200" value="${esc(s.meta.hospital)}"></div><div><label for="meta-pharmacist">Farmacéutico/a</label><input id="meta-pharmacist" data-meta="pharmacist" maxlength="200" value="${esc(s.meta.pharmacist)}"></div><div><label for="meta-code">Identificador pseudonimizado</label><input id="meta-code" data-meta="code" maxlength="60" value="${esc(s.meta.code)}"></div></div></section>
  <p id="report-blocked" class="warning" role="status" hidden></p>
  <div class="actions no-print" id="report-actions"><button id="copy">Copiar informe para historia clínica</button><button id="pdf">Descargar PDF</button><button class="secondary" id="print">Imprimir</button><button class="secondary" id="download">Descargar texto (.txt)</button></div>
  <p id="copy-status" class="no-print" role="status" aria-live="polite"></p>
  <div id="report-preview"></div>
  <details class="no-print"><summary>Ver texto para historia clínica</summary><textarea id="report" class="report" rows="18" readonly spellcheck="false" aria-label="Texto para historia clínica"></textarea></details>
  <section class="panel no-print"><h3>Datos estructurados</h3><p><small>La exportación contiene solo las variables validadas (esquema <code>cmo-rcv-case/1</code> en el sobre <code>cmo-export/1</code>); nunca el texto clínico pegado ni las propuestas sin validar. La herramienta no guarda nada: los datos existen solo en memoria hasta recargar.</small></p><div class="actions"><button class="secondary" id="export-json">Exportar JSON</button><button class="secondary" id="export-csv">Exportar CSV</button><button class="secondary" id="import-json">Importar JSON</button><input type="file" id="import-file" accept="application/json,.json" hidden aria-label="Fichero JSON de CMO Cardiovascular"></div></section>`;
  const paint = () => {
    cur = build();
    const blocked = validateReport(cur.report).filter((x) => !/pendientes/.test(x)).join(" ");
    document.querySelector("#report-blocked").hidden = !blocked;
    document.querySelector("#report-blocked").textContent = blocked;
    ["copy", "pdf", "print", "download"].forEach((id) => (document.querySelector(`#${id}`).disabled = !!blocked));
    document.querySelector("#report").value = reportToText(cur.report);
    document.querySelector("#report-preview").innerHTML = reportToHtml(cur.report);
  };
  document.querySelectorAll("[data-meta]").forEach((x) => (x.oninput = () => { s.meta[x.dataset.meta] = x.value; paint(); }));
  document.querySelector("#copy").onclick = async () => {
    const ok = await copyText(reportToText(cur.report));
    document.querySelector("#copy-status").textContent = ok ? "Informe copiado al portapapeles. Revíselo antes de incorporarlo a la historia clínica." : "No se ha podido copiar automáticamente: despliegue «Ver texto para historia clínica» y cópielo manualmente.";
  };
  document.querySelector("#pdf").onclick = () => { download(`${fileBase()}.pdf`, reportToPdf(cur.report), "application/pdf"); toast("PDF generado."); };
  document.querySelector("#print").onclick = () => printHtml(reportToHtml(cur.report), cur.report.title);
  document.querySelector("#download").onclick = () => { download(`${fileBase()}.txt`, reportToText(cur.report)); toast("Texto descargado."); };
  document.querySelector("#export-json").onclick = () => {
    download(`${fileBase()}.json`, JSON.stringify(exportEnvelope({ app: { id: A.APP_ID, name: A.TOOL_NAME, version: APP_CONFIG.version }, exportedAt: new Date().toISOString(), dataSchema: A.CASE_SCHEMA, data: A.serializeCase(s), report: cur.report }), null, 2), "application/json");
    dirty = false;
    toast("Datos estructurados exportados (JSON).");
  };
  document.querySelector("#export-csv").onclick = () => { download(`${fileBase()}.csv`, toCsv(A.csvRows(s, cur.ev)), "text/csv;charset=utf-8"); toast("Datos estructurados exportados (CSV)."); };
  document.querySelector("#import-json").onclick = () => document.querySelector("#import-file").click();
  document.querySelector("#import-file").onchange = async (e) => { await importCase(e.target.files[0]); e.target.value = ""; };
  paint();
}
async function importCase(file) {
  if (!file) return;
  const parsed = parseEnvelope(await file.text(), { appId: A.APP_ID });
  if (!parsed.ok || parsed.value.dataSchema !== A.CASE_SCHEMA) { toast(`No se ha podido importar: ${parsed.ok ? `esquema de datos no compatible (se esperaba ${A.CASE_SCHEMA}).` : parsed.error}`, { type: "error" }); return; }
  if (hasData() && !(await confirmDialog({ title: "Sustituir la estratificación actual", message: "La importación sustituye los datos de la estratificación en curso.", confirmLabel: "Importar y sustituir", danger: true }))) return;
  const data = A.normalizeCase(parsed.value.data);
  reset();
  const s = getState();
  Object.assign(s, { records: data.records, override: data.override, goals: data.goals, resources: data.resources, statuses: data.statuses });
  Object.assign(s.meta, data.meta);
  // El resultado nunca se toma del fichero: se recalcula con el motor.
  const ev = A.evaluate(s);
  update({ result: ev.result, needs: ev.applicable ? A.needsFor(s, ev).confirmed : [] });
  unlockedStages.clear(); [0, 3].forEach((i) => unlockedStages.add(i));
  if (ev.applicable) [4, 5, 6].forEach((i) => unlockedStages.add(i));
  dirty = false;
  goTo(3);
  toast("Caso importado y recalculado. Revise los datos antes de continuar.");
}
let dirty = false;
function render() {
  const s = getState();
  if (needsResult(stage) && !s.result?.applicable) stage = 3;
  shell();
  [start, history, review, stratification, needs, interventions, finalReport][stage]();
  scrollTo({ top: 0 });
}
document.querySelector("#reset").onclick = async () => {
  if (hasData() && !(await confirmDialog({ title: "Nueva estratificación", message: "¿Borrar todos los datos de esta estratificación? Esta acción no se puede deshacer.", confirmLabel: "Borrar todo", danger: true }))) return;
  reset();
  dirty = false;
  stage = 0;
  unlockedStages.clear();
  unlockedStages.add(0);
  render();
};
guardUnsaved(() => dirty && hasData());
render();
