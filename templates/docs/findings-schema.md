# Findings schema

Stored in `.design/findings.json`, appended by `dm findings add --file <json>`.
Agents output a json array of objects with the fields marked *agent*. `dm` fills the rest.

| Field | Who | Meaning |
|---|---|---|
| `id` | dm | `f-0001`, sequential |
| `ts` | dm | when added |
| `exploration`, `iteration` | dm (or agent to override) | version the finding was raised against |
| `agent` | agent | `edge-case-agent` \| `unhappy-path-agent` \| `feasibility-agent` \| `manual` |
| `severity` | agent | `high` (stuck / data loss / can't build) · `medium` (PRD must answer) · `low` (polish, a11y, eng will ask) |
| `page` | agent | file name, e.g. `cart.html` |
| `component` | agent | `data-component` name, or null |
| `state` | agent | `data-state` the finding concerns, or null |
| `finding` | agent | one or two sentences, what the mockup shows and what's missing |
| `suggestion` | agent | one sentence, or a question if it's a business rule; may be null |
| `status` | dm | `open` \| `resolved` |
| `resolved_at`, `resolved_by` | dm | set by `dm findings resolve <id> --ddr <ddr-id>` |

Example agent output:

```json
[
  {
    "agent": "unhappy-path-agent",
    "severity": "high",
    "page": "cart.html",
    "component": "PrimaryCTA",
    "state": "default",
    "finding": "Checkout requires auth (data-requires) but the cart is client-side; after login the user lands on index.html with an empty cart.",
    "suggestion": "Should the cart persist across login, and should login return to cart.html?"
  }
]
```
