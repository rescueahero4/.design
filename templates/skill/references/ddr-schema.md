# DDR — Design Decision Record

One json file per iteration in `.design/decisions/ddr-NNNN.json`. Written by `dm iterate`,
amended by `dm ddr confirm` / `dm ddr edit`. Read later by the viewer, the critique agents,
and the PRD / solution-architecture generators.

## Fields

| Field | Type | Meaning |
|---|---|---|
| `id` | `ddr-0012` | Global, sequential. Never reused. |
| `ts` | ISO 8601 with offset | When the iteration was recorded. |
| `exploration` | kebab-case | Which concept lineage this belongs to. |
| `iteration` | int | Version number within the exploration (`v03` → 3). |
| `parent` | int \| null | Iteration this was built from. Not always `iteration - 1` — after `back`/`goto`, lineages branch. |
| `commit` | short sha | Commit in the shadow repo. Tag is `<exploration>/vNN`. |
| `type` | `new-exploration` \| `iteration` \| `fix` \| `revert` \| `fork` | What kind of step. `fix` = no design intent. |
| `trigger` | `designer` \| `edge-case-agent` \| `unhappy-path-agent` \| `feasibility-agent` | Who asked for the change. Agents write their own trigger so their influence is traceable. |
| `scope.page` | string \| null | Page/screen affected (matches `data-flow` or file name). |
| `scope.components` | string[] | `data-component` names touched. |
| `scope.files` | string[] | Files in the commit (auto). |
| `change` | one line | What changed. Past tense, concrete, no rationale here. |
| `rationale` | string \| null | Why. Only what the designer said or clearly implied. Null is allowed. |
| `rejected` | `[{option, why}]` | Alternatives considered and dropped. `why` may be null. |
| `tacit_tags` | string[] | 1–3 tags naming the design concern behind the change. Vocabulary accumulates in `config.json` → `tacit_tags`. |
| `confidence` | `confirmed` \| `inferred` | `confirmed` = designer stated the rationale. `inferred` = agent guessed or rationale missing. Only `confirmed` DDRs become "decided" requirements downstream. |
| `status` | `active` \| `parked` \| `reverted` | Lifecycle. `parked` = deliberately shelved, keep for later. |
| `source_prompt` | string \| null | Designer's message verbatim. Best raw evidence of intent. |
| `confirmed_at` | ISO 8601 | Set by `dm ddr confirm`. |
| `reverted_to` | int | On `type: revert`, which iteration was restored. |
| `forked_from` | `{exploration, iteration, commit}` | On `type: fork`, the origin. |

## Rationale: good vs bad

The rationale is the tacit knowledge. It must be the designer's reasoning, not a
justification the agent composed after the fact.

| User prompt | Good rationale | Bad rationale |
|---|---|---|
| "move the button up, people keep missing it" | "Users were missing the CTA below the fold" (`confirmed`) | "Improves conversion and visual hierarchy per best practice" — invented |
| "try the summary as a side panel" | `null` (`inferred`) — no why was given | "Side panels are more scannable" — invented |
| "no, the modal feels heavy for a one-field form" | "Modal was too heavy for a single-field input" + rejected `{option: "modal", why: "too heavy for one field"}` | — |
| "fix the broken link on step 2" | "Broken href" (`type: fix`) | — |

## Tacit tags — starter vocabulary

Use these before inventing new ones; add new ones freely when none fit.

`hierarchy` `discoverability` `mobile-viewport` `touch-target` `cognitive-load`
`progressive-disclosure` `error-recovery` `empty-state` `trust` `brand-voice`
`consistency` `accessibility` `performance-perception` `reversibility` `feasibility`

## Example

```json
{
  "id": "ddr-0012",
  "ts": "2026-09-28T10:42:00+09:00",
  "exploration": "checkout-flow",
  "iteration": 3,
  "parent": 2,
  "commit": "a1b2c3d",
  "type": "iteration",
  "trigger": "designer",
  "scope": { "page": "checkout", "components": ["CartSummary", "PrimaryCTA"], "files": ["checkout.html", "styles.css"] },
  "change": "Moved primary CTA above the order summary",
  "rationale": "Mobile users scrolled past the summary before finding checkout",
  "rejected": [{ "option": "Sticky bottom CTA", "why": "Conflicts with iOS Safari toolbar" }],
  "tacit_tags": ["mobile-viewport", "hierarchy"],
  "confidence": "confirmed",
  "status": "active",
  "source_prompt": "move the checkout button up, people keep missing it"
}
```

## Writing a DDR via file

For iterations with several rejected options or components, write the json to a temp file
and run `dm iterate --ddr-file /tmp/ddr.json`. Flags override file values. `id`, `ts`,
`iteration`, `parent`, `commit`, `scope.files`, `status` are always set by `dm`.
