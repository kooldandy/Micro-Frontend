# 04 — Style Isolation Matrix

## The Problem

When the host and one or more remotes are mounted on the same page, their
CSS all lands in the same global `<head>`. Without isolation, `.flex` or
`.text-sm` defined by one app's Tailwind build can (in principle) be
overridden by another's, or two apps' hand-written class names can collide.

## The Rules

| Style type | Mechanism | Example |
|---|---|---|
| Tailwind utilities | **Prefix per app**, configured in each app's `tailwind.config.js` | `auth-flex`, `profile-text-sm`, `product-border`, `host-bg-slate-50` |
| Structural / layout wrappers | **CSS Modules** (`*.module.css`) when a class needs to be guaranteed collision-free and isn't a simple utility composition | Not heavily used in this scaffold — utilities cover current needs; reach for a `.module.css` file the moment a component needs a bespoke, non-utility class |
| Variants with a prefixed app | Prefix comes **after** the variant, before the utility | `hover:host-bg-slate-100`, `disabled:auth-opacity-50` (Tailwind's rule, not this project's) |

## Per-App Prefix Table

| App | `tailwind.config.js` prefix |
|---|---|
| `apps/host` | `host-` |
| `apps/auth` | `auth-` |
| `apps/profile` | `profile-` |
| `apps/product` | `product-` |

Each app's Tailwind config also scopes `content` to its own `index.html` +
`src/**/*` — one app's build never scans another app's source, so unused
utility classes aren't even generated into the wrong bundle.

## Why Prefixing (Not Just Scoped CSS)

Tailwind's generated utility CSS is representative of the *same* utility
having the *same* declaration in every app (e.g. `.flex { display: flex }`
never differs). Prefixing isn't defending against different apps disagreeing
on what `.flex` means — it's defending against:

1. **Specificity/override accidents** — a future custom class named `.flex`
   or `.card` added by hand in one app that would otherwise collide with
   Tailwind's own utility of the same name from another app.
2. **Clarity of ownership** — seeing `product-card` vs `profile-card` in
   devtools immediately tells you which federated app rendered an element,
   which matters a lot once four apps' DOM is interleaved on one page.

## Limitation

Tailwind's `preflight` (base reset) is **not** namespaced by `prefix` — it's
a global reset applied once per app's compiled CSS, and if multiple apps'
compiled stylesheets are all injected into one page, `preflight` runs
multiple times (idempotently; this is safe, just redundant). This is an
accepted tradeoff for keeping each app's Tailwind config fully independent;
if this becomes a real problem at scale, disabling `preflight` in every
remote (`corePlugins: { preflight: false }`) and centralizing it in the host
is the documented next step.
