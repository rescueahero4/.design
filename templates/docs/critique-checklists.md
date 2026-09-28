# Critique checklists

Used by the three critique lenses. Ask each question against the mockup; a finding is only a
finding when the mockup gives evidence the case is unhandled.

## Edge cases (edge-case-agent)

Data
- Empty: zero items, first-time user, nothing matched.
- One: does the layout survive a single item / a single line?
- Many: 1,000 items — pagination, virtualisation, "load more"? Where does it say?
- Long: 200-char names, long emails, wrapped headings, RTL and CJK text, currency with 8 digits.
- Missing: optional fields absent — placeholder or gap?
- Stale: data changed since page loaded (price, availability, stock).
- Precision: prices, dates, times — timezone, rounding, locale format.

State
- Every interactive component: default / loading / error / success / disabled — which are drawn?
- Partial failure: 3 of 5 items failed to load.
- Optimistic UI: what does the user see between click and server response?
- Re-entry: coming back to a half-completed form.

Input
- Validation timing: on blur, on submit, live? What copy?
- Paste, autofill, IME composition, keyboard-only.
- Limits: min/max/length shown? What happens at the limit?
- Duplicate submit, double-tap, fast repeated actions.

Environment
- Viewport: 320px, 768px, 1440px, landscape phone. Touch targets ≥ 44px.
- Offline / slow network: what's cached, what's blocked?
- Permissions: `data-requires` — what does a user *without* it see? Hidden, disabled, or a prompt?
- Accessibility: focus order, contrast, screen-reader labels, motion.
- Locale: date/number formats, pluralisation, string expansion (+30% for German).

## Unhappy paths (unhappy-path-agent)

For each step of each flow:
- Abandon here — what's saved? What's lost? Is that stated?
- Back button — does it go where the user expects? Is any state duplicated or lost?
- Refresh — same page, same state?
- Deep link straight here — prerequisites missing; what happens?
- Session expired mid-step — where does the user land after re-auth?
- Wrong branch — user meant to do the other thing; is there a way back?
- Timeout — server slow; can the user retry without duplicating?
- Conflict — someone else changed the thing (stock sold out, slot taken).
- Error with no recovery — is there always a next action?
- Dead ends — pages with no forward or back affordance.
- Destructive actions — confirmation, undo, or neither?
- Success — what do they do next; is it shown?

## Feasibility (feasibility-agent)

- Fields rendered but absent from `data_model` → new backend work or a mistaken assumption?
- Fields in `data_model` never rendered → dead data or a missing screen?
- Implied computations: totals, availability windows, recommendations, search ranking — where do they run?
- Real-time: anything that must update without reload (stock, order status)? Push, poll, or nothing?
- Lists: bounded? sortable? filterable? — each is an API capability.
- Auth and roles: `data-requires` vs what the stack supports.
- Components: reuse from the design system named in constraints vs new build. Count the new ones.
- Performance: images, fonts, above-the-fold weight, 3G.
- Platform: PWA/native limits (camera, notifications, offline storage).
- Privacy/legal: PII shown or entered; consent; retention.
- Third parties implied: maps, payments, email, SMS.
- Migration: does this replace an existing screen? What about users mid-flow at rollout?
