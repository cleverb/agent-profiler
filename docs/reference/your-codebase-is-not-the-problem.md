---
title: Your Codebase Isn’t the Problem. Your Decision System Is.
subtitle: Why annotations, ADRs, docs, linters, skills, and subagents matter more in the age of AI
author: Dudley Bryan
date: Apr 20, 2026
---

# Your codebase isn’t struggling because the code is bad. It’s failing because the decisions behind it are vanishing.

For decades, we treated codebases as collections of logic. Then we learned to see them as systems. Now they’ve become something else entirely: Decision Environments.

And we are no longer the only ones operating inside them.

AI agents don’t hesitate. They don’t ask for missing context. They resolve ambiguity with total confidence… and occasional, silent failure.

Where a developer pauses because something feels “off,” an agent proceeds. That difference is where systems begin to drift.

Whether you’re a solo vibe coder trying a new AI tool or an enterprise team absorbing engineers with different IDE religions, the problem is the same: your decisions don’t travel with your code. The why gets left behind. We’ve always known that good documentation should be a living document, expected to evolve, never truly finished. But in practice, living documents die quietly in /docs folders. This is a strategy for changing that.

Modern development is no longer just about writing code. It is the art of:

Preserving intent across generations of contributors.
Coordinating change across disconnected teams.
Building guardrails so AI can participate in that evolution without unintentionally derailing it.
That last point changes everything.

Press enter or click to view image in full size

The Missing Layer: Decision Context
Most codebases are rich in implementation detail, but poor in decision context. You can tell what a function does, but rarely why it was chosen over the alternative.

Is this code “bad,” or is it a load-bearing workaround?

Now imagine an AI agent encountering that ambiguity. It sees inconsistency and “fixes” it. It sees legacy code and “cleans” it up. Without context, these are reasonable actions. In a real system, they are often catastrophic.

Our systems encode what exists, but not the intent behind it. That missing “why” is the difference between safe evolution and silent architectural drift.

From Code to Decision
To operate safely in an AI-assisted world, context cannot live in a forgotten design doc. It must live inside the codebase itself, accessible to both humans and machines.

We don’t need more documentation. We need a Decision Graph:

Decisions as first-class entities.
Logic explicitly linked to those decisions.
Agents that treat context as a hard constraint, not a suggestion.
Natural Synergies with how we already work.
What follows is an effort to construct a unifying theory of this moment… and the opportunity to move from “executional” coding to “operational” system design with already familiar patterns.

A note: this is a shift in posture, not a wholesale reinvention. A few well-placed annotations and a maintained ADR won’t transform your codebase overnight, but they change how you, your team and your agents think about it. That distinction matters. Each one of these components is familiar by design — this strategy should slip on like a well worn pair of shoes. How far it takes you depends entirely on your discipline.

This graph connects:

The intent behind a system
The implementation of that intent
And the rules for evolving it safely
Once this exists, something important changes.

AI doesn’t just generate code.

It begins to participate in decisions.

From Passive Records to Active Infrastructure
The concept of Architecture Decision Records (ADRs) is widely credited to Michael Nygard, who introduced the pattern in his 2011 post “Documenting Architecture Decisions.” Before that, architectural intent was typically buried in large, static documents — often outdated, rarely consulted, and disconnected from day-to-day development.

ADRs changed that.

They made architectural thinking:

Lightweight
Version-controlled
Embedded in the developer workflow
For the first time, teams had a practical way to capture not just what was built, but why it was built that way.

But ADRs have traditionally played a passive role.

They exist as records.

They require a developer to:

Know they exist
Go find them
Interpret them
And manually apply their guidance
In practice, this means the most critical context in a system is often:

Underutilized
Forgotten
Or bypassed entirely
The Shift: ADRs as Active Participants
Within a Decision System, ADRs stop being static documents.

They become active infrastructure.

Instead of sitting in isolation, they are:

Referenced directly from code
Enforced through linting and workflows
Linked to execution paths through skills and automation
Interpreted continuously by both humans and agents
This changes their role entirely.

They no longer just preserve decisions.

They shape behavior.

And this is where the real transformation happens:

What was once tribal knowledge, scattered across tickets, conversations, and outdated docs…

Becomes:

Structured
Discoverable
Enforceable
And machine-readable
In this form, ADRs don’t just help developers understand the past.

They give AI systems the context needed to act responsibly in the present.

They turn a codebase from a collection of files into something far more powerful:

A system that carries forward its own intent.

🗄️ The First Anchor: ADRs (Capturing Intent)
Now that ADRs are positioned as active infrastructure, we can look at how they actually function as the first anchor in a Decision System.

They capture something most codebases lose over time:

The reasoning behind a choice
The alternatives that were rejected
The constraints that shaped the outcome
In theory, ADRs solve the “missing context” problem.

In practice, they usually fail.

Not because they’re wrong — but because they’re isolated.

They live in /docs.
Or in Confluence.
Or in a place no one checks during real work.

And over time, the system drifts away from them.

For ADRs to matter in an AI-driven workflow, they can’t be static records.

They need to become active participants in the codebase.

Not documentation.

Infrastructure.

From here, we’ll build the rest of the system:

How to structure and shape an ADR implementation
How annotations anchor decisions directly to code
How linters enforce architectural integrity
How skills turn decisions into executable behavior
And how subagents operate safely within that structure
Together, these form a closed loop — a system that doesn’t just store decisions, but actively preserves, mobilizes and enforces them.

1. ADR: The Structure
   Usually, these live in a top-level /docs directory. Using a numbered prefix is crucial for easy referencing in your annotations (e.g., ADR-004).

Plaintext

root/
├── docs/
│ └── adr/
│ ├── 0001-record-architecture-decisions.md
│ ├── 0002-use-typescript-for-all-new-features.md
│ └── 0003-component-tokenization-strategy.md
├── src/
└── ... 2. ADR: The Template (Markdown)
A good ADR doesn’t just record the “winning” decision; it catalogs an abridged inventory of abandoned patterns, those alternatives you rejected and why.

Markdown

# ADR-014: Card Normalization Strategy

- **Status:** Proposed | **Accepted** | Deprecated | Superseded by [ADR-022]
- **Date:** 2026-04-19
- **Deciders:** @engineering-team, @design-ops
- **Consulted:** @product-owner
- **Tickets:** [DSYS-231](https://jira.yourcompany.com/DS-231), [DSYS-442](https://jira.yourcompany.com/DSYS-442)

## Context and Problem Statement

Our current `Card` components are fragmented across three different sub-libraries. This causes visual inconsistency and makes global theme updates impossible. We need a single, "normalized" Card component that supports all existing use cases.

## Decision Drivers

- We need to support legacy spacing while moving toward a 4px grid.
- Subagents must be able to identify which cards are safe to refactor.
- No breaking changes for the checkout-flow team during Q2.

## Considered Options

1. **Option 1:** Create a `UniversalCard` and deprecate all others immediately.
2. **Option 2:** (Chosen) Implement a "Normalization Layer" (kib-foundation.card) that wraps legacy logic.

## Decision Outcome

Chosen Option: **Option 2**.
This allows us to unify the API without forcing a 100-component migration in a single sprint.

## Positive Consequences

- Engineers can start using the new API today.
- Agents can use the `@see ADR-014` annotation to understand why the wrapper exists.

### Negative Consequences

- Temporary increase in bundle size due to the normalization wrapper.
- Requires strict linting to prevent new "Legacy" card instances.

## Validation & Skills

- **Automated Skill:** `skills/verify-card-usage/Skill.md`
- **Checklist:**
  - [ ] New instances must use `ui-foundation.card`.
  - [ ] Legacy instances must be annotated with `@deprecated`.

3. Making it “Decision-Aware”
   To tie this into the “Decision Graph”, ensure your ADRs include these three specific meta-data points:

Status Tags: If an ADR is Deprecated, an AI agent reading the code should know that the linked annotation is now pointing to a "stale" decision.
The “Consulted” List: If it applies, this tells an agent (or a human) who to tag in a PR if they want to challenge the decision.
The “Skills” Link: Directly linking to a Skill file (your contextual markdown-based agent instruction) ensures the decision isn't just a philosophy, but a set of executable rules.
Various tools can assist with automatically creating and updating your ADRs. You can always prompt your coding agent to generate ADRs for you from your git history. Even better, enable the Atlassian MCP server and settle in for the initial research in “plan mode” and expanding the history of significant changes through chat.

Go a step further and try Vercel’s ADR Skills for establishing a clear standard apart from default assumptions by your agent’s AI model. Use a tool like Log4Brains and publish a browsable ADR library to socialize your architecture evolution alongside your Dashboards, SassDocs and/or Storybooks.

Pro Tip: Various tools, like log4brains or adr-log can automate ADR generation and visualization, but the system itself is tool-agnostic.

Press enter or click to view image in full size

Log4brains: a docs-as-code knowledge base for your development and infrastructure projects. It enables you to log Architecture Decision Records (ADR) right from your IDE and to publish them automatically as a static website. Especially powerful for communicating architecture changes to large engineering orgs.
More than ever, teams have a great many options. But for this system to work, decisions can’t remain in ADRs alone — they need to be anchored directly to the code they govern.

✏️ Annotations: Anchoring Decisions to Reality
This is where annotations move from “optional comments” to “critical infrastructure.” They bring the ADR directly to the line of code it governs.

Basic SCSS annotations

/// Legacy card helper
/// @deprecated Use ui-foundation.card
/// @see ADR-014 Card normalization strategy
/// @see DSYS-231 Migration ticket
Through annotations, this tiny block does something powerful… it represents a remote waypoint in your Decision Graph by linking:

Implementation (The code)
Architecture (The ADR)
Execution (The Backlog Ticket)
Expansive SCSS: The Architectural Anchor
For SCSS, SassDoc is the standard. This example is “expansive” because it covers the internal logic, the architectural “why,” and the safety constraints for an AI agent.

Expanded SCSS annotations

/// Responsive container mixin for standardized page gutters.
///
/// @group Layout
/// @access public
///
/// @parameter {String} $size [large] - The maximum width of the container (small, medium, large).
///
/// @example scss - Basic Usage
///   .my-page {
///     @include container-fixed('medium');
///   }
///
/// @remarks
///   **Architectural Note:** This mixin uses a hard-coded padding-inline 
///   because the horizontal rhythm ADR-004 is still in 'Draft' status.
///   Do not convert to dynamic tokens until ADR-004 is 'Accepted'.
///
/// @see https://github.com/org/repo/docs/adr/004-horizontal-rhythm.md
/// @see https://jira.yourcompany.com/browse/DSYS-101
///
/// @todo Replace hard-coded 24px gutter with `$spacing-gutter-token` once available.
@mixin container-fixed($size: 'large') {
display: block;
margin-inline: auto;
padding-inline: 24px; // [Hard-coded per ADR-004]
@if $size == 'small' {
max-width: 640px;
} @else if $size == 'medium' {
max-width: 960px;
} @else {
max-width: 1200px;
}
}
}
How it works:
The @see tag: This is the most important link in your "Decision Graph." It forces the reader (or AI) to look outside the code for the "Why."
The @remarks section: This is where you store the "Intrinsic Understanding." It’s not just documentation; it’s an inline warning and short form history signal.
The @todo + Ticket link: This bridges the gap between the code and the backlog, turning a static comment into an actionable unit of work.
TypeScript: The Component Decision Map
In TypeScript, we use TSDoc (the standard for TS). In order to help illustrate the “Decision-Aware” framing, this example shows a component that is in a transitional state.

TypeScript

/\*\*

- A highly flexible Button component used for primary actions.
- - @remarks
- This component is currently undergoing a refactor to support the new
- Design System tokens. Avoid adding new logic to the legacy `variant` prop.
-
- @param label - The text to be displayed inside the button.
- @param onClick - Callback function triggered on user click.
- @param variant - (Legacy) The visual style. Use 'primary' or 'secondary'.
- - @see {@link https://github.com/org/repo/docs/adr/012-button-tokenization.md | ADR-012: Button Tokenization}
- @see {@link https://jira.yourcompany.com/browse/DSYS-552 | DSYS-552: Migration to Design Tokens}
- - @example
- ```tsx

  ```

- <Button label="Submit" onClick={handleSubmit} />
- ```

  ```

- - @deprecated Use `UIButton` from the foundation library for all new features.
    \*/
    export const Button: React.FC<ButtonProps> = ({ label, onClick, variant }) => {
    // Implementation...
    };
    Resource for Directives: Be sure to visit the TSDoc Official Website. It provides a standardized list of tags like @remarks, @see, and @decorator.

Now, the ADR isn’t a forgotten document; it’s an active anchor. It tells the reader… human or AI… not just what the code is, but what it is becoming.

Teaching AI the Difference Between “Bad” and “In Transition”
Most AI coding tools today possess high local intelligence but zero “temporal awareness.” They see duplicated logic or a legacy mixin and conclude, “This is inefficient; I should refactor it.”

In a decision-aware codebase, the agent sees the @deprecated tag and the link to the Card normalization ADR. Its role shifts from Blind Optimization to Informed Participation.

Instead of a generic refactor, a subagent can now infer:

This code is “wrong” on purpose because it supports a migration path.
The “correct” pattern is found in ui-foundation.card.
I should only touch this if I am prepared to move the needle on ticket DSYS-552.
🚨 Linters: The Immune System (Enforcement)
We think of linting as the automated process of using software tools, to analyze source code for potential errors, stylistic inconsistencies, and suspicious patterns before the code is executed. In a decision-aware codebase, “linting” moves beyond syntax. It becomes the Immune System that detects Architectural Drift. Traditional linters check if your code is correct; decision “linters” check if your code is honest.

The Role: Validating the Decision Graph
They ensure that the Nerve Endings (Annotations) are actually connected to the Brain (ADRs). Without this, the “Digital Ancestry” of the codebase becomes a collection of broken links.

The Action: Custom Semantic Rules
Decision-aware linting should be configured to enforce the Contract layer of your documentation.

Constraint-Based Linting: Prevent the use of a @deprecated component unless it is accompanied by a @see ADR-XXX link.
Link Validation: Automatically verify that the file path in your @see annotation actually exists in the /docs/adr/ directory.
Migration Enforcement: Flag any new instance of a “Legacy” component if the current branch is not explicitly tagged with a migration ticket (e.g., DS-231).
Strategic Patterns for Decision-Aware Linting:
Enforce “Intentional” Comments: Use plugins like eslint-plugin-jsdoc to require specific tags (@remarks, @see) on any export that touches core business logic or design system tokens.
Boundary Linting: Use eslint-plugin-import or similar tools to prevent "Executional" code from importing "Operational" tools (like scripts inside .agents/), ensuring a strict separation between the system and the tools that manage it.
Annotation-to-Backlog Sync: Implement a custom rule that flags @todo comments if they do not include a link to an active backlog ticket. This prevents "Dark Matter" (forgotten tasks) from accumulating in the codebase.
Agent-Specific Rules: Configure specific rules for files in .agents/skills/ to ensure that every Skill.md includes a Context and Instructions header, making them reliably machine-readable for subagents.
This is the “2026 approach” you’re writing about. A Reviewer Subagent acts as a dynamic linter. It reads your PR_TEMPLATE.md, looks at the code, and then actually navigates to the linked ADR to see if the implementation matches the spirit of the decision.
Traditional Linter: “This variable name is too short.”
Subagent Linter: “You are using a Flexbox here, but ADR-012 says we are moving to CSS Grid for all new layout components. Please reconcile.”
“A linter in a decision-aware system isn’t just checking for missing semicolons; it’s checking for missing intent. It blocks ‘foreign practices’ and safeguards the overall health of the system. It’s the guardrail that ensures variations in implementation are held to a standard of ancestry, rather than being composed in a vacuum.”

🤖 Subagents: The Specialized Workforce (Autonomy)
If the codebase is a “living” decision environment, then Subagents are the specialized “cells” that carry out specific functions within that environment.

Instead of one “God-Agent” trying to understand the whole repo, you employ subagents with narrow, high-context roles.

The Role: They are the Primary Consumers of the Skills. While a human might read a Skill once and internalize it, a subagent “wears” the Skill like a specialized suit to perform a task.
The Action: You might trigger a “Migration Subagent.” Its only job is to find @deprecated tags, read the linked ADR-014, look up the corresponding Skill.md, and execute the transform-props.py script.
The Framing: Subagents provide Context-Guided Autonomy. Because you’ve provided the “Waypoints” (Annotations) and the “Manual” (Skills), the subagent doesn’t need to ask for permission or clarification. it can operate safely because it is grounded in the “Decision Graph.”
The Trigger: Your subagents may end up being activated in a plethora of ways. Automatically delegated by their descriptions, much like agent skills, Manually invoked in chat per your request, through Automations through Events & Schedules or via Skills they are intimately connected to and via the CLI.
In the architecture we’re building, Subagents could sit in a directory that defines their identity and boundaries, separate from the “How-To” (Skills) and the “Tools” (Commands). My architecture for subagents is admittedly still a bit in flux, due to the variability across tools for this category.

If we follow the “Package-as-Name” and “Encapsulation” pattern, the ideal place for them is a .agents/roles/ (or perhaps .agents/subagents/) directory. This keeps the "Who" distinct from the "How." With updates like Cursor 3.0 and its heavy focus on multiagent orchestration we have some flexibility. However, amongst options like VS Code / Copilot, Claude Code / Claude SDK and Windsurf, your mileage will vary.

The “Operational” Directory Structure
By making their home in roles/, we are essentially creating a Manifest for each specialized agent. However, stayed tuned for active new developments in this area.

Plaintext

root/
├── .agents/
│ ├── commands/ <-- The "Tools"
│ ├── skills/ <-- The "How-To" (Instruction Packages)
│ └── roles/ <-- The "Who" (Subagent Definitions)
│ └── migration-specialist/
│ ├── Role.md <-- Persona, boundaries, and primary mission
│ ├── config.json <-- Model parameters, tool access, policies, etc.
│ └── references/ <-- Specific examples of successful tasks
├── .cursor/
│ └── roles/ <-- Symlinks to .agents/roles
└── ...

# Role: Migration Specialist

## Mission

Safely migrate code from approved legacy patterns to current patterns defined by active ADRs and linked Skills.

## Primary Responsibilities

- Detect legacy implementations marked with approved migration annotations
- Read linked ADRs before proposing or applying changes
- Use only approved Skills and commands for migration work
- Preserve compatibility layers unless the ADR and migration state allow removal

## Boundaries

- Do not invent new target patterns
- Do not delete legacy code without confirming replacement coverage
- Do not modify unrelated architecture
- Do not proceed when annotations, ADR links, or migration state are missing

## Escalation Rules

Escalate to a human when:

- an annotation points to a missing ADR
- the ADR status is deprecated, superseded, or ambiguous
- the code appears load-bearing but is insufficiently documented
- more than one migration strategy appears valid

## Inputs

- Code with `@deprecated`, `@see ADR-xxx`, or equivalent markers
- Relevant ADRs in `/docs/adr`
- Approved migration Skills in `.agents/skills/`
- Approved commands in `.agents/commands/`

## Expected Output

- Minimal scoped changes
- Brief migration summary
- List of assumptions
- Validation results
- Explicit escalation note when blocked

## Success Criteria

- Migration follows linked ADR
- No unauthorized pattern substitutions
- Required checks run successfully
- Decision links remain intact
  Why “Roles” instead of “Subagents”?
  Naming the directory roles/ aligns perfectly research on Operational Team Workflows. In a high-maturity team, you don't just have "employees"; you have "roles" with specific accountabilities.

A Role.md file within this structure acts as the subagent’s “Employee Handbook.” It should include:

The Mission: “Your goal is to safely move code from state A to state B based on ADR-014.”
Skill Access: A list of which directories in .agents/skills/ this role is authorized to use.
Command Access: Which scripts in .agents/commands/ it can execute.
Escalation Path: When the agent detects an “Unmarked Decision” (no annotation), it must stop and alert a human architect.
Press enter or click to view image in full size

🦾 Skills: The Execution Layer for Agents
If ADRs are the “Why” and annotations are the “Where,” then Skills are the “How.” In the context of agentic development, a “Skill” is a set of guided instructions that teach an agent how to act on the decision graph. It is the bridge between knowing there is a migration and executing it correctly.

A well-defined Skill encodes the “unwritten rules” of your team:

Interpretation: “When you see @deprecated, check the @see link before suggesting a change."
Navigation: “Always cross-reference the SassDoc to ensure we aren't reinventing a global utility."
Validation: “If an ADR-014 is referenced, ensure the new component passes the normalization suite.”
To complete the “Decision Graph,” the Skills directory serves as the executable manual for your agents. If the ADR is the “Why” and the annotations are the “Where,” the Skill is the “How-To.”

As of the start of 2026, these are typically stored in a way that AI IDEs (like Cursor, Windsurf, or Copilot) and custom subagents can ingest as “contextual law.”

1. Skills: The Directory Structure
   You want these organized by domain or initiative so that agents don’t get overwhelmed by “context bloat.”

Plaintext

root/
├── .agents/
│ ├── commands/
│ │ ├── create-branch-from-ticket.md
│ │ ├── migrate-deprecated-components.md
│ │ └── ...
│ └── skills/
│ ├── core/
│ │ └── naming-conventions/
│ │ └── Skill.md
│ ├── architecture/
│ │ └── adr-navigation/
│ │ ├── Skill.md
│ │ └── references/ <-- ADR templates and status definitions
│ │ └── adr-status-lifecycle.md
│ └── migrations/
│ └── card-normalization/ <-- The "Skill Package"
│ ├── Skill.md <-- The instruction set
│ ├── scripts/ <-- Executable logic for the agent
│ │ └── transform-props.py
│ └── references/ <-- Contextual anchors
│ ├── legacy-code-snippet.ts
│ └── adr-014-excerpt.md
├── .cursor/
│ └── commands/ <-- Symlinks to .agents/commands/
│ ├── create-branch-from-ticket.md
│ ├── migrate-deprecated-components.md
│ └── ...
├── docs/adr/
└── src/ 2. Skills: The Content
This isn’t just documentation; it’s a prompt-engineered instruction set.

Markdown

# Skill: Card Normalization (ADR-014)

## Context

We are migrating all legacy cards to `ui-foundation.card`. This skill ensures that any agentic refactoring adheres to the constraints defined in ADR-014.

## Detection Rules

- **Trigger:** When the agent modifies any file containing `@deprecated` cards or references to the `LegacyCard` component.
- **Anchor:** Look for `/// @see ADR-014` in the file header.

## Instructions for the Agent

1. **Never** delete a legacy card without verifying its usage in the `DSYS-231` migration tracker.
2. **Implementation:** When replacing a legacy card, use the following mapping:
   - `LegacyCard.header` -> `Card.Title`
   - `LegacyCard.footer` -> `Card.Actions`
3. **Validation:** After refactoring, run `npm run test:visual --component=Card` to ensure no regression.

## Links

- **Policy:** [ADR-014](../../docs/adr/0014-card-normalization.md)
- **Execution:** [Ticket DS-231](https://jira.yourcompany.com/DSYS-231)
  The power of this system is the closed loop. Here is how the information flows to create that “intrinsic understanding” you mentioned in your ending:

ADR (The Brain): Decides the strategy.
Annotation (The Nerve Ending): Marks the implementation.
Linter (The Immune System): Ensures the mark stays accurate and the link isn’t broken.
Skill (The Muscle): Defines how to act on that mark.
Subagent (The Cell): Uses the Muscle to execute the change, guided by the Brain.
By providing these “Waypoints,” you allow subagents to operate autonomously without drifting from the architectural vision.

Other Important Documents
README.md
CONTRIBUTING.md
PULL_REQUEST_TEMPLATE.md
AGENTS.md

1. README.md: The Discovery Hub
   Instead of just “How to install,” the modern README is a Map of Intent.

Guideline: It must link directly to the /docs/adr index.
AI Context: It serves as the “High-Level Context” for an agent’s initial sweep. If the README doesn’t mention the Decision Graph, the agent will treat the repo as a pile of logic. 2. CONTRIBUTING.md: The Operational Contract
This is where you define the Systemic Capability.

Guideline: Include “The Definition of Done” for the Decision Graph. A contribution is not “Done” unless:
The code is written.
The relevant ADR is referenced or created.
The affected Skill is updated.
The Linter passes for architectural honesty.
AI Context: Teaches agents (and humans) how to participate in the evolution without causing “Architectural Drift.” 3. PULL_REQUEST_TEMPLATE.md: The Quality Gate
This is the most critical “Operational” document for the Immune System.

Guideline: Add a “Decision Integrity” checklist:
[ ] Does this PR resolve/update a linked ADR?
[ ] Have the @see annotations been verified?
[ ] Does this change require an update to a Skill.md package?
AI Context: Allows a Subagent to automatically “pre-review” a PR to ensure the “Digital Ancestry” is preserved before a human even looks at it. IDEs like Cursor or Claude can have lifecycle “hooks” to further ensure compliance, but outling pre-commit expectations here represents a more agnostic aspect of “decision linting”. 4. AGENTS.md: The Constitution
This is the “Rules for Robots” file.

Guideline: Use this to define Escalation Paths. \* Example: “If you encounter a @deprecated tag without a @see link, you are forbidden from refactoring. Open a 'Clarification Required' issue for a human architect."
AI Context: This acts as the “Global System Prompt” for any agent entering the repo. It defines the “sandbox” boundaries.
Press enter or click to view image in full size

🧬 From Static Code to a Moving Organism
When we connect these dots — linking SassDoc to ADRs, and ADRs to active backlog tickets — the codebase begins to function as a decision-aware environment. We reduce the risk of “overconfident cleanup” — the tendency for developers (and especially AI) to remove “dead weight” that is actually a necessary compatibility layer. We preserve the vital distinction between code that is “wrong” and code that is “not done yet.”

This transformation turns the backlog from a list of chores into a roadmap of intent. Instead of a vague “Clean up styles” ticket, an agent can generate a scoped, high-quality task: “Complete the spacing system migration in the Button component, as defined in ADR-009.”

The Decision System Flow: It moves logically from Problem (Missing Context) → The Tool (ADR) → The Bridge (Annotations) → The Intelligence (Skills) → The Outcome (Intrinsic Understanding).

Final Thoughts
Press enter or click to view image in full size

Codebases don’t fail because people stop writing good code. They fail because people lose track of its purpose and how it was intended to evolve.

As we discussed, annotations reconnect code to decisions, ADRs preserve those decisions over time and skills teach how to act on them. A myriad of other documentation practices and agentic signals form the underlying DNA of your decision environment, serving functions both latent and active as it continues to grow.

While your skills can wield custom sophisticated scripts, first and third party MCP servers, Extensions and Plugins can allow your coding environment to connect to JIRA/ticketing, Confluence/wikis, Slack, Outlook Mail/Calendars and many more resources to help inform agentic coding.

Altogether, these elements manifest something that brims with excitement and promise: A codebase that doesn’t just execute logic, but carries an intrinsic understanding of its complex digital ancestry. The “living document” we always hoped for… expected to evolve, never truly finished, has finally found its native habitat. With linters acting as an immune system and subagents as an autonomous workforce, we aren’t just managing files anymore… we are stewards of a living decision environment.
