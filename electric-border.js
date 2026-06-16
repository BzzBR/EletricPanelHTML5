/**
 * ElectricBorder — Canvas 2D electric border effect
 *
 * Tecnica: SVG feTurbulence + feDisplacementMap aplicado via ctx.filter.
 * O filtro SVG e injetado automaticamente no DOM ao instanciar a classe.
 * Referencias: Hank-D-Tank/electric-border, shrn946/electric-border-widget.
 *
 * ── Uso basico ───────────────────────────────────────────────────────────────
 *
 *   const eb = new ElectricBorder();
 *   const eb = new ElectricBorder({ scale: 30, arcW: 1.5 });
 *
 *   // dentro do loop de animacao:
 *   const t = performance.now() / 1000;
 *   eb.draw(ctx, panelX, panelY, panelW, panelH, t);
 *
 *   // update on the fly (ex: slider):
 *   eb.setParams({ freq: 0.03, scale: 40 });
 *
 *   // cleanup ao destruir o painel:
 *   eb.destroy();
 *
 * ── Parametros (todos opcionais, com defaults) ───────────────────────────────
 *
 *   COR
 *   hue        {number}  270    Tom da cor em graus HSL (0-360).
 *                               0=vermelho, 24=laranja, 52=dourado, 148=verde,
 *                               183=ciano, 214=azul, 270=violeta, 300=rosa.
 *                               Afeta todas as camadas de stroke simultaneamente.
 *
 *   SVG FILTER
 *   freq       {number}  0.02   feTurbulence baseFrequency.
 *                               Menor = ondas mais largas e fluidas.
 *                               Range util: 0.005 – 0.12
 *
 *   octaves    {number}  10     feTurbulence numOctaves.
 *                               Maior = mais detalhe fractal, mais organico.
 *                               Range util: 1 – 12  (>8 = pesado mas bonito)
 *
 *   scale      {number}  50     feDisplacementMap scale.
 *                               Amplitude dos picos do efeito eletrico.
 *                               Range util: 2 – 80
 *
 *   durDy      {number}  6      Duracao da animacao de ruido vertical (s).
 *   durDx      {number}  6      Duracao da animacao de ruido horizontal (s).
 *                               Valores diferentes = movimento assimetrico.
 *
 *   CANVAS (camadas de stroke)
 *   outerR     {number}  14     Raio dos cantos da borda externa (estatica).
 *   innerInset {number}  10     Recuo em px da borda interna em relacao externa.
 *   innerR     {number}  10     Raio dos cantos da borda interna (eletrica).
 *
 *   auraBlur   {number}  14     shadowBlur do halo suave (Camada 1, sem filtro).
 *   auraW      {number}  4      lineWidth do halo.
 *   coronaW    {number}  3.5    lineWidth da corona (Camada 2, com filtro SVG).
 *   arcW       {number}  1.0    lineWidth do arco principal (Camada 3).
 *   coreW      {number}  0.4    lineWidth do nucleo branco (Camada 4).
 *   pulseSpd   {number}  3.8    Velocidade do pulso de intensidade (rad/s).
 *                               0 = sem pulso (intensidade constante).
 *
 * ── Arquitetura das camadas ───────────────────────────────────────────────────
 *
 *   1. Borda externa   – rRect estatico, neon roxo sutil (sem filtro)
 *   2. Aura            – stroke suave + shadowBlur, sem filtro SVG
 *   3. Corona          – stroke espesso, com ctx.filter SVG (displacement)
 *   4. Arco principal  – stroke fino, com ctx.filter SVG
 *   5. Nucleo          – stroke finissimo branco, com ctx.filter SVG
 *
 * ── Compatibilidade ──────────────────────────────────────────────────────────
 *
 *   Browser: Chrome 52+, Firefox 49+, Edge 79+, Safari 18+
 *   ctx.filter com url(#svg-id) requer que o SVG esteja no mesmo documento.
 *   CommonJS: if (typeof module !== 'undefined') module.exports = ElectricBorder;
 */
'use strict';

class ElectricBorder {

  static defaults = {
    hue:        270,    // tom da cor em graus HSL (0=vermelho, 270=violeta, 300=rosa...)
    outerHue:   null,   // hue da borda externa estática (null = mesmo que hue)
    freq:       0.02,   // feTurbulence baseFrequency (menor = ondas mais largas)
    octaves:    10,     // feTurbulence numOctaves (maior = mais detalhe/organico)
    scale:      50,     // feDisplacementMap scale (amplitude dos picos)
    durDy:      6,      // duracao da animacao vertical (segundos)
    durDx:      6,      // duracao da animacao horizontal (segundos)
    outerR:     14,     // raio dos cantos da borda externa
    innerInset: 0,      // recuo (px) da borda eletrica em relacao a externa (0 = sobrepostas)
    innerR:     14,     // raio dos cantos da borda eletrica (deve = outerR quando innerInset=0)
    auraBlur:   14,     // shadowBlur do halo (Camada 1, sem filtro)
    auraW:      4,      // lineWidth do halo
    coronaW:    3.5,    // lineWidth da corona (Camada 2, com filtro)
    arcW:       1.0,    // lineWidth do arco principal (Camada 3)
    coreW:      0.4,    // lineWidth do nucleo brilhante (Camada 4)
    pulseSpd:   3.8,    // velocidade do pulso de intensidade (rad/s)
  };

  /**
   * @param {Partial<typeof ElectricBorder.defaults>} params
   */
  constructor(params = {}) {
    // ID unico para o filtro SVG (permite multiplas instancias na mesma pagina)
    this._id = 'eb-' + Math.random().toString(36).slice(2, 8);
    this.p   = { ...ElectricBorder.defaults, ...params };
    this._injectSVG();
  }

  /** Atualiza qualquer subconjunto dos parametros e re-aplica o filtro. */
  setParams(params) {
    Object.assign(this.p, params);
    this._applyFilter();
  }

  /**
   * Desenha a borda eletrica. Chamar uma vez por frame de animacao.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} px  x do painel
   * @param {number} py  y do painel
   * @param {number} pw  largura do painel
   * @param {number} ph  altura do painel
   * @param {number} t   tempo em segundos (performance.now()/1000)
   * @param {{ outer?: boolean, aura?: boolean, electric?: boolean }} [layers]
   *   Permite ocultar camadas individuais (omitir = todas visiveis).
   */
  draw(ctx, px, py, pw, ph, t, layers = {}) {
    const p = this.p;
    const showOuter = layers.outer    !== false;
    const showAura  = layers.aura     !== false;
    const showElec  = layers.electric !== false;
    if (!showOuter && !showAura && !showElec) return;

    const h  = p.hue;
    const oh = (p.outerHue != null) ? p.outerHue : h;
    ctx.save();

    const ip = p.innerInset, r = p.innerR;
    const ix = px+ip, iy = py+ip, iw = pw-ip*2, ih = ph-ip*2;
    const pulse = 0.72 + 0.28 * Math.sin(t * p.pulseSpd);
    const flare = Math.sin(t * 7.1) * Math.sin(t * 11.9) > 0.85 ? 1.55 : 1.0;
    const I = pulse * flare;

    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // ── Borda externa: estatica, neon sutil ───────────────────────────────────
    if (showOuter) {
      ctx.filter      = 'none';
      ctx.strokeStyle = `hsla(${oh},55%,60%,0.45)`;
      ctx.shadowColor = `hsla(${oh},60%,55%,1)`;
      ctx.shadowBlur  = 8;
      ctx.lineWidth   = 1;
      this._rRect(ctx, px + 0.5, py + 0.5, pw - 1, ph - 1, p.outerR);
      ctx.stroke();
    }

    // ── Camada 1: aura suave (sem filtro SVG, apenas shadowBlur) ─────────────
    if (showAura) {
      ctx.filter      = 'none';
      ctx.strokeStyle = `hsla(${h},62%,60%,${(0.08*I).toFixed(3)})`;
      ctx.shadowColor = `hsla(${h},65%,60%,1)`;
      ctx.shadowBlur  = p.auraBlur * I;
      ctx.lineWidth   = p.auraW;
      this._rRect(ctx, ix, iy, iw, ih, r);
      ctx.stroke();
    }

    // ── Camadas 2-4: borda eletrica com filtro SVG ────────────────────────────
    if (showElec) {
      ctx.filter     = `url(#${this._id})`;
      ctx.shadowBlur = 0;

      // Corona (semi-transparente, cobre a area de glow)
      ctx.strokeStyle = `hsla(${h},62%,63%,${(0.14*I).toFixed(3)})`;
      ctx.lineWidth   = p.coronaW;
      this._rRect(ctx, ix, iy, iw, ih, r); ctx.stroke();

      // Arco principal
      ctx.strokeStyle = `hsla(${h},72%,72%,${(0.80*I).toFixed(3)})`;
      ctx.lineWidth   = p.arcW;
      this._rRect(ctx, ix, iy, iw, ih, r); ctx.stroke();

      // Nucleo branco brilhante
      ctx.strokeStyle = `hsla(${h+15},30%,96%,${(0.90*I).toFixed(3)})`;
      ctx.lineWidth   = p.coreW;
      this._rRect(ctx, ix, iy, iw, ih, r); ctx.stroke();
    }

    // ── Corner glint: reflexo diagonal nos cantos (inspirado no CodePen KwdoyEN) ──
    {
      const mx = pw * 0.04, my = ph * 0.04;
      const grad = ctx.createLinearGradient(px-mx, py-my, px+pw+mx, py+ph+my);
      grad.addColorStop(0.00, 'rgba(255,255,255,0.22)');
      grad.addColorStop(0.28, 'rgba(255,255,255,0.00)');
      grad.addColorStop(0.72, 'rgba(255,255,255,0.00)');
      grad.addColorStop(1.00, 'rgba(255,255,255,0.18)');
      ctx.filter                   = 'blur(10px)';
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle                = grad;
      this._rRect(ctx, px-mx, py-my, pw+mx*2, ph+my*2, p.outerR + 3);
      ctx.fill();
      ctx.globalAlpha = 0.5;
      this._rRect(ctx, px-mx, py-my, pw+mx*2, ph+my*2, p.outerR + 3);
      ctx.fill();
    }

    ctx.filter                   = 'none';
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** Remove o SVG injetado do documento. */
  destroy() {
    const el = document.getElementById(this._id + '-svg');
    if (el) el.remove();
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  _rRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.lineTo(x+w-r, y); ctx.arcTo(x+w, y,   x+w, y+r,   r);
    ctx.lineTo(x+w, y+h-r); ctx.arcTo(x+w, y+h, x+w-r, y+h, r);
    ctx.lineTo(x+r, y+h); ctx.arcTo(x,   y+h, x,   y+h-r, r);
    ctx.lineTo(x, y+r);   ctx.arcTo(x,   y,   x+r, y,     r);
    ctx.closePath();
  }

  _injectSVG() {
    const p = this.p, id = this._id;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = id + '-svg';
    svg.setAttribute('style', 'position:absolute;width:0;height:0;overflow:hidden');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<defs>
      <filter id="${id}" colorInterpolationFilters="sRGB" x="-25%" y="-25%" width="150%" height="150%">
        <feTurbulence type="turbulence" baseFrequency="${p.freq}" numOctaves="${p.octaves}" result="n1" seed="1"/>
        <feOffset in="n1" dx="0" dy="0" result="o1">
          <animate attributeName="dy" values="700;0;700" dur="${p.durDy}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </feOffset>
        <feTurbulence type="turbulence" baseFrequency="${p.freq}" numOctaves="${p.octaves}" result="n2" seed="1"/>
        <feOffset in="n2" dx="0" dy="0" result="o2">
          <animate attributeName="dy" values="0;-700;0" dur="${p.durDy}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </feOffset>
        <feTurbulence type="turbulence" baseFrequency="${p.freq}" numOctaves="${p.octaves}" result="n3" seed="2"/>
        <feOffset in="n3" dx="0" dy="0" result="o3">
          <animate attributeName="dx" values="490;0;490" dur="${p.durDx}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </feOffset>
        <feTurbulence type="turbulence" baseFrequency="${p.freq}" numOctaves="${p.octaves}" result="n4" seed="2"/>
        <feOffset in="n4" dx="0" dy="0" result="o4">
          <animate attributeName="dx" values="0;-490;0" dur="${p.durDx}s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>
        </feOffset>
        <feComposite in="o1" in2="o2" result="p1"/>
        <feComposite in="o3" in2="o4" result="p2"/>
        <feBlend in="p1" in2="p2" mode="color-dodge" result="noise"/>
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="${p.scale}" xChannelSelector="R" yChannelSelector="B"/>
      </filter>
    </defs>`;
    document.body.appendChild(svg);
  }

  _applyFilter() {
    const filt = document.getElementById(this._id);
    if (!filt) return;
    filt.querySelectorAll('feTurbulence').forEach(el => {
      el.setAttribute('baseFrequency', this.p.freq);
      el.setAttribute('numOctaves', this.p.octaves);
    });
    filt.querySelector('feDisplacementMap').setAttribute('scale', this.p.scale);
    filt.querySelectorAll('animate[attributeName="dy"]').forEach(a => {
      a.setAttribute('dur', this.p.durDy + 's');
      try { a.beginElement(); } catch(e) {}
    });
    filt.querySelectorAll('animate[attributeName="dx"]').forEach(a => {
      a.setAttribute('dur', this.p.durDx + 's');
      try { a.beginElement(); } catch(e) {}
    });
  }
}

// CommonJS / module compatibility (graceful degradation no browser)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElectricBorder;
}
