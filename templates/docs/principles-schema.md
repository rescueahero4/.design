# design-principles.md — format

Lives at `.design/context/design-principles.md`. Written by Claude via the design-principles
skill, edited freely by the designer. Loaded every session via CLAUDE.md. Parsed by
`dm principles --check` and the viewer, so keep the field lines exact.

```markdown
# Design principles

_Last distilled 2026-10-14 from 23 confirmed decisions. Hand-edits are kept; see design-principles skill._

## P1 — Primary action above the fold on mobile
- Statement: On phone-width layouts the primary CTA is visible without scrolling, even if it means demoting summary content.
- Evidence: ddr-0004, ddr-0011, ddr-0019
- Exceptions: ddr-0030 (legal copy must precede the CTA on the consent screen)
- Tags: discoverability, mobile-viewport, hierarchy
- Kind: personal
- Since: 2026-09-28

## P2 — Inline over modal for single-field input
- Statement: A single field never opens a modal; edit in place with immediate validation. Modals are reserved for multi-step or destructive confirmations.
- Evidence: ddr-0007, ddr-0015
- Exceptions:
- Tags: cognitive-load, progressive-disclosure
- Kind: personal
- Since: 2026-10-02

## P3 — No sticky bottom bars [retired]
- Statement: Sticky bottom bars were avoided because of the iOS Safari toolbar overlap.
- Evidence: ddr-0004
- Exceptions: ddr-0021 (safe-area insets adopted; constraint no longer applies)
- Tags: mobile-viewport
- Kind: project
- Since: 2026-09-28
- Note: retired 2026-10-14 — superseded by ddr-0021.
```

Rules
- Heading: `## P<n> — <title>`; `[retired]` suffix keeps it visible but inactive.
- `Evidence` and `Exceptions` are comma-separated DDR ids; text in parentheses after an id is the reason.
- `Tags` reuse the DDR `tacit_tags` vocabulary so the check can match decisions to principles.
- `Kind`: `personal` (the designer's taste, portable across projects) or `project` (driven by a stated constraint).
- Numbers are never reused; order is by creation, not importance.
- Anything outside the field lines (a `- Note:` line, prose under the heading) is free text and preserved.
