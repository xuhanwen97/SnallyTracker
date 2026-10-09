// Snally mascot: five life stages, drawn as inline SVG strings.
// Stage 1 Egg · 2 Hatchling · 3 Whelp · 4 Drake · 5 Mega Elder Snallygaster.
// Chibi style: big head, two big sparkly eyes, blushy cheeks, bat wings.
// Usage: Snally.draw(stage, { hoard: 0..1, id: "unique", palette: drinkerIndex }) → "<svg ...>"
(function (root) {
  // One palette per drinker (assigned by their place in the Drinkers list), so every Snally looks different.
  // [name, body, shade, belly, wing/spike, wingDark, Mega fire, Mega fire light, Mega fire deep]
  const PALETTES = [
    ["Tangerine", "#f39a5b", "#e07b3c", "#ffe6bf", "#a8e0c4", "#6fbf98", "#4fc3ff", "#b8f1ff", "#2f6bff"],
    ["Mint", "#8fdcb8", "#6cc29c", "#fff3cf", "#ffb3c7", "#f08aa6", "#57e389", "#c8ffd9", "#1f9d55"],
    ["Bubblegum", "#ff9ec4", "#f07aa8", "#fff0f5", "#b9a7ff", "#9580f0", "#ff5fa8", "#ffd1e6", "#c2185b"],
    ["Lavender", "#c3a8ff", "#a184f0", "#fff3cf", "#ffd36b", "#f0b23a", "#b07cff", "#e6d6ff", "#6a3cc9"],
    ["Sky", "#8fcfff", "#66b4f0", "#fffbe6", "#ffb38a", "#f28f5f", "#2ee6d6", "#c4fff9", "#0f9c94"],
    ["Butter", "#ffd866", "#f0bd3a", "#fff8e1", "#8fd3ff", "#5fb4ea", "#ffcc33", "#fff1b3", "#c98a00"],
    ["Coral", "#ff9f8f", "#f07a6a", "#fff1e8", "#9fe3c4", "#6cc29c", "#ff4f4f", "#ffc4c4", "#b71c1c"],
    ["Lagoon", "#6fd6d0", "#4dbab4", "#fff6e0", "#ff9ec4", "#f07aa8", "#b6f23a", "#ecffc4", "#6b9d00"],
    ["Orchid", "#e6a8e8", "#cf86d2", "#fff3fb", "#9fe3c4", "#6cc29c", "#e040fb", "#f5c6ff", "#8e24aa"],
    ["Sage", "#b5d48f", "#97ba6c", "#fdf8e4", "#f7b267", "#e0913c", "#ff9f1c", "#ffe0b3", "#d9480f"],
    ["Cocoa", "#c99a7a", "#ad7d5c", "#fff1dc", "#ffb3c7", "#f08aa6", "#e8ecf5", "#ffffff", "#8a94ad"],
    ["Cherry", "#ff7a7a", "#e85a5a", "#fff0e0", "#ffd866", "#f0bd3a", "#7c8cff", "#d6dbff", "#3949ab"],
  ];
  const pal = (i) => PALETTES[(((i | 0) % PALETTES.length) + PALETTES.length) % PALETTES.length];
  const cute = (i) => {
    const [, body, shade, belly, wing, wingDark] = pal(i);
    return { body, shade, line: "#5a3220", belly, bellyLine: "#e9b77c", wing, wingDark, cheek: "#ff8f8f", beak: "#ffc86b",
      horn: "#fff1dc", spike: wing, eye: "#3a2218", flame1: "#ff9f43", flame2: "#ffe066", glow: null, accent: wing, deep: wingDark };
  };
  const mega = (i) => {
    const [, , , , , , fire, light, deep] = pal(i);
    return { body: "#3b3f4e", shade: "#2a2d39", line: "#151722", belly: light, bellyLine: fire, wing: "#1f2433", wingDark: fire,
      cheek: fire, beak: "#9aa3b8", horn: "#e8ecf5", spike: fire, eye: light, flame1: fire, flame2: light, glow: fire, accent: fire, deep };
  };

  const coin = (x, y, r = 7) =>
    `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.62}" fill="#ffd34d" stroke="#c9961a" stroke-width="1.6"/>` +
    `<ellipse cx="${x - r * 0.25}" cy="${y - r * 0.15}" rx="${r * 0.35}" ry="${r * 0.18}" fill="#fff2a8"/>`;

  // A pile of coins whose size follows hoard (0..1). Deterministic so it doesn't jitter.
  function hoardPile(amount, cx = 100, base = 192, maxW = 150) {
    const n = Math.round(3 + amount * 60);
    const h = 8 + amount * 46, w = 30 + amount * maxW;
    let out = `<path d="M${cx - w / 2},${base} Q${cx},${base - h * 2} ${cx + w / 2},${base} Z" fill="#f5c53a" stroke="#c9961a" stroke-width="2"/>`;
    let s = 7;
    const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < n; i++) {
      const t = rnd() * 2 - 1, y = base - rnd() * h * (1 - t * t) * 0.95;
      out += coin(cx + t * w / 2 * 0.85, y, 5 + rnd() * 3);
    }
    if (amount > 0.6) out += `<path d="M${cx + w * 0.28},${base - 10} l6,-14 l6,14 Z" fill="#ff5d8f" stroke="#a8325b" stroke-width="1.5"/>` +
      `<path d="M${cx - w * 0.32},${base - 8} l5,-11 l5,11 Z" fill="#5dd6ff" stroke="#2a7fa8" stroke-width="1.5"/>`;
    return out;
  }

  const flame = (x, y, s, c, id) =>
    `<g transform="translate(${x} ${y}) scale(${s})"><path class="sn-flame" d="M0,8 C-12,2 -9,-12 -3,-20 C-2,-12 4,-12 2,-24 C14,-14 13,2 0,8 Z" fill="${c.flame1}"/>` +
    `<path d="M0,6 C-6,2 -5,-6 -1,-11 C0,-6 4,-6 3,-13 C9,-6 7,2 0,6 Z" fill="${c.flame2}"/></g>`;

  // The big single eye. look: horizontal pupil offset.
  function eye(x, y, r, c, look = 0, sleepy = false) {
    if (sleepy) return `<path d="M${x - r},${y} Q${x},${y + r * 0.8} ${x + r},${y}" fill="none" stroke="${c.line}" stroke-width="3" stroke-linecap="round"/>`;
    const glow = c.glow ? `<circle cx="${x}" cy="${y}" r="${r * 1.5}" fill="${c.glow}" opacity=".35"/>` : "";
    const white = c.glow ? "#e9fdff" : "#fff";
    return glow + `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.1}" fill="${white}" stroke="${c.line}" stroke-width="2.5"/>` +
      `<ellipse cx="${x + look}" cy="${y + r * 0.12}" rx="${r * 0.62}" ry="${r * 0.72}" fill="${c.eye}"/>` +
      (c.glow ? `<ellipse cx="${x + look}" cy="${y + r * 0.12}" rx="${r * 0.25}" ry="${r * 0.55}" fill="#0b2a3a"/>` : "") +
      `<circle cx="${x + look - r * 0.25}" cy="${y - r * 0.25}" r="${r * 0.24}" fill="#fff"/>` +
      `<circle cx="${x + look + r * 0.22}" cy="${y + r * 0.3}" r="${r * 0.1}" fill="#fff"/>`;
  }

  // Chibi face: two big sparkly eyes, blush, tiny nostrils and a happy little mouth.
  function face(cx, cy, c, mega = false, k = 1) {
    const ex = 17 * k, ey = cy + 2 * k, r = 10 * k;
    let f = "";
    f += `<ellipse cx="${cx - 30 * k}" cy="${cy + 14 * k}" rx="${8 * k}" ry="${5 * k}" fill="${c.cheek}" opacity="${mega ? .7 : .85}"/>` +
      `<ellipse cx="${cx + 30 * k}" cy="${cy + 14 * k}" rx="${8 * k}" ry="${5 * k}" fill="${c.cheek}" opacity="${mega ? .7 : .85}"/>`;
    for (const side of [-1, 1]) {
      const x = cx + side * ex;
      if (c.glow) f += `<circle cx="${x}" cy="${ey}" r="${r * 1.7}" fill="${c.glow}" opacity=".3"/>`;
      f += `<ellipse cx="${x}" cy="${ey}" rx="${r}" ry="${r * 1.18}" fill="${c.glow ? "#bff6ff" : c.eye}"/>`;
      if (c.glow) f += `<ellipse cx="${x}" cy="${ey + r * 0.1}" rx="${r * 0.32}" ry="${r * 0.8}" fill="#0b2a3a"/>`;
      else f += `<ellipse cx="${x}" cy="${ey + r * 0.55}" rx="${r * 0.7}" ry="${r * 0.4}" fill="#5b4f86" opacity=".7"/>`;
      f += `<circle cx="${x - r * 0.32}" cy="${ey - r * 0.42}" r="${r * 0.38}" fill="#fff"/>` +
        `<circle cx="${x + r * 0.35}" cy="${ey + r * 0.35}" r="${r * 0.16}" fill="#fff"/>`;
    }
    f += `<circle cx="${cx - 4 * k}" cy="${cy + 12 * k}" r="${1.4 * k}" fill="${c.line}"/><circle cx="${cx + 4 * k}" cy="${cy + 12 * k}" r="${1.4 * k}" fill="${c.line}"/>`;
    if (mega) f += `<path d="M${cx - 12 * k},${cy + 18 * k} Q${cx},${cy + 26 * k} ${cx + 12 * k},${cy + 18 * k}" fill="none" stroke="${c.line}" stroke-width="2.5" stroke-linecap="round"/>`;
    else f += `<path d="M${cx - 7 * k},${cy + 17 * k} Q${cx - 3.5 * k},${cy + 21 * k} ${cx},${cy + 17 * k} Q${cx + 3.5 * k},${cy + 21 * k} ${cx + 7 * k},${cy + 17 * k}" fill="none" stroke="${c.line}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M${cx - 2.5 * k},${cy + 19.3 * k} Q${cx},${cy + 24 * k} ${cx + 2.5 * k},${cy + 19.3 * k}" fill="#ff7f9e"/>`;
    return f;
  }

  // Bat wing with membrane scallops. side: -1 left, 1 right.
  function wing(side, sx, sy, span, c) {
    const x = (dx) => sx + side * dx;
    const tipX = x(span), tipY = sy - span * 0.9;
    const d = `M${sx},${sy} L${tipX},${tipY} ` +
      `Q${x(span * 0.98)},${sy - span * 0.35} ${x(span * 0.8)},${sy - span * 0.1} ` +
      `Q${x(span * 0.6)},${sy - span * 0.2} ${x(span * 0.5)},${sy + span * 0.08} ` +
      `Q${x(span * 0.3)},${sy - span * 0.02} ${x(span * 0.12)},${sy + span * 0.22} Z`;
    return `<path d="${d}" fill="${c.wing}" stroke="${c.line}" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<path d="M${sx},${sy} L${tipX},${tipY} M${x(span * 0.9)},${sy - span * 0.62} L${x(span * 0.8)},${sy - span * 0.1} M${x(span * 0.72)},${sy - span * 0.48} L${x(span * 0.5)},${sy + span * 0.08}" ` +
      `fill="none" stroke="${c.wingDark}" stroke-width="2.5" stroke-linecap="round"/>`;
  }

  // Seated chubby Snally (stages 3-5). k = size; big = adult proportions.
  function dragon(c, o) {
    const { wingSpan, horns, tailFlame, beard, mega } = o;
    let g = "";
    // tail curling out to the right, flame on the tip
    g += `<path d="M128,168 C165,172 178,150 176,128 C175,118 168,112 164,118 C168,140 156,156 124,152 Z" fill="${c.body}" stroke="${c.line}" stroke-width="2.5" stroke-linejoin="round"/>`;
    g += [[146, 168, -10], [162, 160, 20], [172, 144, 60], [176, 128, 85]].map(([x, y, r]) =>
      `<path d="M-6,0 Q0,-14 6,0 Z" transform="translate(${x} ${y}) rotate(${r})" fill="${c.spike}" stroke="${c.line}" stroke-width="2" stroke-linejoin="round"/>`).join("");
    g += flame(170, 116, tailFlame, c);
    // wings behind
    g += wing(-1, 78, 102, wingSpan, c) + wing(1, 122, 102, wingSpan, c);
    // body (pear) + belly
    g += `<path d="M100,66 C140,66 152,110 150,140 C148,170 128,180 100,180 C72,180 52,170 50,140 C48,110 60,66 100,66 Z" fill="${c.body}" stroke="${c.line}" stroke-width="2.5"/>`;
    g += `<path d="M100,108 C126,108 136,130 134,150 C132,168 118,176 100,176 C82,176 68,168 66,150 C64,130 74,108 100,108 Z" fill="${c.belly}" stroke="${c.bellyLine}" stroke-width="2"/>`;
    g += [124, 138, 152, 165].map(y => `<path d="M${76 + Math.abs(y - 145) * 0.25},${y} Q100,${y + 5} ${124 - Math.abs(y - 145) * 0.25},${y}" fill="none" stroke="${c.bellyLine}" stroke-width="1.6"/>`).join("");
    // little arms
    g += `<path d="M62,118 Q50,128 58,136 Q66,134 70,124" fill="${c.body}" stroke="${c.line}" stroke-width="2.5" stroke-linejoin="round"/>`;
    g += `<path d="M138,118 Q150,128 142,136 Q134,134 130,124" fill="${c.body}" stroke="${c.line}" stroke-width="2.5" stroke-linejoin="round"/>`;
    // feet
    g += `<ellipse cx="76" cy="180" rx="15" ry="8" fill="${c.body}" stroke="${c.line}" stroke-width="2.5"/><ellipse cx="124" cy="180" rx="15" ry="8" fill="${c.body}" stroke="${c.line}" stroke-width="2.5"/>`;
    g += `<path d="M66,183 l3,-4 l3,4 M76,184 l3,-4 l3,4 M118,184 l3,-4 l3,4 M128,183 l3,-4 l3,4" fill="${c.horn}" stroke="${c.line}" stroke-width="1.4"/>`;
    // horns
    if (horns === "nubs") g += `<path d="M78,46 Q76,32 86,38 Z M122,46 Q124,32 114,38 Z" fill="${c.horn}" stroke="${c.line}" stroke-width="2.2" stroke-linejoin="round"/>`;
    if (horns === "big") g += `<path d="M76,48 Q60,22 70,10 Q74,30 90,40 Z M124,48 Q140,22 130,10 Q126,30 110,40 Z" fill="${c.horn}" stroke="${c.line}" stroke-width="2.2" stroke-linejoin="round"/>`;
    if (horns === "mega") g += `<path d="M78,50 Q44,40 30,14 Q58,26 90,40 Z M122,50 Q156,40 170,14 Q142,26 110,40 Z" fill="${c.horn}" stroke="${c.line}" stroke-width="2.2" stroke-linejoin="round"/>` +
      `<path d="M74,46 Q54,38 44,24 M126,46 Q146,38 156,24" stroke="${c.accent}" stroke-width="2" fill="none"/>`;
    // head crest (kaiju back-spikes peeking over the head)
    g += [[84, 28, -25, 0.8], [100, 22, 0, 1], [116, 28, 25, 0.8]].map(([x, y, r, k]) =>
      `<path d="M-8,4 Q0,-16 8,4 Z" transform="translate(${x} ${y}) rotate(${r}) scale(${k})" fill="${c.spike}" stroke="${c.line}" stroke-width="2.2" stroke-linejoin="round"/>`).join("");
    // head
    g += `<ellipse cx="100" cy="60" rx="46" ry="38" fill="${c.body}" stroke="${c.line}" stroke-width="2.5"/>`;
    g += `<path d="M60,56 Q60,36 78,28" fill="none" stroke="${c.shade}" stroke-width="3" stroke-linecap="round"/>`;
    // beak-snout + smile
    g += face(100, 60, c, mega);
    if (mega) g += `<path d="M72,38 L92,45 M128,38 L108,45" fill="none" stroke="${c.accent}" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M90,79 l3,6 l3,-5 M104,79 l3,5 l3,-6" fill="#fff" stroke="${c.line}" stroke-width="1.5" stroke-linejoin="round"/>`; // stern brow + fangs
    // elder whiskers: long wise-dragon mustache curling down from the snout
    if (beard) g += [-1, 1].map(d => `<path d="M${100 + d * 6},73 C${100 + d * 22},74 ${100 + d * 36},84 ${100 + d * 40},100 C${100 + d * 42},110 ${100 + d * 34},114 ${100 + d * 31},106" fill="none" stroke="#e9f6ff" stroke-width="4" stroke-linecap="round"/>` +
      `<path d="M${100 + d * 6},73 C${100 + d * 22},74 ${100 + d * 36},84 ${100 + d * 40},100" fill="none" stroke="${c.accent}" stroke-width="1.2" stroke-linecap="round" opacity=".8"/>`).join("");
    if (mega) g += `<g transform="rotate(-35 68 84)">${flame(68, 84, 1.1, c)}</g><g transform="rotate(35 132 84)">${flame(132, 84, 1.1, c)}</g>`; // Mega X jaw flames
    return g;
  }

  const STAGES = [
    null,
    { name: "Egg", title: "Speckled Egg", blurb: "Something's wiggling in there…" },
    { name: "Hatchling", title: "Hatchling", blurb: "Still wearing its shell as a hat." },
    { name: "Whelp", title: "Whelp", blurb: "Stubby wings, big appetite, first coins." },
    { name: "Drake", title: "Drake", blurb: "Horns are in. The hoard is growing." },
    { name: "Mega Elder", title: "Mega Elder Snallygaster", blurb: "Blue fire. Ancient whiskers. A mountain of gold." },
  ];

  function draw(stage, opt = {}) {
    stage = Math.max(1, Math.min(5, stage | 0));
    const hoard = Math.max(0, Math.min(1, opt.hoard ?? [0, 0, .08, .25, .5, 1][stage]));
    const id = opt.id || "s" + stage;
    const c = stage === 5 ? mega(opt.palette) : cute(opt.palette);
    let body = "", back = "";

    if (stage === 1) {
      body += `<g class="sn-wobble"><path d="M100,40 C138,40 154,104 152,132 C150,166 128,184 100,184 C72,184 50,166 48,132 C46,104 62,40 100,40 Z" fill="#fff4e2" stroke="#8a5a3c" stroke-width="2.5"/>`;
      body += [[72, 140, 6], [126, 150, 8], [118, 110, 5], [80, 170, 5], [134, 128, 4], [70, 108, 4]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.spike}"/>`).join("");
      // crack band with an eye peeking through
      body += `<path d="M60,98 L72,88 L82,98 L94,86 L108,98 L122,88 L132,98 L144,94 L145,110 L132,114 L122,106 L108,114 L94,106 L82,114 L72,106 L59,113 Z" fill="#3a3346"/>`;
      body += [88, 114].map(x => `<ellipse cx="${x}" cy="100" rx="5" ry="5.5" fill="#fff"/><circle cx="${x + 1}" cy="101" r="3" fill="${c.eye}"/><circle cx="${x - 1.5}" cy="98.5" r="1.3" fill="#fff"/>`).join("");
      body += `<path d="M60,98 L72,88 L82,98 L94,86 L108,98 L122,88 L132,98 L144,94" fill="none" stroke="#8a5a3c" stroke-width="2.2" stroke-linejoin="round"/>`;
      body += `<ellipse cx="74" cy="128" rx="8" ry="5" fill="${c.cheek}" opacity=".55"/><ellipse cx="126" cy="128" rx="8" ry="5" fill="${c.cheek}" opacity=".55"/></g>`;
      back = hoardPile(0.02, 100, 192, 40);
    } else if (stage === 2) {
      back = hoardPile(hoard, 150, 192, 40);
      body += `<g class="sn-bob">`;
      // nub wings
      body += `<path d="M62,120 Q40,104 44,128 Q52,132 64,130 Z M138,120 Q160,104 156,128 Q148,132 136,130 Z" fill="${c.wing}" stroke="${c.line}" stroke-width="2.5" stroke-linejoin="round"/>`;
      body += `<ellipse cx="100" cy="128" rx="44" ry="42" fill="${c.body}" stroke="${c.line}" stroke-width="2.5"/>`;
      body += `<ellipse cx="100" cy="148" rx="26" ry="20" fill="${c.belly}"/>`;
      body += face(100, 116, c, false, 0.95);
      // shell cap on head, tilted
      body += `<path d="M66,92 Q72,52 104,50 Q134,52 136,84 L126,78 L118,90 L108,78 L98,90 L88,78 L78,90 Z" fill="#fff4e2" stroke="#8a5a3c" stroke-width="2.5" stroke-linejoin="round" transform="rotate(-12 100 80)"/>`;
      body += `<circle cx="92" cy="64" r="4" fill="${c.spike}" transform="rotate(-12 100 80)"/><circle cx="114" cy="70" r="3" fill="${c.spike}" transform="rotate(-12 100 80)"/>`;
      // bottom shell
      body += `<path d="M52,150 L64,140 L74,152 L86,140 L100,152 L114,140 L126,152 L136,140 L148,150 C148,176 128,190 100,190 C72,190 52,176 52,150 Z" fill="#fff4e2" stroke="#8a5a3c" stroke-width="2.5" stroke-linejoin="round"/>`;
      body += `<circle cx="74" cy="172" r="5" fill="${c.spike}"/><circle cx="124" cy="168" r="6" fill="${c.spike}"/></g>`;
    } else if (stage === 3) {
      back = hoardPile(hoard, 100, 196, 140);
      body = `<g transform="translate(22 30) scale(.78)">` + dragon(c, { wingSpan: 26, horns: "nubs", tailFlame: .7 }) + `</g>`;
    } else if (stage === 4) {
      back = hoardPile(hoard, 100, 198, 170);
      body = `<g transform="translate(10 8) scale(.9)">` + dragon(c, { wingSpan: 54, horns: "big", tailFlame: 1 }) + `</g>`;
    } else {
      back = `<circle cx="100" cy="96" r="92" fill="url(#aura-${id})"/>` + hoardPile(1, 100, 200, 190);
      body = `<g transform="translate(4 -2) scale(.96)">` + dragon(c, { wingSpan: 76, horns: "mega", tailFlame: 1.5, beard: true, mega: true }) + `</g>`;
      body += `<path d="M86,10 L90,-2 L96,8 L100,-4 L104,8 L110,-2 L114,10 Z" fill="#ffd34d" stroke="#c9961a" stroke-width="1.8" transform="translate(0 20)"/>`; // tiny crown
    }
    const defs = stage === 5 ? `<defs><radialGradient id="aura-${id}"><stop offset="0" stop-color="${c.accent}" stop-opacity=".55"/><stop offset=".6" stop-color="${c.deep}" stop-opacity=".18"/><stop offset="1" stop-color="${c.deep}" stop-opacity="0"/></radialGradient></defs>` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" class="snally stage-${stage}" role="img" aria-label="Snally, ${STAGES[stage].title}">${defs}${back}${body}</svg>`;
  }

  // Pours → stage: 3 pours per stage, 12+ is Mega Elder.
  const stageFor = (pours) => Math.min(5, 1 + Math.floor(pours / 3));

  const api = { draw, stageFor, STAGES, coin, PALETTES };
  if (typeof module !== "undefined") module.exports = api; else root.Snally = api;
})(typeof window !== "undefined" ? window : globalThis);
