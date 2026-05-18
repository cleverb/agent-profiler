/**
 * Configurable dashboard grid wrapper with optional template-area injection.
 * @see ADR-005
 */
import { classHelper, escapeHtml } from "../shared/index.js";

export type DashboardGridTemplateAreasRows = string | string[];

export type DashboardGridTemplateAreaBreakpoints = {
  maxMobile?: DashboardGridTemplateAreasRows;
  maxTablet?: DashboardGridTemplateAreasRows;
  maxLaptop?: DashboardGridTemplateAreasRows;
  maxDesktop?: DashboardGridTemplateAreasRows;
  /** Optional cutoff overrides; each value means "up to and including this width". */
  cutoffWidths?: {
    maxMobile?: number;
    maxTablet?: number;
    maxLaptop?: number;
  };
  /** Legacy aliases kept for compatibility. */
  maxSmall?: DashboardGridTemplateAreasRows;
  maxMedium?: DashboardGridTemplateAreasRows;
  maxLarge?: DashboardGridTemplateAreasRows;
  maxExtraLarge?: DashboardGridTemplateAreasRows;
};

export type DashboardGridProps = {
  /** Trusted card section HTML rendered inside `<main>`. */
  contentHtml: string;
  /** Optional CSS grid-template-areas value (rows/raw) or breakpoint map. */
  templateAreas?:
    | DashboardGridTemplateAreasRows
    | DashboardGridTemplateAreaBreakpoints;
  /** Optional extra classes after `dashboard-grid`. */
  className?: string;
};

function normalizeTemplateAreas(
  templateAreas: DashboardGridTemplateAreasRows,
): string {
  if (typeof templateAreas === "string") {
    return templateAreas.trim();
  }
  return templateAreas
    .map((row) => `"${row.trim()}"`)
    .join(" ")
    .trim();
}

function templateAreaRows(
  templateAreas: DashboardGridTemplateAreasRows,
): string[] {
  if (typeof templateAreas === "string") {
    const rows = templateAreas
      .split('"')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    return rows.length > 0 ? rows : [templateAreas.trim()];
  }
  return templateAreas.map((row) => row.trim()).filter((row) => row.length > 0);
}

function templateAreaColumnCount(rows: string[]): number {
  const first = rows[0];
  if (first == null) {
    return 1;
  }
  const cols = first.split(/\s+/).filter(Boolean).length;
  return cols > 0 ? cols : 1;
}

function isTemplateAreaBreakpoints(
  value: DashboardGridProps["templateAreas"],
): value is DashboardGridTemplateAreaBreakpoints {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

function defaultTemplateForBreakpoints(
  templateAreas: DashboardGridTemplateAreaBreakpoints,
): DashboardGridTemplateAreasRows | undefined {
  return (
    templateAreas.maxDesktop ??
    templateAreas.maxLaptop ??
    templateAreas.maxTablet ??
    templateAreas.maxMobile ??
    templateAreas.maxExtraLarge ??
    templateAreas.maxLarge ??
    templateAreas.maxMedium ??
    templateAreas.maxSmall
  );
}

export function dashboardGridHtml(props: DashboardGridProps): string {
  const componentClass = classHelper("dashboard-grid", props.className ?? "");
  const attrs: string[] = [];

  if (props.templateAreas != null) {
    if (isTemplateAreaBreakpoints(props.templateAreas)) {
      const serialized = escapeHtml(JSON.stringify(props.templateAreas));
      attrs.push(` data-dashboard-grid-breakpoints="${serialized}"`);
      const fallback = defaultTemplateForBreakpoints(props.templateAreas);
      if (fallback != null) {
        attrs.push(
          ` style="grid-template-areas: ${escapeHtml(
            normalizeTemplateAreas(fallback),
          )};"`,
        );
      }
    } else {
      attrs.push(
        ` style="grid-template-areas: ${escapeHtml(
          normalizeTemplateAreas(props.templateAreas),
        )};"`,
      );
    }
  }

  return `
<main class="${escapeHtml(componentClass)}"${attrs.join("")}>
  ${props.contentHtml}
</main>
`.trim();
}

const DEFAULT_CUTOFFS = {
  maxMobile: 480,
  maxTablet: 768,
  maxLaptop: 1024,
};

function normalizedCutoffWidths(
  breakpoints: DashboardGridTemplateAreaBreakpoints,
): {
  maxMobile: number;
  maxTablet: number;
  maxLaptop: number;
} {
  const maxMobile =
    breakpoints.cutoffWidths?.maxMobile ?? DEFAULT_CUTOFFS.maxMobile;
  const maxTablet =
    breakpoints.cutoffWidths?.maxTablet ?? DEFAULT_CUTOFFS.maxTablet;
  const maxLaptop =
    breakpoints.cutoffWidths?.maxLaptop ?? DEFAULT_CUTOFFS.maxLaptop;
  return {
    maxMobile,
    maxTablet: Math.max(maxTablet, maxMobile),
    maxLaptop: Math.max(maxLaptop, maxTablet),
  };
}

function areaFor(
  breakpoints: DashboardGridTemplateAreaBreakpoints,
  tier: "mobile" | "tablet" | "laptop" | "desktop",
): DashboardGridTemplateAreasRows | undefined {
  if (tier === "mobile") {
    return breakpoints.maxMobile ?? breakpoints.maxSmall;
  }
  if (tier === "tablet") {
    return breakpoints.maxTablet ?? breakpoints.maxMedium;
  }
  if (tier === "laptop") {
    return breakpoints.maxLaptop ?? breakpoints.maxLarge;
  }
  return breakpoints.maxDesktop ?? breakpoints.maxExtraLarge;
}

let resizeListenerAttached = false;
let resizeDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function parseBreakpointsAttr(
  value: string,
): DashboardGridTemplateAreaBreakpoints | null {
  try {
    const parsed = JSON.parse(value) as DashboardGridTemplateAreaBreakpoints;
    if (typeof parsed !== "object" || parsed == null || Array.isArray(parsed)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function resolveTemplateAreasForWidth(
  width: number,
  breakpoints: DashboardGridTemplateAreaBreakpoints,
): DashboardGridTemplateAreasRows | null {
  const cutoffs = normalizedCutoffWidths(breakpoints);
  if (width <= cutoffs.maxMobile) {
    return null;
  }
  if (width <= cutoffs.maxTablet) {
    return (
      areaFor(breakpoints, "tablet") ??
      areaFor(breakpoints, "laptop") ??
      areaFor(breakpoints, "desktop") ??
      null
    );
  }
  if (width <= cutoffs.maxLaptop) {
    return (
      areaFor(breakpoints, "laptop") ?? areaFor(breakpoints, "desktop") ?? null
    );
  }
  return (
    areaFor(breakpoints, "desktop") ?? areaFor(breakpoints, "laptop") ?? null
  );
}

function currentViewportWidth(): number {
  if (typeof window === "undefined") {
    return 0;
  }
  const vv = window.visualViewport;
  if (vv != null && Number.isFinite(vv.width) && vv.width > 0) {
    return vv.width;
  }
  return window.innerWidth;
}

function applySingleColumnLayout(grid: HTMLElement): void {
  grid.style.gridTemplateAreas = "none";
  grid.style.gridTemplateColumns = "1fr";
  grid.style.gridTemplateRows = "auto";
  const items = grid.querySelectorAll<HTMLElement>(":scope > *");
  items.forEach((item) => {
    item.style.gridArea = "auto";
  });
}

function clearInlineGridTrackOverrides(grid: HTMLElement): void {
  grid.style.removeProperty("grid-template-columns");
  grid.style.removeProperty("grid-template-rows");
  const items = grid.querySelectorAll<HTMLElement>(":scope > *");
  items.forEach((item) => {
    item.style.removeProperty("grid-area");
  });
}

function applyResponsiveTemplateAreaToGrid(grid: HTMLElement): void {
  const raw = grid.getAttribute("data-dashboard-grid-breakpoints");
  if (raw == null || raw.trim() === "") {
    return;
  }
  const breakpoints = parseBreakpointsAttr(raw);
  if (breakpoints == null) {
    return;
  }

  const next = resolveTemplateAreasForWidth(
    currentViewportWidth(),
    breakpoints,
  );
  if (next == null) {
    applySingleColumnLayout(grid);
    return;
  }

  clearInlineGridTrackOverrides(grid);
  const rows = templateAreaRows(next);
  const colCount = templateAreaColumnCount(rows);
  grid.style.gridTemplateColumns = `repeat(${colCount}, minmax(0, 1fr))`;
  grid.style.gridTemplateRows = `repeat(${rows.length}, minmax(58px, 1fr))`;
  grid.style.gridTemplateAreas = normalizeTemplateAreas(rows);
}

function refreshResponsiveDashboardGrids(root: ParentNode): void {
  if (typeof window === "undefined") {
    return;
  }
  const grids = root.querySelectorAll<HTMLElement>(
    ".dashboard-grid[data-dashboard-grid-breakpoints]",
  );
  grids.forEach((grid) => applyResponsiveTemplateAreaToGrid(grid));
}

/**
 * Applies breakpoint-based template areas and subscribes to debounced viewport changes.
 * @see ADR-005
 */
export function attachResponsiveDashboardGrids(
  root: ParentNode = document,
): void {
  if (typeof window === "undefined") {
    return;
  }
  refreshResponsiveDashboardGrids(root);
  if (resizeListenerAttached) {
    return;
  }
  resizeListenerAttached = true;
  window.addEventListener("resize", () => {
    if (resizeDebounceTimer != null) {
      clearTimeout(resizeDebounceTimer);
    }
    resizeDebounceTimer = setTimeout(() => {
      refreshResponsiveDashboardGrids(document);
    }, 120);
  });
  if (window.visualViewport != null) {
    window.visualViewport.addEventListener("resize", () => {
      if (resizeDebounceTimer != null) {
        clearTimeout(resizeDebounceTimer);
      }
      resizeDebounceTimer = setTimeout(() => {
        refreshResponsiveDashboardGrids(document);
      }, 120);
    });
    window.visualViewport.addEventListener("scroll", () => {
      if (resizeDebounceTimer != null) {
        clearTimeout(resizeDebounceTimer);
      }
      resizeDebounceTimer = setTimeout(() => {
        refreshResponsiveDashboardGrids(document);
      }, 120);
    });
  }
}
