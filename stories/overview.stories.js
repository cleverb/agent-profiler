export default {
  title: "Agent Profiler/Overview",
};

export const MarketingHero = () => `
  <main class="content">
    <section class="hero">
      <p class="eyebrow">Storybook preview</p>
      <h1>Profile AI coding-agent sessions locally.</h1>
      <p class="lede">Use this static Storybook build to review presentation components and content patterns for the GitHub Pages website.</p>
      <div class="hero-actions">
        <a class="button primary" href="/getting-started/">Get started</a>
        <a class="button" href="/dashboard/">Dashboard shell</a>
      </div>
    </section>
  </main>
`;

export const SignalCards = () => `
  <main class="content">
    <section class="card-grid" aria-label="Agent Profiler signals">
      <article><h2>Hook traffic</h2><p>Normalize supported coding-agent events into one local profile.</p></article>
      <article><h2>Token estimates</h2><p>Separate input, output, tool-result, and shell-output usage signals.</p></article>
      <article><h2>Tool noise</h2><p>Find oversized responses and repeated command output.</p></article>
      <article><h2>Context weight</h2><p>Review always-on files that add hidden session cost.</p></article>
    </section>
  </main>
`;
