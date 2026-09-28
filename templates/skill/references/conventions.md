# Mockup conventions

Mockups are plain HTML + CSS + JS. Two jobs: (1) mock the overall UX, (2) act as the source of
truth for the PRD and solution architecture. The conventions below make job (2) possible —
they let later scripts extract pages, components, states, flows and data mechanically instead
of guessing from screenshots.

## File layout

```
.design/mockups/         # mockups_dir (single source of truth, versioned by dm)
  index.html             # entry / navigation between pages
  <page>.html            # one file per screen
  styles.css             # shared styles (page-specific CSS may live in <page>.css)
  mock-data.js           # ALL fake data. Nothing else may hardcode data.
  app.js                 # interaction glue only (toggles, navigation, state switches)
  assets/                # images, icons
```

Never create `page-v2.html`, `page-old.html`, `page-copy.html`. Versions are `dm`'s job.

## Semantic tagging

| Attribute | On | Value | Why |
|---|---|---|---|
| `data-flow` | `<body>` or a wrapper | flow name (`checkout`, `onboarding`) | Groups pages into user journeys for the PRD. |
| `data-component` | any element that is a reusable UI piece | PascalCase (`CartSummary`) | Component inventory for the solution architecture; DDR `scope.components` must match these. |
| `data-state` | a component or page | `default` \| `empty` \| `loading` \| `error` \| `success` \| `disabled` \| custom | Critique agents flag components missing `empty`/`error`/`loading`. |
| `data-requires` | element | `auth` \| `role:<name>` \| `feature:<flag>` | Permission and gating edge cases. |
| `data-nav` | links/buttons that move between pages | target page or `back` | Navigation graph; unhappy-path agent finds dead ends. |

Example:

```html
<body data-flow="checkout">
  <section data-component="CartSummary" data-state="default">…</section>
  <section data-component="CartSummary" data-state="empty" hidden>…</section>
  <button data-component="PrimaryCTA" data-nav="payment">Continue to payment</button>
</body>
```

Show state variants inline with `hidden` (toggled by `app.js`) or as sibling files
(`checkout.empty.html`). Either is fine; inline is preferred for small variants.

## Mock data

`mock-data.js` exposes one object, `window.MOCK`, shaped like the real data would be:

```js
window.MOCK = {
  cart: { items: [{ sku: "A1", name: "…", qty: 2, price: 1200 }], currency: "JPY" },
  user: { id: "u_1", role: "member", verified: false }
};
```

Field names matter: the solution-architecture generator reads them as the implied data model.
Keep them honest (snake_case vs camelCase as the eng stack prefers — see
`.design/context/tech-constraints.md`).

## JS discipline

`app.js` may toggle states, navigate, and render `MOCK` into the DOM. It must not contain real
business logic (validation rules, pricing, auth). If a rule matters to the design, write it as
a comment or in the DDR rationale — that's a requirement, not code.

## Accessibility baseline

Use real `<button>`, `<a href>`, `<label for>`, headings in order, `alt` on images. Cheap now;
the accessibility critique will flag it anyway, and it makes the DOM extraction reliable.
