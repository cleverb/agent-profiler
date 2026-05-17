---
layout: layout.njk
title: Local-first AI agent profiling
description: Agent Profiler helps teams inspect AI coding-agent hook traffic, session shape, token estimates, tool noise, context weight, and efficiency signals.
---

<section class="hero">
  <p class="eyebrow">Local-first agent telemetry</p>
  <h1>Profile the shape, cost, and noise of AI coding-agent sessions.</h1>
  <p class="lede">Agent Profiler is a local-first tool for profiling AI coding-agent hook traffic, session shape, estimated token usage, tool and shell noise, always-on context weight, and practical efficiency signals.</p>
  <div class="hero-actions">
    <a class="button primary" href="/getting-started/">Get started</a>
    <a class="button" href="/dashboard/">View dashboard shell</a>
  </div>
</section>

<section class="card-grid" aria-label="What Agent Profiler measures">
  <article>
    <h2>Session shape</h2>
    <p>Understand how user prompts, assistant messages, tool calls, and shell output are distributed across a coding-agent session.</p>
  </article>
  <article>
    <h2>Estimated usage</h2>
    <p>Review local estimates for input, output, tool-result, and shell-output token usage without sending profile data to a hosted analytics service.</p>
  </article>
  <article>
    <h2>Noise signals</h2>
    <p>Spot oversized tool responses, repetitive shell output, and other patterns that can make agent sessions harder to reason about.</p>
  </article>
  <article>
    <h2>Context weight</h2>
    <p>Audit always-on repository context so teams can trim the files that silently consume attention and token budget.</p>
  </article>
</section>

<section class="split-panel">
  <div>
    <h2>Static hosting, dynamic local workflow</h2>
    <p>This website, dashboard shell, and Storybook are deployed as static GitHub Pages assets. The profiler itself remains local-first: Node runs during builds and when you choose to run the CLI on your machine.</p>
  </div>
  <ul class="check-list">
    <li>Capture hook events from supported coding-agent environments.</li>
    <li>Store normalized telemetry in a local SQLite database.</li>
    <li>Use the dashboard to inspect efficiency, context, and red-flag signals.</li>
  </ul>
</section>
