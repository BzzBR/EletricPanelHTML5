# ElectricBorder

Canvas 2D electric border effect — vanilla JS, zero dependencies, no build step.

**Demo:** open `index.html` directly in a browser.

---

## Files

| File | Description |
|------|-------------|
| `electric-border.js` | Reusable `ElectricBorder` class — drop into any project |
| `index.html` | Interactive demo with presets, color swatches, layer toggles and live config panel |

---

## Quick Start

### 1 — Copy the file

```html
<script src="electric-border.js"></script>
```

Or with a bundler (Vite, Webpack, Rollup):

```js
import ElectricBorder from './electric-border.js';
```

### 2 — Create an instance

```js
const eb = new ElectricBorder({
  hue:      270,   // violet
  spinSpd:  1.4,   // spinning arc
  scale:    26,    // displacement amplitude
});
```

### 3 — Draw inside your animation loop

```js
function loop(ts) {
  const t = ts / 1000;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  eb.draw(ctx, panelX, panelY, panelW, panelH, t);

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
```

### 4 — Or let the class manage the loop

```js
const eb = new ElectricBorder({ hue: 183, spinSpd: 1.4 });
eb.attach(canvas, panelX, panelY, panelW, panelH); // starts RAF internally

// later:
eb.detach();   // pause (keeps SVG and params)
eb.destroy();  // cancel loop + remove SVG from DOM
```

---

## API

### `new ElectricBorder(params?)`

All parameters are optional. See the full table below.

### `eb.draw(ctx, x, y, w, h, t, layers?)`

Draw the border. Call once per animation frame.

| Argument | Type | Description |
|----------|------|-------------|
| `ctx` | `CanvasRenderingContext2D` | Canvas 2D context |
| `x, y, w, h` | `number` | Panel position and size in pixels |
| `t` | `number` | Elapsed time in seconds (`performance.now() / 1000`) |
| `layers` | `object?` | Selectively hide layers: `{ outer, aura, electric, corners }` — omit to show all |

### `eb.drawBg(ctx, x, y, w, h, r?, fill?)`

Fill the panel background with a colored glow. Call **before** `draw()`.

### `eb.setParams(params)`

Update any subset of params at runtime (e.g. from a slider). Only changed values need to be passed.

```js
eb.setParams({ hue: 148, scale: 40 });
```

### `eb.attach(canvas, x, y, w, h)`

Start an internal RAF loop that draws the border automatically.

### `eb.detach()`

Pause the internal loop without removing the SVG filter or clearing params.

### `eb.destroy()`

Cancel the internal loop and remove the injected SVG filter from the DOM.

### `ElectricBorder.makePath(x, y, w, h, r)` *(static)*

Returns a `Path2D` rounded-rect. Useful for caching paths in your own render loop.

```js
const panelPath = ElectricBorder.makePath(px, py, pw, ph, 14);
ctx.stroke(panelPath); // reuse every frame
```

---

## Parameters

| Param | Default | Range | Description |
|-------|---------|-------|-------------|
| `hue` | `270` | 0–360 | Color hue — 0 red, 24 orange, 52 gold, 148 green, 183 cyan, 214 blue, 270 violet, 300 pink |
| `outerHue` | `null` | 0–360 | Static frame hue — `null` follows `hue` |
| `freq` | `0.02` | 0.005–0.12 | Turbulence frequency (lower = wider waves) |
| `octaves` | `10` | 1–12 | Turbulence detail level (higher = more organic, heavier) |
| `scale` | `50` | 2–80 | Displacement amplitude (peak intensity of electric effect) |
| `durDy` | `6` | 1–20 | Vertical noise animation duration (seconds) |
| `durDx` | `6` | 1–20 | Horizontal noise animation duration (seconds) |
| `outerR` | `14` | — | Corner radius of the static outer frame |
| `innerR` | `14` | — | Corner radius of the electric inner border |
| `innerInset` | `0` | — | Inset (px) of electric border relative to outer frame |
| `auraBlur` | `14` | 0–30 | Shadow blur of the soft halo layer |
| `auraW` | `4` | 0–10 | Line width of the halo |
| `coronaW` | `3.5` | 0–8 | Line width of the corona (with SVG filter) |
| `arcW` | `1.0` | 0–3 | Line width of the main arc |
| `coreW` | `0.4` | 0–1.5 | Line width of the white core |
| `pulseSpd` | `3.8` | 0–10 | Brightness pulse speed (rad/s). `0` = constant intensity |
| `spinSpd` | `0` | 0–4 | Electric spin arc speed (rad/s). `0` = off |
| `spinHue` | `null` | 0–360 | Spin arc hue — `null` follows `hue` |
| `spinTail` | `0.40` | 0.05–0.95 | Spin arc tail length (fraction of perimeter) |
| `spinFrmSpd` | `0` | 0–4 | Frame spin arc speed (rad/s). `0` = off |
| `spinFrmHue` | `null` | 0–360 | Frame spin arc hue — `null` follows `outerHue` |
| `spinFrmTail` | `0.40` | 0.05–0.95 | Frame spin arc tail length (fraction of perimeter) |
| `animNoise` | `false` | — | `false` = one-way linear noise (default), `true` = oscillating spline (back-and-forth pulse) |

---

## Layer Toggles

Pass a `layers` object to `draw()` to show/hide individual layers:

```js
eb.draw(ctx, x, y, w, h, t, {
  outer:    true,  // static outer frame
  aura:     true,  // soft halo (no SVG filter)
  electric: true,  // corona + arc + core (SVG displacement)
  corners:  true,  // diagonal corner glint overlay
});
```

---

## Presets

Copy-paste ready configs:

```js
// Suave
new ElectricBorder({ freq: 0.015, octaves: 8, scale: 20, durDy: 12, durDx: 12,
  auraBlur: 6, auraW: 2.0, coronaW: 1.6, arcW: 0.5, coreW: 0.18, pulseSpd: 1.5 })

// Padrão
new ElectricBorder({ freq: 0.018, octaves: 8, scale: 26, durDy: 12, durDx: 12,
  auraBlur: 12, auraW: 3.2, coronaW: 2.6, arcW: 0.8, coreW: 0.30, pulseSpd: 2.2 })

// Intenso
new ElectricBorder({ freq: 0.028, octaves: 10, scale: 50, durDy: 7, durDx: 7,
  auraBlur: 18, auraW: 5.0, coronaW: 4.0, arcW: 1.4, coreW: 0.55, pulseSpd: 4.0 })
```

---

## Browser Compatibility

| Browser | Minimum |
|---------|---------|
| Chrome  | 52+     |
| Firefox | 49+     |
| Edge    | 79+     |
| Safari  | 18+     |

> `ctx.filter` with `url(#id)` requires the SVG to be in the same document. The class injects it automatically into `document.body`.

---

## Credits

SVG filter pipeline technique from **Bálint Ferenczy** — [CodePen KwdoyEN](https://codepen.io/BalintFerenczy/pen/KwdoyEN)  
Multi-layer glow structure and corner overlay from **hammadxcm** — [electric-border-css](https://github.com/hammadxcm/electric-border-css) (MIT © Fyniti)
