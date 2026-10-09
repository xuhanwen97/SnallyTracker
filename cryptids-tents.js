// Festival-tent cryptids: chibi SVG avatars keyed by tent name.
// Same style as mascot.js: flat pastel fills, chocolate outline, big sparkly eyes, blush.
// Usage: CRYPTIDS["Rodan"]("unique-id") → "<svg ...>"
(function (root) {
  const C = root.CRYPTIDS = root.CRYPTIDS || {};
  const L = "#5a3220";
  const SW = `stroke="${L}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;
  // outline attrs + per-shape overrides (an override replaces the default: duplicate attributes are invalid SVG and HTML keeps the first)
  const sw = (x) => { let s = SW; for (const [, k] of x.matchAll(/([\w-]+)="/g)) s = s.replace(new RegExp(`(^|\\s)${k}="[^"]*"`), ""); return s.trim() + x; };
  const P = (d, f, x = "") => `<path d="${d}" fill="${f}" ${sw(x)}/>`;
  const E = (cx, cy, rx, ry, f, x = "") => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}" ${sw(x)}/>`;
  const F = (cx, cy, rx, ry, f, x = "") => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${f}"${x}/>`;
  const line = (d, c = L, w = 2.5) => `<path d="${d}" fill="none" stroke="${c}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  // outlined tube: chocolate stroke under a coloured stroke
  const tube = (d, f, w = 12) => line(d, L, w + 5) + line(d, f, w);
  const mirror = (s) => s + `<g transform="matrix(-1 0 0 1 200 0)">${s}</g>`;
  const rot = (a, cx, cy, s) => `<g transform="rotate(${a} ${cx} ${cy})">${s}</g>`;

  // scalloped (fluffy) ellipse
  function fluff(cx, cy, rx, ry, n, f, bump = 1.18) {
    let d = "";
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2, x = cx + rx * Math.cos(a), y = cy + ry * Math.sin(a);
      if (!i) { d = `M${x.toFixed(0)},${y.toFixed(0)}`; continue; }
      const m = ((i - 0.5) / n) * Math.PI * 2;
      d += ` Q${(cx + rx * bump * Math.cos(m)).toFixed(0)},${(cy + ry * bump * Math.sin(m)).toFixed(0)} ${x.toFixed(0)},${y.toFixed(0)}`;
    }
    return P(d + "Z", f);
  }

  // one sparkly chibi eye (as in mascot face())
  function eye(x, y, r) {
    return F(x, y, r, r * 1.18, "#3a2218") + F(x, y + r * 0.55, r * 0.7, r * 0.4, "#5b4f86", ` opacity=".7"`) +
      `<circle cx="${x - r * 0.32}" cy="${y - r * 0.42}" r="${r * 0.38}" fill="#fff"/><circle cx="${x + r * 0.35}" cy="${y + r * 0.35}" r="${r * 0.16}" fill="#fff"/>`;
  }
  const blush = (x, y, k = 1, c = "#ff8f8f") => F(x, y, 8 * k, 5 * k, c, ` opacity=".85"`);
  const mouth = (cx, y, k = 1) =>
    line(`M${cx - 7 * k},${y} Q${cx - 3.5 * k},${y + 4 * k} ${cx},${y} Q${cx + 3.5 * k},${y + 4 * k} ${cx + 7 * k},${y}`, L, 2.2) +
    `<path d="M${cx - 2.5 * k},${y + 2.3 * k} Q${cx},${y + 7 * k} ${cx + 2.5 * k},${y + 2.3 * k}" fill="#ff7f9e"/>`;
  // full face: eyes centred on (cx,cy)
  function face(cx, cy, k = 1, o = {}) {
    const g = (o.gap || 17) * k;
    let f = blush(cx - g - 12 * k, cy + 13 * k, k) + blush(cx + g + 12 * k, cy + 13 * k, k);
    f += eye(cx - g, cy, 10 * k) + eye(cx + g, cy, 10 * k);
    if (!o.noMouth) f += mouth(cx, cy + 15 * k, k);
    return f;
  }
  const wrap = (name, body, defs = "") =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" class="cryptid" role="img" aria-label="${name}">${defs ? `<defs>${defs}</defs>` : ""}${body}</svg>`;

  // ---------- Rodan: chibi pterosaur kaiju ----------
  C["Rodan"] = () => {
    const wingL = P("M80,128 L12,50 Q20,88 32,100 Q42,94 48,114 Q58,108 64,134 Z", "#f7b07a") +
      line("M80,128 L12,50 M28,72 L32,100 M48,90 L48,114", "#c95f2a");
    let g = mirror(wingL);
    g += P("M94,60 Q112,4 156,16 Q128,30 120,62 Z", "#e3793f");
    g += E(86, 182, 11, 6, "#ffc86b") + E(114, 182, 11, 6, "#ffc86b");
    g += E(100, 150, 30, 30, "#e3793f") + F(100, 158, 18, 20, "#ffe6bf");
    g += E(100, 92, 46, 38, "#e3793f") + line("M62,82 Q64,66 78,58", "#c95f2a", 3);
    g += face(100, 86, 0.95, { noMouth: true });
    g += P("M86,104 Q100,98 114,104 L100,126 Z", "#ffc86b") + line("M93,110 Q100,114 107,110", L, 2);
    return wrap("Rodan", g);
  };

  // ---------- Gargoyle: stone imp on a ledge ----------
  C["Gargoyle"] = () => {
    const wingL = P("M76,124 L30,78 Q34,104 42,110 Q48,104 54,120 Q62,114 66,136 Z", "#a9adc0") +
      line("M76,124 L30,78 M38,96 L42,110 M52,106 L54,120", "#7f849a");
    let g = mirror(wingL);
    g += line("M128,150 C160,150 166,130 156,122", L, 9) + line("M128,150 C160,150 166,130 156,122", "#bfc3cf", 5) + P("M150,126 L156,108 L166,124 Z", "#bfc3cf");
    g += `<rect x="8" y="164" width="184" height="12" rx="4" fill="#e8e0d4" ${SW}/><rect x="16" y="176" width="168" height="20" rx="2" fill="#d6cbbd" ${SW}/>` +
      line("M60,176 L60,196 M110,176 L110,196 M150,176 L150,196", "#a8988a", 2);
    g += E(100, 138, 34, 30, "#bfc3cf");
    g += E(74, 156, 16, 12, "#bfc3cf") + E(126, 156, 16, 12, "#bfc3cf");
    g += line("M64,166 l0,4 M72,166 l0,5 M80,166 l0,4 M120,166 l0,4 M128,166 l0,5 M136,166 l0,4", L, 2.2);
    g += E(88, 140, 8, 7, "#bfc3cf") + E(112, 140, 8, 7, "#bfc3cf");
    g += mirror(P("M60,70 L42,52 L66,58 Z", "#bfc3cf") + P("M76,54 Q70,32 84,34 Q82,44 88,50 Z", "#fff1dc"));
    g += E(100, 88, 46, 38, "#bfc3cf");
    g += [[72, 66, 3], [124, 64, 2.5], [132, 104, 3], [66, 104, 2.5], [118, 130, 3], [100, 152, 2.5]]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#8f94a8"/>`).join("");
    g += face(100, 86, 0.95);
    g += P("M91,101 l3,5 l2,-5 Z M104,101 l2,5 l3,-5 Z", "#fff", ` stroke-width="1.4"`);
    return wrap("Gargoyle", g);
  };

  // ---------- Nessie: plesiosaur with tartan scarf ----------
  C["Nessie"] = () => {
    let g = P("M120,178 C120,138 164,138 164,178 Z", "#8fd18a") + P("M164,180 C164,152 192,152 192,180 Z", "#8fd18a");
    g += P("M60,178 C54,146 62,124 70,100 L104,100 C98,124 92,150 98,178 Z", "#8fd18a") + line("M82,120 C78,140 76,160 78,176", "#c8ecb0", 6);
    g += mirror(line("M72,40 L68,26", L, 3) + `<circle cx="68" cy="24" r="5" fill="#c8ecb0" ${SW}/>`).replace("matrix(-1 0 0 1 200 0)", "matrix(-1 0 0 1 176 0)");
    g += E(88, 72, 46, 38, "#8fd18a") + `<circle cx="64" cy="50" r="4" fill="#6fbf6f"/><circle cx="114" cy="48" r="3" fill="#6fbf6f"/><circle cx="122" cy="58" r="2" fill="#6fbf6f"/>`;
    g += face(88, 70, 0.95);
    g += `<circle cx="84" cy="80" r="1.4" fill="${L}"/><circle cx="92" cy="80" r="1.4" fill="${L}"/>`;
    g += P("M64,108 Q84,118 106,108 L108,122 Q84,132 62,122 Z", "#f07a7a") + P("M94,122 L104,150 L114,146 L106,118 Z", "#f07a7a");
    g += line("M72,112 L70,126 M84,114 L84,128 M96,113 L98,126 M100,132 L109,129 M97,140 L110,136", "#c94a4a", 2) + line("M64,116 Q84,124 106,115", "#fff1dc", 1.6);
    let w = "M8,176";
    for (let x = 8; x < 192; x += 23) w += ` Q${x + 11.5},${x % 46 === 8 ? 168 : 184} ${x + 23},176`;
    g += P(w + " L192,190 Q100,202 8,190 Z", "#9fdcf5") + line("M30,186 q8,-4 16,0 M120,188 q8,-4 16,0", "#fff", 2);
    return wrap("Nessie", g);
  };

  // ---------- Mothra: fluffy moth ----------
  C["Mothra"] = () => {
    const wingL = P("M92,112 C62,62 14,38 8,76 C4,106 40,128 90,126 Z", "#f7a35c") +
      `<circle cx="42" cy="86" r="15" fill="#ffd34d" ${SW}/><circle cx="42" cy="86" r="8" fill="#5cc8c0"/><circle cx="40" cy="83" r="3" fill="#fff"/>` +
      `<circle cx="22" cy="66" r="4" fill="#5cc8c0"/><circle cx="70" cy="76" r="4" fill="#ffd34d"/>` +
      P("M92,130 C60,128 26,148 38,172 C50,190 82,172 94,142 Z", "#ffd34d") +
      `<circle cx="58" cy="158" r="9" fill="#5cc8c0" ${SW}/><circle cx="56" cy="155" r="3" fill="#fff"/>`;
    let g = mirror(wingL);
    g += mirror(line("M90,58 Q80,36 70,26", L, 2.5) + `<ellipse cx="68" cy="26" rx="7" ry="15" transform="rotate(-50 68 26)" fill="#ffe6bf" ${SW}/>` + line("M60,20 L76,32 M60,30 L70,20 M66,34 L76,24", "#e9b77c", 1.6));
    g += E(100, 154, 20, 30, "#fff1dc") + line("M84,150 Q100,156 116,150 M86,164 Q100,170 114,164", "#f39a5b", 3);
    g += fluff(100, 118, 34, 13, 12, "#fff");
    g += fluff(100, 84, 40, 35, 16, "#fff1dc", 1.12);
    g += face(100, 84, 0.95);
    return wrap("Mothra", g);
  };

  // ---------- Kraken: chubby octopus holding a tiny ship ----------
  C["Kraken"] = () => {
    const pk = "#f7a8c8";
    let g = ["M70,124 C52,140 30,148 28,166 C27,182 44,184 44,172", "M84,130 C78,152 62,164 68,180 C72,190 86,186 82,178",
      "M116,130 C122,152 138,164 132,180 C128,190 114,186 118,178", "M130,124 C148,140 170,148 172,166 C173,182 156,184 156,172",
      "M100,132 C100,156 92,172 100,184 C106,192 116,184 110,178", "M140,104 C172,104 182,84 170,72"].map(d => tube(d, pk, 13)).join("");
    g += [[40, 156], [70, 160], [140, 158], [160, 160], [98, 160]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.5" fill="#ffe0ec"/>`).join("");
    g += P("M100,22 C142,22 152,64 152,94 C152,124 130,138 100,138 C70,138 48,124 48,94 C48,64 58,22 100,22 Z", pk);
    g += `<circle cx="72" cy="54" r="6" fill="#c9a3e6"/><circle cx="126" cy="48" r="4" fill="#c9a3e6"/><circle cx="134" cy="66" r="3" fill="#c9a3e6"/><circle cx="86" cy="36" r="3.5" fill="#c9a3e6"/>`;
    g += face(100, 92, 0.95);
    g += line("M171,62 L171,30", L, 2.2) + P("M171,32 L171,58 L156,58 Z", "#fff") + P("M171,30 L182,34 L171,38 Z", "#f07a7a", ` stroke-width="1.6"`);
    g += P("M150,60 L192,60 L184,74 L158,74 Z", "#c98a5a") + line("M156,66 L186,66", "#8a5a3c", 1.6);
    return wrap("Kraken", g);
  };

  // ---------- Poseidon: chibi sea god ----------
  C["Poseidon"] = () => {
    const teal = "#7fd6c8";
    let g = fluff(100, 90, 54, 50, 13, teal);
    g += tube("M166,72 L166,194", "#ffd34d", 5) + tube("M150,70 L150,48 M182,70 L182,48 M166,60 L166,38 M150,70 Q166,80 182,70", "#ffd34d", 4);
    g += P("M146,50 L150,38 L154,50 Z M178,50 L182,38 L186,50 Z M162,40 L166,26 L170,40 Z", "#ffd34d", ` stroke-width="2"`);
    g += P("M62,198 C62,166 78,150 100,150 C122,150 138,166 138,198 Z", "#fff1dc") + line("M84,160 L112,196", "#e9b77c", 3);
    g += E(160, 150, 9, 8, "#ffd9b8");
    g += E(100, 88, 40, 38, "#ffd9b8");
    g += P("M62,96 C60,140 80,168 100,170 C120,168 140,140 138,96 C128,116 114,108 100,112 C86,108 72,116 62,96 Z", teal) +
      line("M82,140 q6,6 12,0 M106,140 q6,6 12,0 M94,156 q6,6 12,0", "#3fa79a", 2.2);
    g += face(100, 80, 0.85, { noMouth: true });
    g += P("M100,104 C92,96 80,100 76,108 C86,106 94,110 100,106 C106,110 114,106 124,108 C120,100 108,96 100,104 Z", "#3fa79a", ` stroke-width="2"`);
    g += P("M93,112 Q100,120 107,112 Z", "#ff7f9e", ` stroke-width="2"`);
    g += P("M62,74 Q70,52 100,52 Q130,52 138,74 Q124,64 112,70 Q100,60 88,70 Q76,64 62,74 Z", teal);
    g += P("M68,58 L70,26 L84,44 L92,20 L100,40 L108,20 L116,44 L130,26 L132,58 Q100,48 68,58 Z", "#ffd34d") +
      `<circle cx="100" cy="46" r="4" fill="#5cc8c0"/><circle cx="84" cy="50" r="2.5" fill="#ff8fb1"/><circle cx="116" cy="50" r="2.5" fill="#ff8fb1"/>`;
    return wrap("Poseidon", g);
  };

  // ---------- Cyclops: one big friendly eye ----------
  C["Cyclops"] = () => {
    const sk = "#b8c6f4";
    let g = P("M150,176 L172,104 Q184,92 190,108 L162,180 Z", "#d9a066") + `<circle cx="180" cy="104" r="2.5" fill="#a8743c"/><circle cx="174" cy="124" r="2" fill="#a8743c"/>`;
    g += E(80, 186, 14, 8, sk) + E(120, 186, 14, 8, sk);
    g += E(100, 162, 34, 26, sk) + P("M68,164 Q100,176 132,164 L128,182 L118,176 L108,184 L98,176 L88,184 L78,176 L70,180 Z", "#d9a066");
    g += `<circle cx="84" cy="174" r="2.5" fill="#a8743c"/><circle cx="114" cy="172" r="2.5" fill="#a8743c"/>`;
    g += E(156, 152, 10, 9, sk) + E(44, 136, 10, 9, sk);
    g += P("M92,44 Q98,14 112,10 Q106,26 110,44 Z", "#fff1dc");
    g += E(100, 88, 54, 48, sk) + line("M54,78 Q58,58 74,48", "#93a4dc", 3);
    g += `<ellipse cx="100" cy="80" rx="26" ry="28" fill="#fff" ${SW}/>` + F(102, 84, 17, 19, "#3a2218") + F(102, 94, 12, 7, "#5b4f86", ` opacity=".7"`) +
      `<circle cx="95" cy="75" r="7" fill="#fff"/><circle cx="108" cy="92" r="3" fill="#fff"/>`;
    g += line("M76,50 Q100,40 124,50", L, 3);
    g += blush(64, 104) + blush(136, 104);
    g += P("M84,112 Q100,128 116,112 Z", "#c0506e") + P("M95,113 L95,119 L102,119 L102,113 Z", "#fff", ` stroke-width="1.6"`);
    return wrap("Cyclops", g);
  };

  // ---------- Jabberwock: whimsical purple beast in a waistcoat ----------
  C["Jabberwock"] = () => {
    const pu = "#b9a0ea";
    const wingL = P("M80,148 L42,112 Q46,132 52,136 Q58,130 62,144 Q68,140 70,158 Z", "#a8e0c4") + line("M80,148 L42,112", "#6fbf98");
    let g = mirror(wingL);
    g += line("M74,172 C50,182 34,170 30,154", L, 9) + line("M74,172 C50,182 34,170 30,154", pu, 5) + P("M30,140 L22,156 L36,158 Z", "#ff8fb1");
    g += E(84, 188, 12, 7, pu) + E(116, 188, 12, 7, pu);
    g += E(100, 162, 32, 27, pu);
    g += P("M70,152 Q68,182 100,188 Q132,182 130,152 L114,140 L100,166 L86,140 Z", "#ffd34d") + P("M86,140 L100,166 L114,140 Z", "#fff1dc");
    g += `<circle cx="100" cy="174" r="2.5" fill="${L}"/><circle cx="100" cy="182" r="2.5" fill="${L}"/>` + P("M90,138 L100,144 L110,138 L110,150 L100,144 L90,150 Z", "#ff8fb1", ` stroke-width="2"`);
    g += P("M88,142 C82,118 92,102 100,88 L124,90 C114,106 108,122 112,142 Z", pu);
    g += line("M96,40 Q84,24 90,10", L, 2.5) + line("M120,40 Q134,24 128,10", L, 2.5) + `<circle cx="90" cy="10" r="5" fill="#ffd34d" ${SW}/><circle cx="128" cy="10" r="5" fill="#ffd34d" ${SW}/>`;
    g += E(108, 64, 44, 34, pu);
    g += line("M66,74 L44,68 M66,80 L46,84 M150,74 L172,68 M150,80 L170,84", L, 2);
    g += face(108, 60, 0.9, { noMouth: true });
    g += line("M98,78 Q108,84 118,78", L, 2.4) + P("M102,80 L102,88 L108,88 L108,81 Z M108,81 L108,88 L114,88 L114,80 Z", "#fff", ` stroke-width="1.6"`);
    return wrap("Jabberwock", g);
  };

  // ---------- Demogorgon: flower-head made adorable ----------
  C["Demogorgon"] = (id = "d") => {
    const gid = `petal-${id}`;
    const defs = `<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="-56"><stop offset=".3" stop-color="#fff1dc"/><stop offset=".7" stop-color="#ffc2d4"/><stop offset="1" stop-color="#ff8fb1"/></linearGradient>`;
    const sk = "#cfd3ea";
    let g = tube("M84,170 L80,188", sk, 11) + tube("M116,170 L120,188", sk, 11);
    g += tube("M76,140 C60,150 54,164 52,176", sk, 9) + tube("M124,140 C140,150 146,164 148,176", sk, 9);
    g += E(100, 154, 28, 26, sk) + line("M90,146 Q100,150 110,146 M92,158 Q100,162 108,158", "#a9aed0", 2);
    g += P("M92,126 L108,126 L106,136 L94,136 Z", sk);
    for (let i = 0; i < 5; i++)
      g += `<path d="M0,0 C-30,-12 -26,-50 0,-58 C26,-50 30,-12 0,0 Z" transform="translate(100 80) rotate(${i * 72})" fill="url(#${gid})" ${SW}/>`;
    g += `<circle cx="100" cy="80" r="31" fill="#ffe6ee" ${SW}/>`;
    g += face(100, 74, 0.75, { noMouth: true, gap: 18 });
    g += P("M88,90 Q100,104 112,90 Z", "#e0607e", ` stroke-width="2"`) + P("M91,91 l3,4 l3,-4 Z M103,91 l3,4 l3,-4 Z", "#fff", ` stroke-width="1"`);
    return wrap("Demogorgon", g, defs);
  };

  // ---------- Medusa: snake hair + heart sunglasses ----------
  C["Medusa"] = () => {
    const snakes = [
      ["M70,70 C52,64 40,72 28,60", 26, 58, "#8fd18a"], ["M80,58 C64,44 58,30 44,22", 42, 20, "#6fc7a8"],
      ["M94,52 C88,36 96,22 84,10", 82, 9, "#b5e08a"], ["M106,52 C112,36 104,22 116,10", 118, 9, "#8fd18a"],
      ["M120,58 C136,44 142,30 156,22", 158, 20, "#6fc7a8"], ["M130,70 C148,64 160,72 172,60", 174, 58, "#b5e08a"],
    ];
    let g = "";
    for (const [d, x, y, c] of snakes)
      g += tube(d, c, 9) + E(x, y, 8, 8, c) + `<circle cx="${x - 3}" cy="${y - 1}" r="1.7" fill="${L}"/><circle cx="${x + 3}" cy="${y - 1}" r="1.7" fill="${L}"/>`;
    g += P("M64,200 C64,160 80,140 100,140 C120,140 136,160 136,200 Z", "#fff1dc") + line("M68,176 Q100,186 132,176", "#ffd34d", 4) + P("M90,128 L110,128 L108,146 Q100,150 92,146 Z", "#ffdcc4");
    g += E(100, 96, 42, 40, "#ffdcc4");
    g += P("M60,84 Q66,58 100,56 Q134,58 140,84 Q122,70 100,74 Q78,70 60,84 Z", "#8fd18a");
    const heart = (x, y, s) => `M${x},${y + s * 0.8} C${x - s * 1.3},${y - s * 0.1} ${x - s * 0.7},${y - s} ${x},${y - s * 0.4} C${x + s * 0.7},${y - s} ${x + s * 1.3},${y - s * 0.1} ${x},${y + s * 0.8} Z`;
    g += line("M66,92 L58,88 M134,92 L142,88 M93,92 Q100,88 107,92", "#ff7fa8", 3);
    g += P(heart(80, 94, 17), "#3d2d4d", ` stroke="#ff7fa8" stroke-width="3.5"`) + P(heart(120, 94, 17), "#3d2d4d", ` stroke="#ff7fa8" stroke-width="3.5"`);
    g += line("M70,88 l6,-4 M110,88 l6,-4", "#fff", 2.6);
    g += blush(66, 114) + blush(134, 114) + mouth(100, 118, 0.9);
    return wrap("Medusa", g);
  };

  // ---------- Brewers Lounge: beer stein mascot ----------
  C["Brewers Lounge"] = () => {
    let g = tube("M144,100 C178,100 178,156 144,156", "#e7e9f2", 10);
    g += E(80, 188, 12, 7, "#c98a3a") + E(120, 188, 12, 7, "#c98a3a");
    g += `<rect x="54" y="76" width="92" height="108" rx="14" fill="#ffc34d" ${SW}/>`;
    g += `<rect x="64" y="96" width="8" height="70" rx="4" fill="#ffe08a"/>` +
      `<circle cx="126" cy="160" r="3" fill="#fff6d0"/><circle cx="132" cy="146" r="2" fill="#fff6d0"/><circle cx="122" cy="172" r="2" fill="#fff6d0"/>`;
    g += `<rect x="52" y="170" width="96" height="14" rx="6" fill="#e7e9f2" ${SW}/>`;
    g += fluff(100, 72, 54, 22, 11, "#fffaf0", 1.2) + P("M70,86 Q70,100 76,100 Q82,100 80,88 Z M118,88 Q118,104 125,104 Q132,104 130,88 Z", "#fffaf0");
    g += face(100, 124, 0.95);
    g += E(46, 138, 9, 8, "#ffc34d");
    return wrap("Brewers Lounge", g);
  };

  // ---------- Volunteer: helpful mint blob ----------
  C["Volunteer"] = () => {
    let g = E(80, 186, 13, 7, "#a8e0c4") + E(120, 186, 13, 7, "#a8e0c4");
    g += P("M100,42 C146,42 160,90 160,128 C160,168 136,186 100,186 C64,186 40,168 40,128 C40,90 54,42 100,42 Z", "#a8e0c4");
    g += line("M50,110 Q52,78 70,60", "#6fbf98", 3);
    g += P("M58,70 Q60,30 100,30 Q140,30 142,70 Q100,58 58,70 Z", "#f39a5b") + P("M120,66 Q150,62 170,72 Q150,80 128,74 Z", "#f39a5b") + `<circle cx="100" cy="30" r="5" fill="#ffd34d" ${SW}/>`;
    g += face(100, 96, 0.95);
    g += line("M70,124 L100,148 L130,124", "#f39a5b", 4);
    g += `<rect x="86" y="144" width="28" height="30" rx="4" fill="#fff" ${SW}/>` + P("M100,150 l2.6,5.4 6,.8 -4.3,4.2 1,5.9 -5.3,-2.8 -5.3,2.8 1,-5.9 -4.3,-4.2 6,-.8 Z", "#ffd34d", ` stroke-width="1.4"`);
    g += `<rect x="130" y="118" width="44" height="56" rx="5" fill="#c98a5a" ${SW}/><rect x="136" y="126" width="32" height="42" fill="#fff" stroke="${L}" stroke-width="1.6"/>` +
      `<rect x="144" y="113" width="16" height="9" rx="2" fill="#ffd34d" ${SW}/>` + line("M140,136 l3,3 5,-6 M152,136 L164,136 M140,148 l3,3 5,-6 M152,148 L164,148 M152,160 L164,160", L, 2);
    g += E(132, 150, 9, 8, "#a8e0c4") + E(52, 140, 9, 8, "#a8e0c4");
    return wrap("Volunteer", g);
  };

  if (typeof module !== "undefined") module.exports = C;
})(typeof window !== "undefined" ? window : globalThis);
