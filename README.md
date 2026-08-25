# personal_website

Static personal site. No build step, no dependencies — three files do the work.

```
index.html      all the content lives here
css/style.css   design tokens at the top, sections below
js/theme.js     dark/light toggle, remembers the choice
js/motion.js    sticky header, reading progress, reveal-on-scroll, nav highlight
js/github.js    contribution heat map and repo cards, from the public GitHub API
assets/         résumé PDF, images, favicon
```

`js/motion.js` is pure decoration — delete it and the page still reads fine.
It also stands down entirely when the visitor has "reduce motion" turned on.

## Animation

| Effect | Lives in |
| --- | --- |
| Headline lines slide up out of a mask | `.line` / `.reveal.as-line` |
| Fade-up reveal on scroll, staggered via `--d` | `.reveal` + `motion.js` |
| Tags pop in behind their project | `.project.is-visible .tag` |
| Section hairline draws itself in | `.section-title::after` |
| Cursor spotlight on project rows | `--mx`/`--my` + `motion.js` |
| Hero glow drift + scroll parallax | `@keyframes drift`, `--par` |
| Circular theme wipe from the toggle | `::view-transition-new(root)` + `theme.js` |
| Shine sweep across the solid button | `.btn:not(.ghost)::after` |
| Reading progress bar | `.progress` + `motion.js` |
| Heatmap squares sweep in by column | `.gh-graph.gh-lit rect` + `github.js` |
| Contribution total counts up | `.gh-count` + `github.js` |
| Repo cards stagger in | `.gh-lit-repos .gh-repo` |
| Themed heatmap tooltip | `.gh-tip` + `github.js` |
| Hero recedes as you scroll past | `--out` on `.hero` + `motion.js` |
| Buttons pull toward the cursor | `--mx`/`--my` on `.btn` + `motion.js` |

To tone it down, delete `js/motion.js` and the `.reveal` classes. To turn off
one effect, remove its rule — none of them depend on each other.

The theme wipe uses the View Transitions API and falls back to an instant swap
where it isn't supported. The cursor spotlight is skipped on touch devices.

## Run it locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000. Any static server works; opening `index.html`
directly via `file://` also works, since nothing is fetched at runtime.

## Filling it in

Every placeholder is marked with a `TODO` comment in `index.html`. In order of
what matters most:

1. **The lede** (hero) — one specific sentence about what you do. This is the
   line that decides whether anyone scrolls.
2. **Projects** — each one is Problem → Built → Outcome. Keep them to a
   sentence each and put a number in the outcome if you have one. Duplicate an
   `<li class="project">` block to add another; three to six total is right.
3. **Links** — GitHub, LinkedIn, résumé. Replace the `href="#"` placeholders.
4. **About** — write it the way you'd say it out loud.

## Changing the look

Colors, fonts, and widths are CSS custom properties at the top of
`css/style.css`. Change `--accent` to re-tint the whole site. Both the light
and dark palettes are defined there, and dark is set in two blocks (system
preference and the explicit toggle) — edit both.

The display font is Instrument Serif from Google Fonts, linked in
`index.html`. Swap or drop that `<link>` and update `--font-display`.

Other knobs, all in the token blocks:

- `--glow` — the accent bloom behind the headline. Set to `transparent` to kill it.
- `--grain` — film-grain opacity. `0` turns it off.
- `--shadow`, `--ease` — button lift and the shared easing curve.

The "Available for new work" pill in the hero is a `<p class="status">`.
Delete it when it stops being true.

## Deploying

**GitHub Pages** — push to GitHub, then Settings → Pages → deploy from branch
`main`, folder `/ (root)`.

**Netlify or Vercel** — import the repo. No build command; publish directory is
the repo root.

Once it's live, set `og:url` and `og:image` in the `<head>` so shared links get
a proper preview card, and drop a `favicon.ico` or `favicon.png` in the root.
