# EletricPanelHTML5

Interactive **GAME OVER** panel with Canvas 2D electric border effect — vanilla HTML5, no build step.

## Demo

Open `index.html` directly in a browser.

## Files

| File | Description |
|------|-------------|
| `index.html` | GAME OVER panel sandbox — presets, color swatches, layer toggles, advanced config panel |
| `electric-border.js` | Reusable `ElectricBorder` Canvas 2D library |

## ElectricBorder — Quick Start

```js
const eb = new ElectricBorder({ hue: 270, freq: 0.018, scale: 26 });

// inside animation loop:
eb.draw(ctx, panelX, panelY, panelW, panelH, t);
```

### Key params

| Param | Default | Description |
|-------|---------|-------------|
| `hue` | 270 | Color hue 0–360 (affects all electric layers) |
| `outerHue` | null | Static frame hue — null = follows `hue` |
| `freq` | 0.02 | Turbulence frequency (lower = wider waves) |
| `scale` | 50 | Displacement amplitude |
| `durDy/durDx` | 6s | Animation speed per axis |
| `pulseSpd` | 3.8 | Pulse oscillation speed |
