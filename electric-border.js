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
 * ── Uso com loop interno (attach/detach) ─────────────────────────────────────
 *
 *   const eb = new ElectricBorder({ hue: 183, spinSpd: 1.4 });
 *   eb.attach(canvas, panelX, panelY, panelW, panelH); // inicia RAF interno
 *   eb.detach();   // pausa o loop (SVG permanece)
 *   eb.destroy();  // cancela loop + remove SVG
 *
 * ── Importacao ES Module / bundler ───────────────────────────────────────────
 *
 *   import ElectricBorder from './electric-border.js'; // Vite, Webpack, Rollup
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
 *   spinSpd    {number}  0      Velocidade do arco conic-gradient giratorio (rad/s).
 *                               0 = desativado. Ex: 1.4 = volta completa em ~4.5s.
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
 *   Browser  : Chrome 52+, Firefox 49+, Edge 79+, Safari 18+
 *   ctx.filter com url(#svg-id) requer que o SVG esteja no mesmo documento.
 *   CommonJS : module.exports = ElectricBorder  (auto-detectado)
 *   Bundler  : import ElectricBorder from './electric-border.js'
 *   Path2D   : ElectricBorder.makePath(x,y,w,h,r) → Path2D reutilizavel
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
    pulseSpd:    3.8,    // velocidade do pulso de intensidade (rad/s). 0 = sem pulso (I constante = 1)
    spinSpd:     0,      // vel. arco giratorio ELÉTRICO (rad/s). 0 = off
    spinHue:     null,   // hue do arco elétrico (null = usa hue principal)
    spinTail:    0.40,   // cauda do arco elétrico (0..1 do perimetro)
    spinFrmSpd:  0,      // vel. arco giratorio do FRAME estático (rad/s). 0 = off
    spinFrmHue:  null,   // hue do arco do frame (null = usa oh)
    spinFrmTail: 0.40,   // cauda do arco do frame (0..1 do perimetro)
    spinFlt:     true,   // true = arco eletrico com filtro SVG (distorcao), false = suave
    animNoise:   false,  // true = noise do filtro SVG animado (ir/voltar), false = estatico
  };

  /**
   * @param {Partial<typeof ElectricBorder.defaults>} params
   */
  constructor(params = {}) {
    this._id         = 'eb-' + Math.random().toString(36).slice(2, 8);
    this._filterUrl  = `url(#${this._id})`;
    this.p           = { ...ElectricBorder.defaults, ...params };
    this._colorCache = {};
    this._pathCache  = null;
    this._rafId      = null;
    this._attachCtx  = null;
    this._updateColorCache();
    this._injectSVG();
  }

  /** Atualiza qualquer subconjunto dos parametros e re-aplica o filtro. */
  setParams(params) {
    const prevAnim = this.p.animNoise;
    Object.assign(this.p, params);
    if ('hue' in params || 'outerHue' in params) this._updateColorCache();
    if ('innerInset' in params || 'innerR' in params || 'outerR' in params) this._pathCache = null;
    if ('animNoise' in params && this.p.animNoise !== prevAnim) {
      const old = document.getElementById(this._id + '-svg');
      if (old) old.remove();
      this._injectSVG();
    } else {
      this._applyFilter();
    }
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
    const showOuter   = layers.outer    !== false;
    const showAura    = layers.aura     !== false;
    const showElec    = layers.electric !== false;
    const showCorners = layers.corners  !== false;
    if (!showOuter && !showAura && !showElec && !showCorners) return;

    // ── Path cache: reconstroi apenas quando dimensoes mudam ─────────────────
    const pathKey = `${px},${py},${pw},${ph}`;
    if (!this._pathCache || this._pathCache._key !== pathKey) this._buildPaths(px, py, pw, ph);
    const { outer: outerPath, inner: innerPath, corner: cornerPath } = this._pathCache;

    const c = this._colorCache;
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // ── Pulso e flare (calculados so quando pulseSpd != 0) ───────────────────
    let I;
    if (p.pulseSpd === 0) {
      I = 1.0;
    } else {
      const pulse = 0.38 + 0.62 * (0.5 + 0.5 * Math.sin(t * p.pulseSpd));
      const flare = Math.sin(t * 7.1) * Math.sin(t * 11.9) > 0.85 ? 1.55 : 1.0;
      I = pulse * flare;
    }

    // ── Borda externa: estatica, neon sutil ───────────────────────────────────
    if (showOuter) {
      ctx.filter      = 'none';
      ctx.strokeStyle = c.outerStroke;
      ctx.shadowColor = c.outerShadow;
      ctx.shadowBlur  = 8;
      ctx.lineWidth   = 1;
      ctx.stroke(outerPath);
      ctx.shadowBlur  = 0;

      // ── Arco giratorio do frame (spinFrmSpd, sem filtro SVG) ──────────────
      if (p.spinFrmSpd !== 0 && ctx.createConicGradient) {
        const cfx = px + pw * 0.5, cfy = py + ph * 0.5;
        const cg  = ctx.createConicGradient(t * p.spinFrmSpd, cfx, cfy);
        const fh  = (p.spinFrmHue != null) ? p.spinFrmHue : ((p.outerHue != null) ? p.outerHue : p.hue);
        const fh2 = (fh + 52) % 360;
        const tl  = Math.max(0.05, Math.min(0.95, p.spinFrmTail));
        cg.addColorStop(0,                 `hsla(${fh},90%,65%,0)`);
        cg.addColorStop(tl * 0.10,         `hsla(${fh2},100%,80%,0.50)`);
        cg.addColorStop(tl * 0.24,         'rgba(255,255,255,0.95)');
        cg.addColorStop(tl * 0.44,         `hsla(${fh},100%,72%,0.88)`);
        cg.addColorStop(tl * 0.78,         `hsla(${fh},90%,55%,0.20)`);
        cg.addColorStop(Math.min(tl,0.98), 'rgba(255,255,255,0)');
        cg.addColorStop(1,                 'rgba(255,255,255,0)');
        ctx.strokeStyle = cg;
        ctx.lineWidth   = 3.5;
        ctx.shadowColor = 'rgba(255,255,255,0.9)';
        ctx.shadowBlur  = 14;
        ctx.stroke(outerPath);
        ctx.shadowBlur  = 0;
      }
    }

    // ── Camada 1: aura suave (sem filtro SVG, apenas shadowBlur) ─────────────
    if (showAura) {
      ctx.filter      = 'none';
      ctx.strokeStyle = c.auraStrokeBase + (0.08 * I).toFixed(3) + ')';
      ctx.shadowColor = c.auraShadow;
      ctx.shadowBlur  = p.auraBlur * I;
      ctx.lineWidth   = p.auraW;
      ctx.stroke(innerPath);
    }

    // ── Camadas 2-4: borda eletrica com filtro SVG ────────────────────────────
    if (showElec) {
      ctx.filter      = this._filterUrl;
      ctx.globalAlpha = I;
      ctx.shadowBlur  = 0;

      // Corona
      ctx.strokeStyle = c.corona;
      ctx.lineWidth   = p.coronaW;
      ctx.stroke(innerPath);

      // Arco principal
      ctx.strokeStyle = c.arc;
      ctx.lineWidth   = p.arcW;
      ctx.stroke(innerPath);

      // Nucleo branco brilhante
      ctx.strokeStyle = c.core;
      ctx.lineWidth   = p.coreW;
      ctx.stroke(innerPath);

      // ── Arco giratorio eletrico (spinHue + spinTail) ──────────────────────
      if (p.spinSpd !== 0 && ctx.createConicGradient) {
        const cex = px + pw * 0.5, cey = py + ph * 0.5;
        const cg  = ctx.createConicGradient(t * p.spinSpd, cex, cey);
        const sh  = (p.spinHue != null) ? p.spinHue : p.hue;
        const sh2 = (sh + 52) % 360;
        const tl  = Math.max(0.05, Math.min(0.95, p.spinTail));
        cg.addColorStop(0,                 'rgba(255,255,255,0)');
        cg.addColorStop(tl * 0.10,         `hsla(${sh2},100%,80%,0.50)`);
        cg.addColorStop(tl * 0.24,         'rgba(255,255,255,0.95)');
        cg.addColorStop(tl * 0.44,         `hsla(${sh},100%,72%,0.90)`);
        cg.addColorStop(tl * 0.78,         `hsla(${sh},90%,55%,0.20)`);
        cg.addColorStop(Math.min(tl,0.98), 'rgba(255,255,255,0)');
        cg.addColorStop(1,                 'rgba(255,255,255,0)');
        ctx.strokeStyle = cg;
        ctx.lineWidth   = p.arcW + p.coronaW + 0.5;
        ctx.shadowColor = 'rgba(255,255,255,0.85)';
        ctx.shadowBlur  = p.auraBlur * 0.7;
        ctx.stroke(innerPath);
        ctx.shadowBlur  = 0;
      }
      ctx.globalAlpha = 1;
    }

    // ── Corner glint: reflexo diagonal nos cantos ─────────────────────────────
    if (showCorners) {
      const mx = pw * 0.04, my = ph * 0.04;
      const grad = ctx.createLinearGradient(px-mx, py-my, px+pw+mx, py+ph+my);
      grad.addColorStop(0.00, 'rgba(255,255,255,0.22)');
      grad.addColorStop(0.28, 'rgba(255,255,255,0.00)');
      grad.addColorStop(0.72, 'rgba(255,255,255,0.00)');
      grad.addColorStop(1.00, 'rgba(255,255,255,0.18)');
      ctx.filter                   = 'blur(10px)';
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle                = grad;
      ctx.fill(cornerPath);
      ctx.globalAlpha = 0.5;
      ctx.fill(cornerPath);
    }

    ctx.filter                   = 'none';
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /** Preenche o fundo do painel com glow colorido. Chamado antes de draw(). */
  drawBg(ctx, px, py, pw, ph, r, fill = 'rgba(2,8,22,0.97)') {
    const br = (r !== undefined) ? r : this.p.outerR;
    ctx.save();
    ctx.shadowColor = this._colorCache.bgShadow;
    ctx.shadowBlur  = 40;
    ctx.fillStyle   = fill;
    this._rRect(ctx, px, py, pw, ph, br);
    ctx.fill();
    ctx.restore();
  }

  /** Remove o SVG injetado e cancela o loop RAF se ativo. */
  destroy() {
    this.detach();
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
    const an = this.p.animNoise;
    // Pulse OFF (an=false): BalintFerenczy one-way linear — border animates, sem ir/voltar
    // Pulse ON  (an=true ): hammadxcm oscillating spline  — border pulsa ir/voltar
    const mode = an ? 'spline' : 'linear';
    const ks   = an ? ` keySplines="0.4 0 0.6 1;0.4 0 0.6 1"` : '';
    const ay1 = `<animate attributeName="dy" values="${an?'700;0;700':'700;0'}" dur="${p.durDy}s" repeatCount="indefinite" calcMode="${mode}"${ks}/>`;
    const ay2 = `<animate attributeName="dy" values="${an?'0;-700;0':'0;-700'}" dur="${p.durDy}s" repeatCount="indefinite" calcMode="${mode}"${ks}/>`;
    const ax3 = `<animate attributeName="dx" values="${an?'490;0;490':'490;0'}" dur="${p.durDx}s" repeatCount="indefinite" calcMode="${mode}"${ks}/>`;
    const ax4 = `<animate attributeName="dx" values="${an?'0;-490;0':'0;-490'}" dur="${p.durDx}s" repeatCount="indefinite" calcMode="${mode}"${ks}/>`;
    svg.innerHTML = `<defs>
      <filter id="${id}" colorInterpolationFilters="sRGB" x="-25%" y="-25%" width="150%" height="150%">
        <feTurbulence type="turbulence" baseFrequency="${p.freq}" numOctaves="${p.octaves}" result="n1" seed="1"/>
        <feOffset in="n1" dx="0" dy="0" result="o1">${ay1}</feOffset>
        <feTurbulence type="turbulence" baseFrequency="${p.freq}" numOctaves="${p.octaves}" result="n2" seed="1"/>
        <feOffset in="n2" dx="0" dy="0" result="o2">${ay2}</feOffset>
        <feTurbulence type="turbulence" baseFrequency="${p.freq}" numOctaves="${p.octaves}" result="n3" seed="2"/>
        <feOffset in="n3" dx="0" dy="0" result="o3">${ax3}</feOffset>
        <feTurbulence type="turbulence" baseFrequency="${p.freq}" numOctaves="${p.octaves}" result="n4" seed="2"/>
        <feOffset in="n4" dx="0" dy="0" result="o4">${ax4}</feOffset>
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

  /**
   * Inicia loop de animacao interno, desenhando a borda automaticamente.
   * @param {HTMLCanvasElement} canvas
   * @param {number} x  posicao x do painel
   * @param {number} y  posicao y do painel
   * @param {number} w  largura do painel
   * @param {number} h  altura do painel
   */
  attach(canvas, x, y, w, h) {
    this.detach();
    this._attachCtx = canvas.getContext('2d');
    const loop = (ts) => {
      this._rafId = requestAnimationFrame(loop);
      this._attachCtx.clearRect(x - 20, y - 20, w + 40, h + 40);
      this.draw(this._attachCtx, x, y, w, h, ts / 1000);
    };
    this._rafId = requestAnimationFrame(loop);
  }

  /** Pausa o loop RAF iniciado por attach() (SVG e parametros sao mantidos). */
  detach() {
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId     = null;
      this._attachCtx = null;
    }
  }
}

// CommonJS / Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ElectricBorder;
}
// Bundler ES Module: import ElectricBorder from './electric-border.js'
// Browser <script src>: ElectricBorder disponivel como global automaticamente
