# EletricPanelHTML5

Interactive **GAME OVER** panel with Canvas 2D electric border effect — vanilla HTML5, no build step.

## Demo

Open `index.html` directly in a browser.

## Files

| File | Description |
|------|-------------|
| `index.html` | GAME OVER panel sandbox — presets, color swatches, layer toggles, advanced config panel |
| `electric-border.js` | Reusable `ElectricBorder` Canvas 2D library |

## References & Credits

The `ElectricBorder` library was developed by combining techniques from two open-source references:

### SVG Filter + Canvas 2D — Bálint Ferenczy
**CodePen:** https://codepen.io/BalintFerenczy/pen/KwdoyEN  
**GitHub:** https://github.com/BalintFerenczy *(perfil público, sem repositórios — código disponível apenas no CodePen)*  
**X / Twitter:** https://x.com/BalintFerenczy

- SVG filter pipeline: `feTurbulence` → `feOffset` → `feComposite` → `feBlend(color-dodge)` → `feDisplacementMap`
- Applied via `ctx.filter = "url(#id)"` on Canvas 2D strokes
- **One-way linear** `feOffset` animation (`values="700;0"`, `calcMode="linear"`) — continuous scroll without oscillation
- This is the **"Pulse OFF"** mode (default): border animates continuously with no back-and-forth

### Electric Glow Style — hammadxcm / electric-border-css
**GitHub:** https://github.com/hammadxcm/electric-border-css  
**License:** MIT © [Fyniti](https://fyniti.co.uk/)

- Multi-layer glow structure (aura, corona, arc, core)
- Corner glint overlays (diagonal linear gradient + `mix-blend-mode: overlay`)
- Background ambient bloom (radial gradient + blur)
- **Oscillating** `feOffset` animation (`values="700;0;700"`, `calcMode="spline"` with ease keySplines) — creates the back-and-forth "pulse" effect
- This is the **"Pulse ON"** mode: noise field oscillates, giving the border a breathing/pulsing look

### Animation behaviour comparison

| Mode | Source | `feOffset values` | `calcMode` | Visual |
|------|--------|-------------------|------------|--------|
| Pulse OFF (default) | BalintFerenczy | `700;0` | `linear` | One-way scroll, no oscillation |
| Pulse ON | hammadxcm | `700;0;700` | `spline` | Smooth back-and-forth oscillation |

## ElectricBorder — Quick Start

```js
const eb = new ElectricBorder({ hue: 270, freq: 0.018, scale: 26 });

// inside animation loop:
eb.draw(ctx, panelX, panelY, panelW, panelH, t);
```

### All params

| Param | Default | Description |
|-------|---------|-------------|
| `hue` | 270 | Color hue 0–360 (affects all electric layers) |
| `outerHue` | null | Static frame hue — null = follows `hue` |
| `freq` | 0.02 | Turbulence frequency (lower = wider waves) |
| `octaves` | 10 | Turbulence detail level |
| `scale` | 50 | Displacement amplitude |
| `durDy` / `durDx` | 6 | Animation duration per axis (seconds) |
| `outerR` / `innerR` | 14 | Corner radius (outer/inner border) |
| `innerInset` | 0 | Inset px of electric border vs outer frame |
| `auraBlur` | 14 | Shadow blur for halo layer |
| `auraW` | 4 | Line width of halo |
| `coronaW` | 3.5 | Line width of corona (with SVG filter) |
| `arcW` | 1.0 | Line width of main arc |
| `coreW` | 0.4 | Line width of white core |
| `pulseSpd` | 3.8 | Brightness pulse speed (rad/s). 0 = constant |
| `spinSpd` | 0 | Electric spin arc speed (rad/s). 0 = off |
| `spinHue` | null | Spin arc hue — null = follows `hue` |
| `spinTail` | 0.40 | Spin arc tail length (0–1 of perimeter) |
| `spinFrmSpd` | 0 | Frame spin arc speed (rad/s). 0 = off |
| `spinFrmHue` | null | Frame spin arc hue — null = follows outer hue |
| `spinFrmTail` | 0.40 | Frame spin arc tail length (0–1) |
| `spinFlt` | true | Apply SVG displacement filter to spin arc |
| `animNoise` | false | **Pulse ON/OFF** — false = BalintFerenczy one-way linear, true = hammadxcm oscillating spline |
