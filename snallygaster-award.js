// Snallygaster award avatar: round "mochi" chibi kaiju hugging a giant beer, with a crown.
// Loaded after cryptids-awards.js, so it replaces C.snallygaster there.
(function (root) {
  const L = "#5a3220";
  const O = `stroke="${L}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;
  const B = "#f39a5b", D = "#e07b3c", K = "#ffe6bf", M = "#a8e0c4", MD = "#7fc9a6";
  const G = "#ffd34d", GD = "#c9961a";
  const svg = (name, body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" class="cryptid" role="img" aria-label="${name}">${body}</svg>`;
  const mirror = (g) => g + `<g transform="matrix(-1 0 0 1 200 0)">${g}</g>`;
  const f1 = (n) => Math.round(n * 10) / 10;

  // One sparkly eye (same recipe as face() in cryptids-awards.js).
  const eye = (x, ey, r) =>
    `<ellipse cx="${x}" cy="${ey}" rx="${r}" ry="${f1(r * 1.18)}" fill="#3a2218"/>` +
    `<ellipse cx="${x}" cy="${f1(ey + r * .55)}" rx="${f1(r * .7)}" ry="${f1(r * .4)}" fill="#5b4f86" opacity=".7"/>` +
    `<circle cx="${f1(x - r * .32)}" cy="${f1(ey - r * .42)}" r="${f1(r * .38)}" fill="#fff"/>` +
    `<circle cx="${f1(x + r * .35)}" cy="${f1(ey + r * .35)}" r="${f1(r * .16)}" fill="#fff"/>`;
  const blush = (x, y, rx = 8, ry = 5) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#ff8f8f" opacity=".85"/>`;
  const star = (x, y, s, col = "#fff") =>
    `<path transform="translate(${x} ${y}) scale(${s})" d="M0,-6 Q1,-1 6,0 Q1,1 0,6 Q-1,1 -6,0 Q-1,-1 0,-6 Z" fill="${col}"/>`;

  // Pointed kaiju spike, tip pointing "up" in local coords (put inside an outlined, filled <g>).
  const spike = (x, y, a, s) =>
    `<path transform="translate(${f1(x)} ${f1(y)}) rotate(${f1(a)}) scale(${f1(s)})" d="M-8,6 C-7,-2 -3,-9 0,-17 C3,-9 7,-2 8,6 Z"/>`;
  // Spikes along a cubic Bézier, pointing left of the travel direction (travelling left→right they point up).
  const spikesAlong = (p, sizes) => {
    const [x0, y0, x1, y1, x2, y2, x3, y3] = p, n = sizes.length;
    return sizes.map((s, i) => {
      const t = n === 1 ? .5 : i / (n - 1), u = 1 - t;
      const x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3;
      const y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3;
      const dx = 3 * u * u * (x1 - x0) + 6 * u * t * (x2 - x1) + 3 * t * t * (x3 - x2);
      const dy = 3 * u * u * (y1 - y0) + 6 * u * t * (y2 - y1) + 3 * t * t * (y3 - y2);
      const a = Math.atan2(dy, dx) * 180 / Math.PI;
      return spike(x, y, a, s);
    }).join("");
  };
  // Shapes merged into one outlined silhouette: thick outline pass, then fill pass on top.
  const blob = (shapes, fill) => `<g fill="${fill}" stroke="${L}" stroke-width="5" stroke-linejoin="round">${shapes}</g><g fill="${fill}">${shapes}</g>`;
  // Little white claws: list of [x, y, angle].
  const claws = (list, s = 1) => `<g fill="#fff" stroke="${L}" stroke-width="1.5" stroke-linejoin="round">` +
    list.map(([x, y, a]) => `<path transform="translate(${x} ${y}) rotate(${a}) scale(${s})" d="M-3,1 L0,-6 L3,1 Z"/>`).join("") + `</g>`;
  // Gold crown, centred at (x,y) base-middle, tilted a degrees.
  const crown = (x, y, a, s = 1) =>
    `<g transform="translate(${x} ${y}) rotate(${a}) scale(${s})">` +
    `<path d="M-20,0 L-24,-24 L-11,-12 L0,-30 L11,-12 L24,-24 L20,0 Z" fill="${G}" stroke="${GD}" stroke-width="2.5" stroke-linejoin="round"/>` +
    `<path d="M-19,-5 L19,-5" stroke="${GD}" stroke-width="2"/>` +
    `<circle cx="-24" cy="-24" r="3" fill="#fff2a8" stroke="${GD}" stroke-width="1.5"/><circle cx="0" cy="-30" r="3.5" fill="#fff2a8" stroke="${GD}" stroke-width="1.5"/><circle cx="24" cy="-24" r="3" fill="#fff2a8" stroke="${GD}" stroke-width="1.5"/>` +
    `<circle cx="0" cy="-12" r="4.2" fill="#ff5d8f" stroke="#a8325b" stroke-width="1.5"/><circle cx="-12" cy="-8" r="2.4" fill="#5dd6ff"/><circle cx="12" cy="-8" r="2.4" fill="#5dd6ff"/>` +
    `<path d="M-14,-18 l2,-5" stroke="#fff8d0" stroke-width="2" stroke-linecap="round"/></g>`;
  const coin = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="2.5" rx="13" ry="5.5" fill="${GD}" stroke="${L}" stroke-width="2"/>` +
    `<ellipse cx="0" cy="0" rx="13" ry="5.5" fill="${G}" stroke="${L}" stroke-width="2"/><ellipse cx="0" cy="0" rx="7" ry="2.6" fill="none" stroke="${GD}" stroke-width="1.4"/></g>`;
  // Angry-cute kaiju grin: open mouth, tongue, tiny teeth; (x,y) is the mouth's top-left, w wide, h deep.
  const grin = (x, y, w, h) => {
    const m = x + w / 2;
    return `<path d="M${x},${y} Q${m},${y + h * .25} ${x + w},${y} Q${x + w * .85},${y + h} ${m},${y + h} Q${x + w * .15},${y + h} ${x},${y} Z" fill="#7a2e2e" ${O}/>` +
      `<path d="M${f1(x + w * .22)},${f1(y + h * .8)} Q${m},${f1(y + h * .4)} ${f1(x + w * .78)},${f1(y + h * .8)} Q${m},${f1(y + h * 1.02)} ${f1(x + w * .22)},${f1(y + h * .8)} Z" fill="#ff7f9e"/>` +
      `<g fill="#fff" stroke="${L}" stroke-width="1.2" stroke-linejoin="round">` +
      `<path d="M${f1(x + w * .12)},${f1(y + h * .07)} l3,${f1(h * .3)} l3,${f1(-h * .26)} Z"/><path d="M${f1(x + w * .88 - 6)},${f1(y + h * .1)} l3,${f1(h * .26)} l3,${f1(-h * .3)} Z"/></g>`;
  };

  const V = {};

  // ── A: three-quarter "rawr" facing left, sitting on a pile of gold coins ──
  V.b = (id) => {
    let g = "";
    // tail poking out right with spikes
    g += `<g fill="${M}" ${O}>` + spikesAlong([150, 150, 168, 140, 180, 128, 186, 112], [.75, .65, .55]) + `</g>`;
    g += `<path d="M150,170 C170,168 186,152 190,128 C192,118 182,114 178,124 C172,140 160,148 146,150 Z" fill="${B}" ${O}/>`;
    // spikes peeking over the head (on the back, slightly right)
    g += `<g fill="${M}" ${O}>` + spikesAlong([118, 42, 146, 44, 168, 66, 176, 100], [1.05, 1.25, 1.25, 1.1, .9]) + `</g>`;
    // feet
    g += mirror(`<ellipse cx="72" cy="181" rx="16" ry="10" fill="${D}" ${O}/>` + claws([[62, 183, 200], [70, 186, 180], [78, 186, 160]], .8));
    // mochi body
    g += `<path d="M100,40 C152,40 176,80 176,120 C176,160 148,182 100,182 C52,182 24,160 24,120 C24,80 48,40 100,40 Z" fill="${B}" ${O}/>`;
    g += `<path d="M156,74 C170,94 172,128 160,150" fill="none" stroke="${D}" stroke-width="8" stroke-linecap="round" opacity=".5"/>`;
    g += `<ellipse cx="96" cy="150" rx="42" ry="28" fill="${K}"/>`;
    // face (a little left for 3/4)
    g += blush(54, 96) + blush(126, 96);
    g += eye(72, 78, 11) + eye(108, 78, 11) + star(77, 84, .45) + star(113, 84, .45);
    g += `<path d="M82,94 Q90,96 98,94 Q96,104 90,104 Q84,104 82,94 Z" fill="#7a2e2e" ${O}/><path d="M86,101 Q90,98 94,101 Q90,104 86,101 Z" fill="#ff7f9e"/>` +
      `<path d="M84,95 l2,4 l2,-3.5 Z M92,95.5 l2,3.5 l2,-4 Z" fill="#fff" stroke="${L}" stroke-width="1" stroke-linejoin="round"/>`;
    // giant beer mug
    g += `<path d="M138,130 C156,130 158,166 138,166" fill="none" stroke="${L}" stroke-width="13" stroke-linecap="round"/><path d="M138,130 C156,130 158,166 138,166" fill="none" stroke="#ffc04d" stroke-width="7" stroke-linecap="round"/>`;
    g += `<rect x="68" y="122" width="70" height="62" rx="9" fill="#ffc04d" ${O}/>` +
      `<rect x="76" y="132" width="9" height="44" rx="4.5" fill="#ffe08a"/><rect x="90" y="132" width="5" height="44" rx="2.5" fill="#ffe08a" opacity=".7"/>` +
      `<circle cx="118" cy="160" r="3" fill="#fff4c2"/><circle cx="126" cy="146" r="2" fill="#fff4c2"/><circle cx="112" cy="138" r="2.4" fill="#fff4c2"/>`;
    g += `<path d="M64,126 C60,114 72,108 80,113 C84,105 98,105 102,111 C108,104 124,106 126,114 C138,112 144,122 138,128 C142,134 136,140 132,136 L132,144 C132,150 124,150 124,144 L124,136 L68,136 C60,136 60,128 64,126 Z" fill="#fffaf0" ${O}/>`;
    // little arms hugging the mug
    g += `<path d="M34,138 C42,128 60,128 72,138 C78,146 72,156 62,154 C52,152 42,154 36,148 Z" fill="${B}" ${O}/>` + claws([[75, 141, 90], [75, 149, 105]], .85);
    g += `<path d="M166,138 C158,128 140,128 130,138 C124,146 130,156 140,154 C150,152 160,154 164,148 Z" fill="${B}" ${O}/>` + claws([[127, 141, -90], [127, 149, -105]], .85);
    // crown + sparkles
    g += crown(100, 44, -8, .9);
    g += star(40, 56, 1.1, G) + star(172, 40, .9, G) + star(28, 86, .6, G);
    return svg("Snallygaster", g);
  };

  // ── C: victory pose, gold trophy of beer held high, tail curled, puff of breath ──

  (root.CRYPTIDS = root.CRYPTIDS || {}).snallygaster = V.b; // the "mochi blob" award avatar (owner picked B)
  if (typeof module !== "undefined") module.exports = { snallygaster: V.b };
})(typeof window !== "undefined" ? window : globalThis);
