function fmt(n) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US").format(Math.round(n));
}

function el(id) {
  const n = document.getElementById(id);
  if (!n) throw new Error(`missing #${id}`);
  return n;
}

function encodeQuery(obj) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  }
  return p.toString();
}

function roleClass(role) {
  if (role === "user_prompt") return "user";
  if (
    role === "assistant_message" ||
    role === "assistant_delta" ||
    role === "assistant"
  )
    return "assistant";
  if (role.startsWith("tool_")) return "tool";
  if (role.startsWith("shell_")) return "shell";
  return "other";
}

function renderUsageBars(container, usage) {
  container.replaceChildren();
  if (!usage) {
    container.textContent = "No data.";
    return;
  }
  const max = Math.max(
    1,
    usage.input + usage.output + usage.toolResults + usage.shellOutput,
  );
  const rows = [
    ["Input", usage.input, "input"],
    ["Output", usage.output, "output"],
    ["Tool / MCP", usage.toolResults, "tool"],
    ["Shell", usage.shellOutput, "shell"],
  ];
  for (const [label, value, cls] of rows) {
    const row = document.createElement("div");
    row.className = "bar-row";
    const lab = document.createElement("span");
    lab.textContent = label;
    const track = document.createElement("div");
    track.className = "bar-track";
    const fill = document.createElement("div");
    fill.className = `bar-fill ${cls}`;
    fill.style.width = `${(value / max) * 100}%`;
    track.appendChild(fill);
    const pct = document.createElement("span");
    pct.className = "muted small";
    pct.style.minWidth = "4.5rem";
    pct.style.textAlign = "right";
    pct.textContent = fmt(value);
    row.append(lab, track, pct);
    container.appendChild(row);
  }
}

function renderVerticalBars(container, items, opts = {}) {
  const { maxHeight = 100, valueKey = "value", labelKey = "label" } = opts;
  container.replaceChildren();
  if (!items || items.length === 0) {
    container.textContent = "No data.";
    return;
  }
  const maxVal = Math.max(1, ...items.map((i) => i[valueKey]));
  for (const item of items) {
    const col = document.createElement("div");
    col.className = "vbar-col";
    const track = document.createElement("div");
    track.className = "vbar-track";
    const fill = document.createElement("div");
    fill.className = "vbar-fill";
    fill.style.height = `${(item[valueKey] / maxVal) * maxHeight}px`;
    track.appendChild(fill);
    const lab = document.createElement("span");
    lab.className = "vbar-label";
    lab.textContent = item[labelKey];
    const val = document.createElement("span");
    val.textContent = fmt(item[valueKey]);
    col.append(track, val, lab);
    container.appendChild(col);
  }
}

function renderTimeline(container, timeline) {
  container.replaceChildren();
  if (!timeline || timeline.length === 0) {
    container.textContent = "No events.";
    return;
  }
  const t0 = new Date(timeline[0].createdAt).getTime();
  const t1 = new Date(timeline[timeline.length - 1].createdAt).getTime();
  const span = Math.max(1, t1 - t0);
  for (let i = 0; i < timeline.length; i++) {
    const ev = timeline[i];
    const seg = document.createElement("div");
    seg.className = `timeline-seg ${roleClass(ev.role)}`;
    const start = new Date(ev.createdAt).getTime();
    const end =
      i + 1 < timeline.length
        ? new Date(timeline[i + 1].createdAt).getTime()
        : start + 1;
    const w = Math.max(0.15, ((end - start) / span) * 100);
    seg.style.width = `${w}%`;
    seg.title = `${ev.role} · ${fmt(ev.estimatedTotalTokens)} tok`;
    container.appendChild(seg);
  }
}

function renderSparkline(svg, points) {
  svg.replaceChildren();
  if (!points || points.length === 0) return;
  const w = 200;
  const h = 48;
  const pad = 4;
  const ys = points.map((p) => p.efficiencyScore);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys, 1);
  const coords = points.map((p, i) => {
    const x = pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2);
    const y =
      h -
      pad -
      ((p.efficiencyScore - minY) / Math.max(1e-6, maxY - minY)) *
        (h - pad * 2);
    return `${x},${y}`;
  });
  const poly = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "polyline",
  );
  poly.setAttribute("points", coords.join(" "));
  svg.appendChild(poly);
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json();
}

let selectedSessionKey = "";

function sessionOptionKey(row) {
  return `${row.source}\t${row.sessionId}`;
}

async function loadSessions(selectEl, overviewDesc, preferredValue) {
  const data = await fetchJson(`/api/sessions?limit=30`);
  const keep = preferredValue ?? selectEl.value;
  selectEl.replaceChildren();
  const optLatest = document.createElement("option");
  optLatest.value = "";
  optLatest.textContent = "Latest activity";
  selectEl.appendChild(optLatest);

  for (const row of data.sessions) {
    const opt = document.createElement("option");
    opt.value = sessionOptionKey(row);
    const shortId =
      row.sessionId.length > 12
        ? `${row.sessionId.slice(0, 12)}…`
        : row.sessionId;
    opt.textContent = `${row.source} · ${shortId} · ${row.eventCount} events`;
    selectEl.appendChild(opt);
  }

  if (keep && [...selectEl.options].some((o) => o.value === keep)) {
    selectEl.value = keep;
    selectedSessionKey = keep;
    return;
  }

  if (
    overviewDesc &&
    overviewDesc.sessionId &&
    overviewDesc.sessionId.trim().length > 0
  ) {
    const key = sessionOptionKey({
      source: overviewDesc.source,
      sessionId: overviewDesc.sessionId,
      repoPath: overviewDesc.repoPath,
      startedAt: "",
      endedAt: "",
      eventCount: 0,
    });
    if ([...selectEl.options].some((o) => o.value === key)) {
      selectEl.value = key;
      selectedSessionKey = key;
    }
  }
}

function parseSelectedSession(selectEl) {
  const v = selectEl.value;
  if (!v) return null;
  const [source, sessionId] = v.split("\t");
  return { source, sessionId };
}

async function refreshAll() {
  const metaLine = el("meta-line");
  const sessionSelect = el("session-select");

  try {
    const overview = await fetchJson("/api/overview");
    metaLine.textContent = overview.databasePath
      ? `Database: ${overview.databasePath}`
      : "";

    await loadSessions(sessionSelect, overview.descriptor, selectedSessionKey);

    const sel = parseSelectedSession(sessionSelect);
    let report = overview.report;
    let timelineQs;
    let histQs;

    if (sel) {
      report = (await fetchJson(`/api/session/report?${encodeQuery(sel)}`))
        .report;
      timelineQs = encodeQuery(sel);
      histQs = encodeQuery(sel);
    } else if (overview.descriptor) {
      const d = overview.descriptor;
      if (d.sessionId && d.sessionId.trim().length > 0) {
        timelineQs = encodeQuery({ source: d.source, sessionId: d.sessionId });
        histQs = timelineQs;
      } else {
        timelineQs = encodeQuery({
          source: d.source,
          legacy: "1",
          repoPath: d.repoPath ?? "",
        });
        histQs = timelineQs;
      }
    }

    el("total-tokens").textContent =
      report && report.usage ? fmt(report.usage.total) : "—";

    renderUsageBars(el("usage-bars"), report?.usage ?? null);

    el("efficiency-score").textContent =
      report != null ? String(report.efficiencyScore) : "—";

    const histData = timelineQs
      ? await fetchJson(`/api/tool-histogram?${histQs}`)
      : { histogram: [] };
    renderVerticalBars(
      el("tool-histogram"),
      (histData.histogram ?? []).map((h) => ({
        label: h.bucket,
        value: h.count,
      })),
      { maxHeight: 90 },
    );

    const audit = await fetchJson("/api/context-audit");
    renderVerticalBars(
      el("context-bars"),
      (audit.files ?? []).map((f) => ({
        label: f.path.replace(/^.*\//, ""),
        value: f.estimatedTokens,
      })),
      { maxHeight: 140 },
    );

    const timelineData = timelineQs
      ? await fetchJson(`/api/session/timeline?${timelineQs}`)
      : { timeline: [] };
    el("timeline-meta").textContent =
      report != null
        ? `${report.sessionShape.turns} turns · ${report.sessionShape.fileEdits} edits · ${report.sessionShape.shellCalls} shell · ${report.sessionShape.toolCalls} tool calls · ${report.durationMinutes} min`
        : "";

    renderTimeline(el("timeline-track"), timelineData.timeline);

    const scores = await fetchJson("/api/score-history?limit=15");
    renderSparkline(el("score-sparkline"), scores.points ?? []);

    const flagsUl = el("red-flags");
    flagsUl.replaceChildren();
    if (report?.redFlags?.length) {
      for (const f of report.redFlags) {
        const li = document.createElement("li");
        const sev = document.createElement("span");
        sev.className = `sev ${f.severity === "MEDIUM" ? "medium" : ""}`;
        sev.textContent = f.severity;
        li.append(sev, document.createTextNode(`${f.title}: ${f.detail}`));
        flagsUl.appendChild(li);
      }
    } else {
      flagsUl.innerHTML = `<li class="muted">None</li>`;
    }

    const recOl = el("recommendations");
    recOl.replaceChildren();
    if (report?.recommendations?.length) {
      for (const r of report.recommendations) {
        const li = document.createElement("li");
        li.textContent = r;
        recOl.appendChild(li);
      }
    }
  } catch (e) {
    metaLine.textContent = String(e.message ?? e);
  }
}

el("refresh-btn").addEventListener("click", () => refreshAll());

el("session-select").addEventListener("change", () => {
  selectedSessionKey = el("session-select").value;
  void refreshAll();
});

void refreshAll();
