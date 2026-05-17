/**
 * Trusted static markup for dashboard sections below the overview row.
 * Appended via `overviewShellHtml` (`additionalMainInnerHtml`).
 * @see ADR-005
 */
export const DASHBOARD_LOWER_MAIN_HTML = `
<section class="card span-3">
  <h2>Session timeline</h2>
  <div class="timeline-meta muted small" id="timeline-meta"></div>
  <div class="timeline-track" id="timeline-track"></div>
  <div class="timeline-legend">
    <span><i class="dot user"></i> user</span>
    <span><i class="dot assistant"></i> assistant</span>
    <span><i class="dot tool"></i> tool</span>
    <span><i class="dot shell"></i> shell</span>
    <span><i class="dot other"></i> other</span>
  </div>
</section>

<section class="card">
  <h2>Tool result sizes</h2>
  <div class="bars vertical" id="tool-histogram"></div>
  <p class="muted small" id="parity-line"></p>
  <p class="muted small" id="operation-line"></p>
</section>

<section class="card span-2">
  <h2>Context audit</h2>
  <p class="muted small">Estimated tokens for always-on repo files</p>
  <div class="bars vertical tall" id="context-bars"></div>
</section>

<section class="card">
  <h2>Red flags</h2>
  <ul class="flag-list" id="red-flags"></ul>
</section>

<section class="card span-2">
  <h2>Recommendations</h2>
  <ol class="rec-list" id="recommendations"></ol>
</section>
`.trim();
