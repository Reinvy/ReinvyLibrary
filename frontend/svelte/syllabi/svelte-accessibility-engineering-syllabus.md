---
title: "Svelte Accessibility Engineering Syllabus"
description: "A twelve-week advanced curriculum on shipping WCAG 2.2-conformant Svelte and SvelteKit applications: semantic templates, focus and keyboard architecture, runes-driven ARIA state, assistive-technology testing, CI accessibility gates, and inclusive design systems."
category: "frontend"
technology: "svelte"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Svelte Accessibility Engineering Syllabus

## Overview

Most accessibility material stops at "use semantic HTML and add alt text." This syllabus treats accessibility as an engineering discipline with architecture, test strategy, and operational cost — the level of rigor teams need when a conformance failure blocks a procurement review, a public-sector contract, or an app-store release.

Svelte is an unusually good teaching vehicle for this material. Its compiler emits plain DOM with no synthetic event layer, no wrapper elements, and no virtual DOM diffing, so what you write in a template is almost exactly what the accessibility tree sees. That transparency makes cause and effect legible: a bad heading level is a bad heading level, a mis-scoped `<button>` is a real element, and focus management is plain DOM work rather than a framework abstraction. SvelteKit adds its own surface area — client-side navigation that never fires a page load, form actions with progressive enhancement, and server-rendered shell transitions that can silently break screen-reader context.

The course is built around one running product: a conference registration flow that must pass a WCAG 2.2 AA audit by Week 12. Every module adds features to that product and re-runs the same audit harness, so learners watch the conformance score move as a consequence of their own decisions instead of reading about accessibility in the abstract.

Difficulty is deliberately advanced. Learners should already be comfortable with Svelte 5 runes, SvelteKit routing and load functions, and TypeScript. The course does not reteach framework basics; it assumes them and spends its budget on the parts of accessibility that require architectural decisions, cross-team process, and assistive-technology testing.

## Curriculum

### Module 1: Accessibility as an Engineering Discipline (Week 1)

- **Conformance, not compliance theater**
  - WCAG 2.2 levels A, AA, and AAA; what "substantially conforms" actually permits
  - POUR as an organizing model: perceivable, operable, understandable, robust
  - Regulatory drivers: European Accessibility Act, EN 301 549, ADA Title II/III, Section 508, and how each one maps back to WCAG success criteria
- **The assistive technology landscape**
  - Screen readers (NVDA, JAWS, VoiceOver, TalkBack, Narrator), screen magnifiers, switch access, voice control, and refreshable braille
  - Why one screen reader pass is never enough, and how to pick a defensible test matrix for a given product and audience
- **Why Svelte makes the failure modes visible**
  - The compiler emits real elements: no wrapper `<div>` layers, no synthetic event delegation to reason around
  - SvelteKit's client-side navigation replaces DOM without a document load — the single largest source of silent accessibility regressions in Svelte apps
  - Compiler and linter accessibility warnings as a first line of defense, and the rule of never disabling them without a written reason
- **Lab**: Audit an existing SvelteKit marketing page with a keyboard only, catalogue every defect in a shared register, and score the page against WCAG 2.2 AA by hand

### Module 2: Semantic Foundations in Svelte Templates (Week 2)

- **Landmarks and document structure**
  - Header, nav, main, aside, footer, and the `aria-label` discipline for repeated landmarks
  - One `<main>` per page; SvelteKit layout composition as the place to enforce it
  - Heading order as a document outline contract, and why visual size must be decoupled from heading level
- **Block semantics under `{#if}`, `{#each}`, and `{#snippet}`**
  - List semantics that survive keyed each blocks and empty states
  - Empty-state announcements: the difference between "no results" as text and as silence
  - `<svelte:element>` for semantics that must change with data, and the accessibility cost of polymorphic output
- **Buttons versus links**
  - Anchor for navigation, button for action; why a styled `<a href="#">` costs every keyboard user a broken expectation
  - `disabled` attributes versus `aria-disabled`, and preserving focusability where needed
- **Compiler warnings worth understanding**
  - `a11y_*` warnings: missing alt, unmatched labels, non-interactive element with handlers, redundant roles
  - `eslint-plugin-svelte` accessibility rules and how they catch what the compiler does not
- **Lab**: Rebuild the registration landing page with a correct landmark structure, an outline-safe heading tree, and zero suppressed `a11y_*` warnings

```svelte
<script lang="ts">
  let sessions: Session[] = $props();
</script>

<main id="main">
  <h1>Register for SvelteConf 2026</h1>

  {#if sessions.length === 0}
    <p role="status">No sessions are open for registration yet. Check back soon.</p>
  {:else}
    <h2>Available sessions</h2>
    <ul>
      {#each sessions as session (session.id)}
        <li>
          <h3>{session.title}</h3>
          <p>{session.abstract}</p>
          <a href="/sessions/{session.slug}">Session details</a>
        </li>
      {/each}
    </ul>
  {/if}
</main>
```

### Module 3: Focus Management and Keyboard Architecture (Week 3)

- **Focus as application state**
  - The rule of one focus target per user-visible transition
  - Never removing focus without placing it somewhere predictable
  - `tabindex` values: `0` for custom widgets, `-1` for programmatic targets, positive values never
- **Route changes in a single-page application**
  - `afterNavigate` in SvelteKit to move focus to the new `<h1>` or main container
  - Announcing the new page title through a polite live region
  - Preserving scroll position without stranding focus off-screen
- **Modal and trapped interactions**
  - Native `<dialog>` with `showModal()` and why it outperforms a hand-rolled overlay
  - Focus containment, initial focus selection, return focus on close, and Escape handling
  - `use:` actions as the reusable home for focus trap logic
- **Composite widgets and roving tabindex**
  - One tab stop per widget, arrow keys inside: toolbar, tab list, menu patterns
  - Skipping over disabled items without breaking the keyboard model
- **Lab**: Wire focus restoration into the registration wizard (step transitions, dialog confirmation, error state) and verify with keyboard only

```typescript
// src/lib/actions/focus-trap.ts
export function focusTrap(node: HTMLElement) {
  const selector =
    'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

  function handleKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(node.querySelectorAll<HTMLElement>(selector));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;

    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  node.addEventListener('keydown', handleKeydown);
  return {
    destroy() {
      node.removeEventListener('keydown', handleKeydown);
    }
  };
}
```

### Module 4: Runes, Live Regions, and Announced State (Week 4)

- **Live regions that do not spam**
  - `aria-live="polite"` versus `assertive`, and why assertive is almost always wrong for validation
  - Announcing a message once: a queue driven by `$state` with a monotonically increasing message key
  - The classic bug of a live region mounted with content already inside it
- **Runes and accessible state derivation**
  - `$state` for widget state that ARIA attributes mirror, `$derived` for computed `aria-*` values
  - `$effect` boundaries: never use an effect to mirror state that should have been derived
  - Synchronizing `aria-expanded`, `aria-selected`, and `aria-current` without drift
- **Status and loading affordances**
  - `aria-busy`, skeleton placeholders, and hiding decorative spinners from the tree
  - Announcing long operations once at start and once at completion
- **Motion preferences**
  - `prefers-reduced-motion` as a first-class branch, not a global CSS switch
  - Svelte transitions with `reducedMotion` awareness and the cost of ignoring it
- **Lab**: Add a save-status live region and a validation announcer to the wizard, then prove with a screen reader that each message is spoken exactly once

### Module 5: Forms, Validation, and Error Recovery (Week 5)

- **Progressive enhancement as an accessibility feature**
  - SvelteKit form actions that work with JavaScript disabled and improve with it
  - `use:enhance` as an upgrade layer, never a requirement
- **Labeling and instructions**
  - Visible labels, programmatic association, and the placeholder anti-pattern
  - `aria-describedby` for hints, `aria-invalid` for state, `aria-required` versus the `required` attribute
  - Grouping with `fieldset` and `legend` for radio and checkbox sets
- **Error architecture**
  - An error summary at the top of the form with links to each field, plus inline messages
  - Moving focus to the summary on submit failure, then to the first invalid field
  - Identical wording in the summary and the field: divergence is a WCAG 3.3.1 failure in practice
- **Input purpose and memory**
  - Autocomplete tokens for WCAG 1.3.5 Identify Input Purpose
  - Redundant entry (3.3.7): never ask for the same data twice in a multi-step flow
  - Accessible authentication (3.3.8): no cognitive function tests, paste allowed in password fields
- **Lab**: Rebuild the registration form with a shared Zod schema, an error summary, correct autocomplete tokens, and a fully keyboard-operable validation cycle

### Module 6: Component Architecture for Accessible Design Systems (Week 6)

- **The accessible component contract**
  - Every component documents its keyboard interaction, announced roles, and required labels
  - Prop design that makes the inaccessible path hard to take: required `label` props, not optional ones
  - `$props()` with `...rest` spread so native attributes and ARIA pass through untouched
- **Composition patterns**
  - Compound components with `setContext` and `getContext`, and the typing discipline that keeps state honest
  - Snippets for flexible content while preserving the owning component's semantics
  - Headless primitives versus opinionated components: when each earns its keep
- **Accessible names**
  - The accessible name computation order and where `aria-labelledby` beats `aria-label`
  - Icon-only buttons: a name is mandatory, a tooltip is not a name
- **Testing the contract**
  - Component tests that assert roles and names, not class names
  - Snapshotting the accessibility tree instead of the DOM
- **Lab**: Extract the wizard's inputs, dialog, and step indicator into a documented component library with a keyboard contract per component

### Module 7: Complex Widgets and the ARIA Discipline (Week 7)

- **The first rule of ARIA**
  - No ARIA is better than bad ARIA; native elements first, always
  - The three legitimate reasons to reach for a role, and the maintenance debt each one creates
- **WAI-ARIA Authoring Practices patterns**
  - Combobox, listbox, menu button, disclosure, tabs, and dialog: required roles, states, and key handling
  - The combobox pattern in particular, where partial implementations are worse than plain selects
  - Grid versus table: when a data table is genuinely a grid
- **State synchronization in Svelte**
  - Deriving every `aria-*` attribute from a single state source so the widget cannot lie
  - Handling typeahead, home/end, and page-up/page-down consistently
- **When to choose the boring solution**
  - Native `<select>`, `<details>`, and `<dialog>` versus custom widgets
  - Measuring the real cost of a custom combobox against its design benefit
- **Lab**: Build one custom combobox and one menu button to specification, then replace the combobox with a native control and document the trade-off

### Module 8: Media, Motion, and Visual Accessibility (Week 8)

- **Images and SVG**
  - The alt text decision tree: informative, decorative, functional, complex
  - Inline SVG: `role="img"` with `title`, or `aria-hidden` plus adjacent text — never both half-done
  - Charts and diagrams: short name plus a long description path
- **Time-based media**
  - Captions, transcripts, and audio description; `<track kind="captions">`
  - Autoplaying media, pause controls, and WCAG 1.4.2
- **Visual requirements that engineers own**
  - Contrast for text and non-text UI (1.4.3, 1.4.11), and why design tokens are the right fix
  - Focus appearance (2.4.11, 2.4.13): the indicator must be visible, not merely present
  - Target size (2.5.8), reflow at 320 CSS pixels (1.4.10), text spacing (1.4.12)
- **Motion**
  - Parallax, autoplay carousels, and looping animation under 2.2.2
  - Applying `prefers-reduced-motion` inside Svelte transitions and CSS layers together
- **Lab**: Bring the conference schedule to contrast, reflow, and target-size conformance, and add a motion-safe carousel

### Module 9: Internationalization, RTL, and Cognitive Accessibility (Week 9)

- **Language and direction**
  - `lang` on the document and on inline foreign-language spans; SvelteKit route params driving it
  - `dir="rtl"` with logical CSS properties, mirrored icons, and the parts that must not mirror
  - Number, date, and currency formatting that a screen reader pronounces correctly
- **Localized accessibility text**
  - Translating labels, error messages, and live-region announcements as part of the message catalog
  - Pluralization and gender in announcements; why string concatenation breaks them
  - The trap of translating an ARIA label but not the visible text it duplicates
- **Cognitive load**
  - Plain language, consistent navigation and identification (3.2.3, 3.2.4), consistent help (3.2.6)
  - Error prevention for legal and financial submissions (3.3.4)
  - Timeouts, session extension, and preserving entered data (2.2.1)
- **Lab**: Ship a right-to-left locale for the registration flow with correct language attributes and translated announcements

### Module 10: Testing, Auditing, and Regression Prevention (Week 10)

- **Automated coverage and its ceiling**
  - `axe-core` through `vitest-axe` and Playwright: what it catches, and the widely cited fraction it does not
  - `eslint-plugin-svelte` accessibility rules in the editor and in CI
  - Pa11y CI and Lighthouse as smoke tests, never as a conformance verdict
- **Manual testing that finds real defects**
  - Keyboard-only passes with a written script per flow
  - Screen reader passes on NVDA (browse versus focus mode), VoiceOver on macOS and iOS, and TalkBack
  - Zoom to 400 percent, forced colors mode, and reduced motion
- **Scripted, repeatable audits**
  - Writing a test script a non-author can run: preconditions, steps, expected announcement
  - Triaging false positives and documenting accepted risks with owners and expiry dates
- **The regression suite**
  - Seeding accessibility assertions into the component and E2E suites
  - Tracking violation counts as a budget so new debt is visible in review
- **Lab**: Produce a full audit report for the registration flow with reproduction steps and severity, and convert the top five findings into automated tests

### Module 11: CI Gates, Governance, and Team Practice (Week 11)

- **Gates that block without blocking velocity**
  - Failing the build on new violations while grandfathering a measured baseline
  - Where to run the checks: pre-commit, pull request, nightly deep scan
  - Keeping audit runtime under a few minutes so nobody routes around it
- **Documentation obligations**
  - Accessibility statements, VPAT and ACR responses, and the evidence each one requires
  - Writing an internal decision record for every accepted accessibility risk
- **Design and review process**
  - Accessibility acceptance criteria in tickets, written before implementation
  - A review checklist for keyboard, focus, and announcement behavior
  - Design reviews that catch contrast and target-size problems before code exists
- **Culture and capability**
  - Training that survives staff turnover; pairing screen-reader sessions with designers
  - Involving users of assistive technology, and paying them
  - Incident response for accessibility defects that reach production
- **Lab**: Add a pull-request accessibility gate with a violation baseline, and write the accessibility statement for the conference site

### Module 12: Migration, Legacy Debt, and the Capstone (Week 12)

- **Auditing an inherited Svelte codebase**
  - Inventory by route and risk: authentication, payment, and data-entry flows first
  - Distinguishing framework-level defects from design-level defects
- **Incremental remediation**
  - Fixing semantics first because it is the cheapest high-impact work
  - Component-level fixes that propagate, versus page-level patches that do not
  - Why accessibility overlay widgets fail, and what to tell a stakeholder who asks for one
- **Prioritization**
  - Severity by user impact and frequency: a broken date picker outranks a missing `aria-current`
  - Sequencing remediation against feature work without stalling either
- **Capstone review**
  - Presenting the audit delta, the remaining debt, and the operational plan that keeps it from regrowing
- **Lab**: Remediate a deliberately broken legacy Svelte 4 page set and produce the before-and-after conformance diff

## Final Project

Build, audit, and defend **AccessPass**, a conference registration application in SvelteKit that conforms to WCAG 2.2 Level AA:

- A multi-step registration wizard (session selection, attendee details, payment summary, confirmation) with correct focus placement and announcement on every step transition
- A form layer using shared Zod validation, an error summary with focus management, field-level errors tied through `aria-describedby`, and correct autocomplete tokens
- One custom composite widget built to the WAI-ARIA Authoring Practices specification, plus a written justification for why a native control was not used
- An accessible component library where every component documents its keyboard contract, roles, and required accessible name
- Localized English and right-to-left Arabic flows, with translated announcements and correct `lang` and `dir` handling
- A complete audit report: automated results from axe and Pa11y, keyboard test scripts, a screen-reader test matrix across at least two assistive technologies, and severity-ranked findings
- A pull-request gate that fails on new violations against a committed baseline, and an accessibility statement describing conformance level and known limitations

The project is deliberately a registration flow rather than a dashboard because it concentrates the hardest problems — multi-step state, validation, payment, timeouts, and localization — into a flow that every user must complete.

## Assessment Criteria

- **Assignments**: Each weekly lab is reviewed for conformance (the specific success criteria named in the brief are met), for evidence (the learner can demonstrate the fix with a keyboard or screen reader recording), and for durability (the fix is architectural rather than a one-off patch). Suppressing a compiler or linter accessibility warning without a written justification is an automatic fail for that lab.
- **Audit report**: Graded on whether findings are reproducible by a second person, correctly mapped to WCAG success criteria, and ranked by user impact rather than by ease of fixing.
- **Final Project**: Weighted as 40 percent functional conformance, 25 percent test and audit quality, 20 percent architecture and component contract documentation, and 15 percent the operational plan — the CI gate, the statement, and the remediation backlog with owners.
- **Capstone defense**: The learner must explain why each remaining known limitation was accepted, what user group it affects, and when it will be addressed.

## References

- [WCAG 2.2 Specification](https://www.w3.org/TR/WCAG22/) — the normative success criteria and their understanding documents
- [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) — keyboard interaction and role patterns for composite widgets
- [Svelte Accessibility Documentation](https://svelte.dev/docs/svelte/compiler-warnings) — compiler accessibility warnings and their remedies
- [SvelteKit Documentation](https://svelte.dev/docs/kit) — routing, form actions, hooks, and `afterNavigate`
- [eslint-plugin-svelte](https://sveltejs.github.io/eslint-plugin-svelte/) — accessibility lint rules for Svelte templates
- [axe-core](https://github.com/dequelabs/axe-core) and [Pa11y](https://pa11y.org/) — automated accessibility testing engines
- [WebAIM Screen Reader User Survey](https://webaim.org/projects/screenreadersurvey/) — assistive technology usage data for building a test matrix
- [Inclusive Components](https://inclusive-components.design/) — practical patterns for accessible widgets
