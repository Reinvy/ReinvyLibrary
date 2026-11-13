---
title: "Swift Accessibility Engineering Syllabus"
description: "A 10-week advanced curriculum on engineering accessibility into iOS apps with Swift — the accessibility tree, semantics, Dynamic Type reflow, VoiceOver focus, assistive input, automated audits, CI gates, and accessible design systems at scale."
category: "mobile"
technology: "swift"
difficulty: "advanced"
type: "syllabus"
locale: "en"
---

# Swift Accessibility Engineering Syllabus

## Overview

This 10-week advanced syllabus is built for iOS engineers who already ship SwiftUI and UIKit features and now need accessibility to be a systematic part of the engineering process rather than a cleanup task before release. Where introductory material stops at "add an accessibility label", this curriculum treats accessibility as an engineering discipline: you will learn how the platform exposes your interface as a semantic tree, how to shape that tree deliberately, how to keep layouts intact across the full Dynamic Type range, how to design focus and assistive-input paths for complex flows, how to make custom-drawn components and gestures usable without sight or without touch, and how to enforce all of it with automated audits and CI gates so regressions never reach users.

The curriculum is deliberately cumulative. Weeks 1 to 3 establish the mental model and the low-level tools — the accessibility tree, semantic modifiers, and adaptive layout. Weeks 4 to 7 handle the interaction layer that automated tools cannot judge for you: focus management, assistive input, color and motion preferences, media alternatives, and custom components. Weeks 8 to 10 turn craft into process: audit automation, accessibility-aware testing in continuous integration, and a component-level design system contract that keeps a large codebase accessible as it grows. The capstone asks learners to take an existing app from an unknown baseline to a documented, measured, regression-protected state — the same shape of work a senior engineer is handed on a real team.

## Curriculum

### Module 1: Accessibility as an Engineering Discipline (Week 1)

- **Why accessibility belongs in the definition of done**
  - The product, legal, and maintenance cases: excluded users, regional accessibility legislation, and the cost of retrofitting later
  - Accessibility defects as defects: reproducibility, severity, ownership, and regression risk
  - The three modes of failure — invisible to assistive tech, technically exposed but semantically wrong, and exposed but unusable
- **The platform accessibility model**
  - How the system builds an accessibility tree from your view hierarchy and why the tree, not the pixels, is your real interface
  - Elements, labels, values, traits, hints, and actions as the contract you publish to assistive technologies
  - The gap between the visual hierarchy and the semantic hierarchy, and why they often disagree
- **Standards and expectations**
  - WCAG success criteria that map cleanly onto native mobile: non-text contrast, name/role/value, focus order, target size, and motion
  - Platform expectations versus legal minimums, and how to write an internal accessibility standard you can actually test
- **Baseline measurement**
  - Running a first VoiceOver walkthrough with the screen curtain on and recording every dead end
  - Accessibility Inspector: audit, inspection, and the color contrast picker
  - Building a baseline report: screens audited, defects found, severity, owner
- **Hands-on Lab**: Audit three screens of the course sample app with VoiceOver and Accessibility Inspector, then file each finding as a reproducible ticket with severity and a recording

### Module 2: Semantics and the Accessibility Tree (Week 2)

- **How views become elements**
  - Automatic element creation for standard controls and where it silently degrades for composed views
  - Containers versus leaves: choosing between exposing children and merging them into one element
  - Why a container with no label is read as nothing at all, and why over-merging destroys navigation granularity
- **Declaring semantics in SwiftUI**
  - `accessibilityLabel`, `accessibilityValue`, and `accessibilityHint` — what belongs in each and what does not
  - Traits: `.isButton`, `.isHeader`, `.isSelected`, `.isImage`, `.isSummaryElement`, and updating traits with state
  - Controlling structure with `.accessibilityElement(children:)` and replacing a visual tree with a semantic one using `.accessibilityRepresentation`
- **Declaring semantics in UIKit**
  - `isAccessibilityElement`, `accessibilityLabel`, `accessibilityTraits`, and custom `UIAccessibilityCustomAction`
  - Container views, `accessibilityElements`, and ordering when automatic order is wrong
- **Labels that survive localization and state**
  - Keeping labels free of control type and state words to avoid double announcements
  - Pluralization, grammatical gender, and RTL languages through String Catalogs
  - Deriving labels from real data instead of hardcoding "button" or "item"
- **Hands-on Lab**: Rework a card list and a custom-styled form so both publish a correct tree, then verify element count, order, traits, and announcements with VoiceOver and the Inspector

```swift
struct MeterCard: View {
    let label: String
    let reading: Double

    var body: some View {
        VStack(alignment: .leading) {
            Text(label).font(.headline)
            Text(reading, format: .number.precision(.fractionLength(1)))
                .font(.title2)
        }
        .padding()
        .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 12))
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(Text(label))
        .accessibilityValue(Text("\(reading, format: .number.precision(.fractionLength(1))) kilowatts"))
        .accessibilityAddTraits(.isStaticText)
    }
}
```

### Module 3: Dynamic Type and Layout Reflow (Week 3)

- **The type scale as a layout constraint**
  - Named text styles, relative sizing, and why hardcoded point sizes break the scale
  - `@ScaledMetric` for spacing and icon sizes that must grow with text
  - Supporting the full range from extra small through the accessibility sizes, where fonts can triple
- **Designing layouts that reflow instead of clipping**
  - The usual culprits: fixed heights, `lineLimit(1)`, side-by-side rows, and image overlays
  - `ViewThatFits`, `AnyLayout`, and switching from horizontal to vertical at large sizes with `dynamicTypeSize`
  - Multi-line button and row patterns that stay tappable at accessibility sizes
- **Truncation and overlap detection**
  - Reading `.dynamicTypeSize` in the environment and adapting content rather than hiding it
  - Verifying with the Environment Overrides panel at every step of the scale
  - Scrollability as a fallback, and the cases where a scroll view is the wrong answer
- **Hands-on Lab**: Take a two-column dashboard and make it fully usable at accessibility size 5, documenting each layout decision and capturing before/after comparisons

### Module 4: Focus, Navigation, and Assistive Input (Week 4)

- **VoiceOver focus as a first-class state**
  - The relationship between visual focus, accessibility focus, and view identity
  - `@AccessibilityFocusState` to move focus after navigation, sheet presentation, and validation errors
  - Announcing asynchronous state changes with `AccessibilityNotification.Announcement` instead of silently updating the screen
- **Navigation structure**
  - Headings as the fast path through long screens, and using the rotor to jump between them
  - Custom rotors and custom actions that expose secondary operations without cluttering the main path
  - Modal correctness: focus containment, dismiss gestures, and restoring focus on return
- **Assistive input beyond VoiceOver**
  - Voice Control: label-based invocation, numbered overlays, and keeping spoken commands unambiguous
  - Switch Control and Full Keyboard Access: focusable elements, key handlers, and a visible focus indicator
  - Minimum target sizes and the cost of gesture-only affordances
- **Hands-on Lab**: Make a three-step checkout flow navigable with VoiceOver, Voice Control, and Full Keyboard Access only — no direct touch — and fix every focus trap found

```swift
struct CheckoutView: View {
    @AccessibilityFocusState private var focus: Field?
    @State private var cardNumber = ""
    @State private var error: String?

    enum Field: Hashable { case card, expiry }

    var body: some View {
        Form {
            TextField("Card number", text: $cardNumber)
                .accessibilityFocused($focus, equals: .card)
            TextField("Expiry", text: .constant(""))
                .accessibilityFocused($focus, equals: .expiry)
            if let error {
                Text(error).foregroundStyle(.red)
            }
        }
        .onChange(of: error) { _, newValue in
            guard let newValue else { return }
            focus = .card
            AccessibilityNotification.Announcement(newValue).post()
        }
    }
}
```

### Module 5: Color, Contrast, and Non-Visual Parity (Week 5)

- **Contrast that holds up**
  - Non-text and text contrast thresholds, and measuring them against real rendered colors rather than design tokens
  - Semantic colors, elevated backgrounds, and materials that shift contrast in dark mode
  - Increase Contrast and Reduce Transparency as first-class variants, not afterthoughts
- **Never color alone**
  - Status conveyed through icon, shape, text, and position at the same time
  - Differentiate Without Color: patterns, outlines, and text badges for chart series and state chips
  - Icon-only buttons: labels for assistive tech and a redundant visual affordance for everyone else
- **Media parity**
  - Captions for video, transcripts for audio, and alternative text that describes purpose rather than appearance
  - Respecting audio descriptions and ducking background audio during spoken content
- **Hands-on Lab**: Run a contrast audit across light, dark, and increased-contrast appearances of the sample app, then fix every failure without flattening the visual design

### Module 6: Motion, Cognitive Load, and Media Alternatives (Week 6)

- **Motion preferences**
  - Reduce Motion and the difference between decorative animation and communicative transition
  - Crossfade fallbacks, transaction-level overrides, and keeping state change legible without movement
  - Avoid auto-playing motion and parallax that cannot be disabled
- **Cognitive accessibility**
  - Predictable navigation, consistent control placement, and avoiding surprise context changes
  - Error prevention: confirmation for destructive actions, undo over warnings, and generous timeouts
  - Plain-language copy, one idea per screen, and progress indicators that state where the user is
- **Data and chart accessibility**
  - Describing trends and outliers in text rather than restating every value
  - Accessible chart descriptors so assistive technologies can present a series as audio or summaries
  - Summaries for dense tables and long lists, plus skip-to-content affordances
- **Hands-on Lab**: Add a Reduce Motion path and an accessibility summary to an animated analytics screen, then write the descriptive copy for two charts in both supported languages

### Module 7: Custom Components and Advanced Gestures (Week 7)

- **Making drawn content accessible**
  - When to expose a canvas as a single element and when to project a hidden semantic overlay
  - `.accessibilityRepresentation` to substitute real controls for custom-drawn ones
  - Keeping the overlay in sync with visual state without duplicating source of truth
- **Gestures with accessible equivalents**
  - Drag, swipe, pinch, and long-press: always pairing each with a custom action or an Adjustable control
  - The `adjustableAction` contract for steppers, sliders, and scrubbers
  - Radar, gauge, and timeline widgets that stay usable without precise touch
- **Redundant feedback**
  - Combining haptics, sound, and announcement for confirmation without over-announcing
  - Debouncing announcements in rapidly updating surfaces such as live counters
  - Verifying that nothing important is conveyed only through haptics or sound
- **Hands-on Lab**: Convert a drag-to-reorder board and a custom scrubber into components that work with VoiceOver custom actions and Switch Control, then prove it with an assistive-input-only walkthrough

### Module 8: Automated Audits, Testing, and CI Gates (Week 8)

- **Platform audit APIs**
  - XCTest accessibility audits: contrast, dynamic type, element detection, hit region, and text clipping checks
  - Scoping audits to meaningful screens and filtering known-benign findings explicitly
  - Accessibility Inspector's audit versus in-test audits: what each catches and what both miss
- **Test coverage for semantic contracts**
  - Asserting identifiers, labels, traits, and values in UI tests so semantics cannot silently regress
  - Verifying focus movement and post-action announcements in automated tests
  - Snapshot tests that include accessibility size variants
- **Fail the build, not the release**
  - Wiring audits into the CI job and marking them as required checks
  - Triage rules: severity thresholds, waivers with expiry, and ownership of failures
  - Reporting results where engineers already look, with links to recordings and screenshots
- **Hands-on Lab**: Add an accessibility audit suite to the sample app's CI pipeline, make it fail on a deliberately introduced regression, then gate the merge on a green run

```bash
xcodebuild test \
  -scheme SampleApp \
  -destination 'platform=iOS Simulator,name=iPhone 16' \
  -only-testing:SampleAppUITests/AccessibilityAuditTests
```

### Module 9: Accessible Design Systems at Scale (Week 9)

- **Component contracts**
  - Every component publishes label, value, trait, and action behavior — documented next to its visual API
  - Designing the accessibility surface first: what the component must announce before how it looks
  - Guarding against components that accept a label but drop it internally
- **Tokens and constraints**
  - Type, spacing, and color tokens that cannot express an inaccessible combination
  - Lint and preview rules that fail on fixed heights, single-line limits, and color-only state
  - Accessibility fixtures and previews for large text, high contrast, and reduced motion
- **Governance that survives turnover**
  - A review checklist short enough to be used, plus a definition of done that names accessibility explicitly
  - Training, champions per team, and a shared backlog for cross-cutting fixes
  - Measuring progress: audited screens, open defects by severity, regression rate, median time to fix
- **Hands-on Lab**: Extract three accessible components from the app into a shared module with documented contracts, previews for edge configurations, and a lint rule that blocks the most common regression

### Module 10: Capstone — Accessibility Engineering for a Production App (Week 10)

- **Audit and scope**
  - Selecting the screens and flows that carry the most user value and the highest defect density
  - Choosing the standards to hold the release to and writing them down as testable criteria
- **Remediation in a real codebase**
  - Sequencing fixes by user impact rather than by ease, and batching systemic issues into component work
  - Handling legacy UIKit surfaces, third-party SDKs, and WebViews you do not fully control
  - Communicating trade-offs and product decisions to non-engineering stakeholders
- **Verification and handover**
  - Regression protection: which audits, which tests, which manual passes
  - Documentation and a maintenance plan with named owners and a review cadence
- **Hands-on Lab**: Present the capstone audit, the remediation record, the CI gates added, and the measured before/after state to a mock review board

## Final Project

Learners take a provided production-shaped iOS app with real accessibility debt — mixed SwiftUI and UIKit, a custom chart, a drag interaction, an onboarding flow, and a partially localized interface — and run a complete accessibility engineering cycle on it.

The deliverable has four parts. First, a measured baseline: an audit of at least eight screens and three end-to-end flows across VoiceOver, Voice Control, Switch Control, and the full Dynamic Type range, with findings classified by severity and root cause. Second, a remediation implementation: semantic tree corrections, adaptive layouts that survive accessibility text sizes, focus management for navigation and errors, color and motion preference support, and accessible equivalents for every custom gesture. Third, automation: an XCTest accessibility audit suite plus semantic contract tests wired into continuous integration as required checks. Fourth, a handover package: a component-level accessibility contract for the shared design system, a definition-of-done addendum, and a short written report showing which metrics moved.

Grading rewards root-cause fixes over screen-level patches — replacing a hardcoded height on a shared row component outranks tweaking twenty individual screens, and a lint rule that prevents a whole defect class scores higher than any single fix.

## Assessment Criteria

- **Weekly hands-on labs (30%)**: Each lab is graded on whether the stated assistive-technology path actually works end to end, whether the semantic tree is deliberate rather than accidental, and whether findings are recorded reproducibly with severity and evidence.
- **Mid-course accessibility audit (20%)**: A structured audit of five screens delivered at the end of Week 5, assessed on coverage across modalities, accuracy of severity classification, and the quality of the written remediation plan.
- **Capstone project (40%)**: Judged on measurable improvement from baseline, root-cause remediation of systemic issues, regression protection in CI, and clarity of the handover documentation. A capstone that fixes many screens but leaves the shared components broken is capped at a passing grade.
- **Code and review quality (10%)**: Semantic naming, absence of duplicated accessibility logic, localized labels, and review participation — including the quality of feedback given on peers' accessibility findings.

## References

- Apple Human Interface Guidelines — Accessibility: <https://developer.apple.com/design/human-interface-guidelines/accessibility>
- Apple Developer Accessibility documentation: <https://developer.apple.com/accessibility/>
- SwiftUI accessibility modifiers reference: <https://developer.apple.com/documentation/swiftui/view-accessibility>
- UIKit accessibility programming guide: <https://developer.apple.com/documentation/uikit/accessibility-for-uikit>
- Accessibility Inspector user guide: <https://developer.apple.com/documentation/accessibility/inspector>
- Writing accessibility audits with XCTest: <https://developer.apple.com/documentation/xctest/performing_accessibility_audits>
- Web Content Accessibility Guidelines (WCAG) 2.2: <https://www.w3.org/TR/WCAG22/>
- Web Accessibility Initiative — mobile accessibility guidance: <https://www.w3.org/WAI/standards-guidelines/mobile/>
