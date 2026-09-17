# UI Polish, Theming and Mobile Navigation — Design

**Date:** 2026-09-18
**Status:** Approved

## Problem

The app works but was built without a visual pass. Styling is hand-written on
every screen, there is no dark mode, and on a phone the navigation is a
horizontally scrolling strip that is easy to miss and awkward to use.

## Scope

In scope: a shared UI component layer, semantic design tokens, light and dark
themes with light as the default, a hamburger drawer for small screens, and a
density pass across all ten screens.

Out of scope: restructuring any screen's information architecture, new features,
charts, animation beyond the drawer transition, and a per-user stored theme
preference in the database.

## Visual direction

**Dense data tool.** Compact rows, tabular figures, tight leading. The app is
used at speed by someone entering roughly 70 rows a day, and density means less
scrolling and more context per screen.

**Neutral grey with a blue accent.** Greys carry the interface; blue is reserved
for links and primary actions. Nothing competes with the numbers.

### Density and touch targets

Density conflicts with touch. Compact rows are right on a desktop, but a 26px
control on a phone invites mis-taps — and a mis-tap here selects the wrong
company, which bills the wrong client and pays the wrong amount on a real
payslip.

The resolution is a breakpoint, not a compromise:

- **Below `sm`** — interactive controls have a minimum height of 36px, rising to
  44px for primary actions. Roughly six workers are visible per screen.
- **`sm` and above** — rows tighten to full spreadsheet density, because a
  pointer makes precision free.

## Theming

### Light is the default

Light is used unless the user has explicitly chosen dark. The device's
`prefers-color-scheme` is deliberately ignored: the requirement is a light
default regardless of system setting. Tailwind is therefore configured for
class-based dark mode rather than media-query dark mode.

### The theme lives in a cookie, not localStorage

Every page in this app is `force-dynamic` and server-rendered.

Storing the theme in `localStorage` and applying it with JavaScript after
hydration would paint the light theme first and correct it a moment later — a
visible white flash on every navigation, not just the first load.

The theme is stored in a cookie so the server can read it during render and put
`class="dark"` on `<html>` in the initial HTML. There is no flash and no
client/server mismatch to reconcile. The toggle writes the cookie and refreshes
the route.

The cookie is not `httpOnly`: it carries no security meaning and the client
needs to write it. It is `SameSite=Lax` with a one-year lifetime.

### Tokens, not scattered variants

Semantic CSS custom properties are declared once in `globals.css`, with a light
set on `:root` and a dark set under `.dark`:

| Token | Meaning |
|---|---|
| `--surface` | Page background |
| `--surface-raised` | Cards, table headers, the nav bar |
| `--border` | Dividers and control outlines |
| `--text` | Primary text |
| `--text-muted` | Secondary text and labels |
| `--accent` | Links and primary actions |
| `--accent-fg` | Text on an accent background |
| `--danger` | Error text |

Components reference tokens. Scattering `dark:` variants across ten screens is
what makes themes drift; changing a colour should mean editing one file.

## Shared UI layer

Every screen currently hand-writes strings like `rounded border px-3 py-2`.
Duplicated styling is the reason interfaces fall out of sync as they grow.

`components/ui/` gains small, focused components that own the tokens and the
density rules: `Button`, `Input`, `Select`, `Card`, `PageHeader`, and `Table`
(a wrapper providing the horizontal scroll container). Screens compose them.

## Mobile navigation

Below `sm`, the nav collapses to a hamburger button opening a slide-in drawer
containing the links stacked vertically, the signed-in user's name, the theme
toggle, and log out.

The drawer closes on link tap, backdrop tap, and Escape. Focus moves into the
drawer when it opens and returns to the button when it closes. Background scroll
is locked while it is open.

At `sm` and above the existing horizontal bar remains, with the theme toggle
inline.

## Error handling

- A missing or unrecognised theme cookie resolves to light rather than throwing.
  Any garbage value is treated as absent.
- The drawer is rendered but hidden at `sm` and above, so a resize while open
  cannot leave the page scroll-locked with no visible close control.

## Testing

Theme resolution is a pure function — cookie value in, `'light' | 'dark'` out —
and is unit tested, including missing, empty, and unrecognised values.

The drawer and the visual result are verified by hand at 375px in both themes.
Asserting on Tailwind class strings would test the stylesheet rather than any
behaviour, and would break on every cosmetic change.

## Open questions

None blocking.
