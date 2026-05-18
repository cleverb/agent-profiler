import {
  attachUsageDialChart,
  attachResponsiveDashboardGrids,
  computeTimelineTrackSegments,
  dashboardCardHtml,
  defaultUsageDialSegmentsFromUsage,
  detachUsageDialChartsIn,
  efficiencyViewHtml,
  observableUsageViewHtml,
  formatTokenCountFull,
  overviewShellHtml,
  sparklinePolylinePoints,
  timelineTrackInnerHtml,
  usageBreakdownBarsInnerHtml,
  verticalBarsInnerHtml,
  type UsageBreakdownBarRow,
} from "../ui/index.js";

/** Half-doughnut token dial backed by Chart.js (`usageTotalGauge` + `attachUsageDialChart`). */
const USAGE_TOTAL_SHOW_DIAL_CHART = true;

function fmt(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return formatTokenCountFull(n);
}

/** Mount layout + lower sections from `overviewShellHtml` (ADR-005). */
function mountDashboardShell() {
  const root = document.getElementById("dashboard-mount");
  if (!root) throw new Error("missing #dashboard-mount");
  root.innerHTML = overviewShellHtml({
    title: "Agent Profiler Dashboard",
    subtitle: "",
    sessionOptions: [],
    refreshLabel: "Refresh",
    refreshButtonId: "refresh-btn",
    refreshButtonAriaLabel: "Refresh dashboard",
    sessionSelectId: "session-select",
    subtitleElementId: "meta-line",
    useLiveOverviewSlots: true,
    options: {
      timelineView: {
        metaElementId: "timeline-meta",
        trackElementId: "timeline-track",
      },
      toolHistogramView: {
        barsElementId: "tool-histogram",
        parityLineElementId: "parity-line",
        operationLineElementId: "operation-line",
      },
      contextAuditView: {
        barsElementId: "context-bars",
      },
      redFlagsView: {
        listElementId: "red-flags",
      },
      recommendationsView: {
        listElementId: "recommendations",
      },
    },
  });
  attachResponsiveDashboardGrids(root);
}

function el(id: string): HTMLElement {
  const n = document.getElementById(id);
  if (!n) throw new Error(`missing #${id}`);
  return n;
}

function encodeQuery(obj: Record<string, string | undefined>) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  }
  return p.toString();
}

function usageBreakdownRowsFromUsage(usage: {
  input: number;
  output: number;
  toolResults: number;
  toolLifecycleOutputs?: number;
  shellOutput: number;
}): UsageBreakdownBarRow[] {
  const toolOutput = usage.toolLifecycleOutputs ?? usage.toolResults;
  const max = Math.max(
    1,
    usage.input + usage.output + toolOutput + usage.shellOutput,
  );
  return [
    {
      label: "Input",
      widthPct: (usage.input / max) * 100,
      tokens: usage.input,
      variant: "input",
    },
    {
      label: "Output",
      widthPct: (usage.output / max) * 100,
      tokens: usage.output,
      variant: "output",
    },
    {
      label: "Tool / MCP",
      widthPct: (toolOutput / max) * 100,
      tokens: toolOutput,
      variant: "tool",
    },
    {
      label: "Shell",
      widthPct: (usage.shellOutput / max) * 100,
      tokens: usage.shellOutput,
      variant: "shell",
    },
  ];
}

/** Observable overview card — mirrors Storybook overview shell markup */
function setOverviewObservableCard(
  slot: HTMLElement,
  totalTokens: number | null | undefined,
  usage:
    | {
        input: number;
        output: number;
        toolResults: number;
        toolLifecycleOutputs?: number;
        shellOutput: number;
        total: number;
      }
    | null
    | undefined,
) {
  if (!usage) {
    detachUsageDialChartsIn(slot);
    slot.innerHTML = dashboardCardHtml({
      title: "Observable usage",
      span: "2",
      bodyHtml: '<p class="muted small">No usage data.</p>',
    });
    return;
  }
  const t =
    totalTokens != null && !Number.isNaN(totalTokens)
      ? fmt(totalTokens)
      : fmt(usage.total);
  detachUsageDialChartsIn(slot);
  slot.innerHTML = observableUsageViewHtml({
    title: "Observable usage",
    span: "2",
    valueText: t,
    caption: "estimated total tokens",
    valueElementId: "total-tokens",
    showDialChart: USAGE_TOTAL_SHOW_DIAL_CHART,
    isAbbreviated: true,
    barsElementId: "usage-bars",
    barsHtml: usageBreakdownBarsInnerHtml({
      rows: usageBreakdownRowsFromUsage(usage),
      isAbbreviated: true,
    }),
  });

  if (USAGE_TOTAL_SHOW_DIAL_CHART) {
    const canvas = slot.querySelector('canvas[data-gauge-dial="1"]');
    if (canvas instanceof HTMLCanvasElement) {
      attachUsageDialChart(canvas, defaultUsageDialSegmentsFromUsage(usage));
    }
  }
}

function setOverviewEfficiencyCard(
  slot: HTMLElement,
  efficiencyScore: number | null | undefined,
  sparkPts: string,
) {
  const scoreText =
    efficiencyScore != null && !Number.isNaN(Number(efficiencyScore))
      ? String(efficiencyScore)
      : "—";
  slot.innerHTML = efficiencyViewHtml({
    title: "Efficiency",
    scoreText,
    sparklinePoints: sparkPts,
    svgId: "score-sparkline",
  });
}

function setVerticalBars(
  container: HTMLElement,
  items: { label: string; value: number }[],
) {
  if (!items.length) {
    container.textContent = "No data.";
    return;
  }
  const maxVal = Math.max(1, ...items.map((i) => i.value));
  container.innerHTML = verticalBarsInnerHtml(
    items.map((item) => ({
      label: item.label,
      heightPct: (item.value / maxVal) * 100,
      valueText: fmt(item.value),
    })),
  );
}

function setTimelineTrack(
  container: HTMLElement,
  timeline: Array<{
    createdAt: string;
    role: string;
    estimatedTotalTokens?: number;
  }>,
) {
  if (!timeline.length) {
    container.textContent = "No events.";
    return;
  }
  const segs = computeTimelineTrackSegments(timeline, fmt);
  container.innerHTML = timelineTrackInnerHtml(segs);
}

async function fetchJson(path: string) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

mountDashboardShell();

let selectedSessionKey = "";

function sessionOptionKey(row: {
  source: string;
  sessionId: string;
  repoPath?: string;
  eventCount?: number;
}) {
  return `${row.source}\t${row.sessionId}`;
}

type SessionRow = {
  source: string;
  sessionId: string;
  repoPath?: string;
  eventCount: number;
};

async function loadSessions(
  selectEl: HTMLSelectElement,
  overviewDesc: Record<string, string> | null | undefined,
  preferredValue: string | undefined,
) {
  const data = (await fetchJson(`/api/sessions?limit=30`)) as {
    sessions: SessionRow[];
  };
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
      eventCount: 0,
    });
    if ([...selectEl.options].some((o) => o.value === key)) {
      selectEl.value = key;
      selectedSessionKey = key;
    }
  }
}

function parseSelectedSession(selectEl: HTMLSelectElement) {
  const v = selectEl.value;
  if (!v) return null;
  const [source, sessionId] = v.split("\t");
  return { source, sessionId };
}

type Usage = {
  input: number;
  output: number;
  toolResults: number;
  toolLifecycleOutputs?: number;
  shellOutput: number;
  total: number;
};

type Parity = {
  lifecycle: {
    toolRequests: number;
    toolSuccesses: number;
    toolFailures: number;
  };
  operations: Array<{ name: string; count: number; tokens: number }>;
};

type Report = {
  usage?: Usage | null;
  parity?: Parity | null;
  efficiencyScore?: number;
  sessionShape: {
    turns: number;
    fileEdits: number;
    shellCalls: number;
    toolCalls: number;
  };
  durationMinutes: number;
  redFlags?: Array<{ severity: string; title: string; detail: string }>;
  recommendations?: string[];
};

type TimelineEv = {
  createdAt: string;
  role: string;
  estimatedTotalTokens?: number;
};

async function refreshAll() {
  const metaLine = el("meta-line");
  const sessionSelect = el("session-select") as HTMLSelectElement;

  try {
    const overview = (await fetchJson("/api/overview")) as {
      databasePath?: string;
      descriptor?: Record<string, string> | null;
      report?: Report | null;
    };
    metaLine.textContent = overview.databasePath
      ? `Database: ${overview.databasePath}`
      : "";

    await loadSessions(
      sessionSelect,
      overview.descriptor ?? undefined,
      selectedSessionKey,
    );

    const sel = parseSelectedSession(sessionSelect);
    let report: Report | null | undefined = overview.report ?? undefined;
    let timelineQs: string | undefined;
    let histQs: string | undefined;

    if (sel) {
      const payload = (await fetchJson(
        `/api/session/report?${encodeQuery(sel)}`,
      )) as { report?: Report | null };
      report = payload.report ?? undefined;
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

    setOverviewObservableCard(
      el("slot-overview-usage"),
      report?.usage?.total ?? null,
      report?.usage ?? null,
    );

    const histData = timelineQs
      ? ((await fetchJson(`/api/tool-histogram?${histQs}`)) as {
          histogram?: Array<{ bucket: string; count: number }>;
        })
      : { histogram: [] };
    setVerticalBars(
      el("tool-histogram"),
      (histData.histogram ?? []).map((h) => ({
        label: h.bucket,
        value: h.count,
      })),
    );
    const parity = report?.parity?.lifecycle;
    el("parity-line").textContent = parity
      ? `Lifecycle parity: ${parity.toolRequests} requests, ${parity.toolSuccesses} successes, ${parity.toolFailures} failures`
      : "";
    const topOps = report?.parity?.operations?.slice(0, 3) ?? [];
    el("operation-line").textContent = topOps.length
      ? `Top operations: ${topOps.map((o) => `${o.name} ${fmt(o.tokens)}`).join(" · ")}`
      : "";

    const audit = (await fetchJson("/api/context-audit")) as {
      files?: Array<{ path: string; estimatedTokens: number }>;
    };
    setVerticalBars(
      el("context-bars"),
      (audit.files ?? []).map((f) => ({
        label: f.path.replace(/^.*\//, ""),
        value: f.estimatedTokens,
      })),
    );

    const timelineData = timelineQs
      ? ((await fetchJson(`/api/session/timeline?${timelineQs}`)) as {
          timeline?: TimelineEv[];
        })
      : { timeline: [] };
    el("timeline-meta").textContent =
      report != null
        ? `${report.sessionShape.turns} turns · ${report.sessionShape.fileEdits} edits · ${report.sessionShape.shellCalls} shell · ${report.sessionShape.toolCalls} tool calls · ${report.durationMinutes} min`
        : "";

    setTimelineTrack(el("timeline-track"), timelineData.timeline ?? []);

    const scores = (await fetchJson("/api/score-history?limit=15")) as {
      points?: Array<{ efficiencyScore: number }>;
    };
    const sparkPts = sparklinePolylinePoints(scores.points ?? []) ?? "";
    setOverviewEfficiencyCard(
      el("slot-overview-efficiency"),
      report?.efficiencyScore,
      sparkPts,
    );

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
    const err = e as Error;
    metaLine.textContent = String(err.message ?? e);
  }
}

el("refresh-btn").addEventListener("click", () => {
  void refreshAll();
});

el("session-select").addEventListener("change", () => {
  selectedSessionKey = (el("session-select") as HTMLSelectElement).value;
  void refreshAll();
});

void refreshAll();
