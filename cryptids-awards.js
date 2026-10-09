// Award cryptids: chibi SVG avatars for the leaderboard awards.
// Same style as mascot.js: viewBox 0 0 200 200, flat pastel fills, chocolate outline,
// huge head, tiny body, big sparkly eyes, blush and a tiny happy mouth.
// Usage: CRYPTIDS.snallygaster(id) → "<svg ...>"  (id prefixes any def ids)
(function (root) {
  const C = root.CRYPTIDS = root.CRYPTIDS || {};
  const L = "#5a3220";
  const O = `stroke="${L}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"`;
  const svg = (name, body) =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" class="cryptid" role="img" aria-label="${name}">${body}</svg>`;

  // Chibi face (same as mascot.js face()): two sparkly eyes, blush, optional nose + mouth.
  function face(cx, cy, k = 1, o = {}) {
    const ex = 17 * k, ey = cy + 2 * k, r = 10 * k;
    let f = [-1, 1].map(s => `<ellipse cx="${cx + s * 30 * k}" cy="${cy + 14 * k}" rx="${8 * k}" ry="${5 * k}" fill="#ff8f8f" opacity=".85"/>`).join("");
    for (const s of [-1, 1]) {
      const x = cx + s * ex;
      f += `<ellipse cx="${x}" cy="${ey}" rx="${r}" ry="${r * 1.18}" fill="#3a2218"/>` +
        `<ellipse cx="${x}" cy="${ey + r * .55}" rx="${r * .7}" ry="${r * .4}" fill="#5b4f86" opacity=".7"/>` +
        `<circle cx="${x - r * .32}" cy="${ey - r * .42}" r="${r * .38}" fill="#fff"/><circle cx="${x + r * .35}" cy="${ey + r * .35}" r="${r * .16}" fill="#fff"/>`;
    }
    if (o.nose !== false) f += `<circle cx="${cx - 4 * k}" cy="${cy + 12 * k}" r="${1.4 * k}" fill="${L}"/><circle cx="${cx + 4 * k}" cy="${cy + 12 * k}" r="${1.4 * k}" fill="${L}"/>`;
    if (o.mouth !== false) f += `<path d="M${cx - 7 * k},${cy + 17 * k} Q${cx - 3.5 * k},${cy + 21 * k} ${cx},${cy + 17 * k} Q${cx + 3.5 * k},${cy + 21 * k} ${cx + 7 * k},${cy + 17 * k}" fill="none" stroke="${L}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<path d="M${cx - 2.5 * k},${cy + 19.3 * k} Q${cx},${cy + 24 * k} ${cx + 2.5 * k},${cy + 19.3 * k}" fill="#ff7f9e"/>`;
    return f;
  }
  // Outlined thick stroke (horns, tentacles): brown under-stroke, colored over-stroke.
  const tube = (d, col, w) => `<path d="${d}" fill="none" stroke="${L}" stroke-width="${w + 5}" stroke-linecap="round"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linecap="round"/>`;
  const flame = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0,8 C-12,2 -9,-12 -3,-20 C-2,-12 4,-12 2,-24 C14,-14 13,2 0,8 Z" fill="#ff9f43" ${O} stroke-width="${2 / s}"/><path d="M0,6 C-6,2 -5,-6 -1,-11 C0,-6 4,-6 3,-13 C9,-6 7,2 0,6 Z" fill="#ffe066"/></g>`;
  const mirror = (g) => g + `<g transform="matrix(-1 0 0 1 200 0)">${g}</g>`;

  // Rounded dorsal plate pointing "up" in local coords, at (x,y) rotated a degrees (wrap in a filled, outlined <g>).
  const plate = (x, y, a, s) => `<path transform="translate(${x} ${y}) rotate(${a}) scale(${s})" d="M-9,6 C-10,-4 -5,-13 0,-17 C5,-13 10,-4 9,6 Z"/>`;

  // ── Snallygaster: festival mascot, a chibi orange kaiju going "rawr", crowned overall winner ──
  C.snallygaster = (id) => {
    const B = "#f08a4b", K = "#ffe6bf", M = "#a8e0c4";
    let g = "";
    // thick tail curling behind (right), with plates along its top
    g += `<g fill="${M}" ${O}>` + plate(150, 140, 62, .8) + plate(166, 126, 30, .7) + plate(178, 112, 8, .6) + `</g>`;
    g += `<path d="M118,168 C140,170 164,160 172,144 C178,132 186,120 180,106 C176,98 166,100 168,108 C172,118 158,128 148,134 C136,142 124,144 112,146 Z" fill="${B}" ${O}/>`;
    // dorsal plates peeking behind head + back (left side, then over the top)
    g += `<g fill="${M}" ${O}>` + plate(42, 130, -112, .9) + plate(40, 104, -95, 1) + plate(46, 76, -72, 1.05) + plate(62, 52, -48, 1) + plate(84, 40, -22, .85) + `</g>`;
    // stubby legs with white claws
    g += mirror(`<ellipse cx="80" cy="178" rx="15" ry="13" fill="${B}" ${O}/>` +
      `<path d="M70,188 l3,-6 l3,6 Z M78,189 l3,-6 l3,6 Z M86,188 l3,-6 l3,6 Z" fill="#fff" stroke="${L}" stroke-width="1.5" stroke-linejoin="round"/>`);
    // chunky body + cream belly with stripes
    g += `<ellipse cx="100" cy="150" rx="38" ry="32" fill="${B}" ${O}/><ellipse cx="100" cy="156" rx="24" ry="22" fill="${K}"/>` +
      `<path d="M84,152 Q100,157 116,152 M86,164 Q100,169 114,164" fill="none" stroke="#f3c48e" stroke-width="2.2" stroke-linecap="round"/>`;
    // tiny raised arms with claws (rawr!)
    g += mirror(`<path d="M70,156 C56,154 46,144 46,132 C46,125 55,123 58,130 C60,137 66,142 74,143 Z" fill="${B}" ${O}/>` +
      `<path d="M42,130 l4,-7 l3,7 Z M50,126 l5,-6 l2,7 Z" fill="#fff" stroke="${L}" stroke-width="1.5" stroke-linejoin="round"/>`);
    // big head
    g += `<ellipse cx="100" cy="86" rx="52" ry="44" fill="${B}" ${O}/>`;
    // tilted gold crown with gems
    g += `<g transform="rotate(12 112 44)"><path d="M92,50 L88,26 L101,38 L112,20 L123,38 L136,26 L132,50 Z" fill="#ffd34d" stroke="#c9961a" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<path d="M93,45 L131,45" stroke="#c9961a" stroke-width="2"/><circle cx="88" cy="26" r="3" fill="#fff2a8" stroke="#c9961a" stroke-width="1.5"/><circle cx="112" cy="20" r="3.5" fill="#fff2a8" stroke="#c9961a" stroke-width="1.5"/><circle cx="136" cy="26" r="3" fill="#fff2a8" stroke="#c9961a" stroke-width="1.5"/>` +
      `<circle cx="112" cy="38" r="4.2" fill="#ff5d8f" stroke="#a8325b" stroke-width="1.5"/><circle cx="99" cy="41" r="2.6" fill="#5dd6ff"/><circle cx="125" cy="41" r="2.6" fill="#5dd6ff"/></g>`;
    g += face(100, 80, 1, { nose: false, mouth: false });
    // furrowed angry-cute brows + nostrils
    g += `<path d="M70,62 Q80,64 91,70 M130,62 Q120,64 109,70" fill="none" stroke="${L}" stroke-width="4" stroke-linecap="round"/>` +
      `<circle cx="95" cy="96" r="1.6" fill="${L}"/><circle cx="105" cy="96" r="1.6" fill="${L}"/>`;
    // open toothy grin: dark mouth, pink tongue, tiny triangle teeth
    g += `<path d="M80,101 Q100,106 120,101 Q116,122 100,122 Q84,122 80,101 Z" fill="#7a2e2e" ${O}/>` +
      `<path d="M88,117 Q100,108 112,117 Q106,121 100,121 Q94,121 88,117 Z" fill="#ff7f9e"/>` +
      `<path d="M83,102.5 l3.5,6 l3.5,-5 Z M110,103.5 l3.5,5 l3.5,-6 Z M95,104.5 l2.5,4.5 l2.5,-4.5 Z M100,104.5 l2.5,4.5 l2.5,-4.5 Z" fill="#fff" stroke="${L}" stroke-width="1.2" stroke-linejoin="round"/>`;
    return svg("Snallygaster", g);
  };

  // ── Potomac Gulper: giant mutant river catfish, hook in lip, sipping a glowing toxic-green stout ──
  C.gulper = (id) => {
    const B = "#8c9a5b", D = "#6f7d44", K = "#dfe3b0", G = "#9dff5a";
    let g = "";
    // faint toxic aura
    g += `<ellipse cx="96" cy="112" rx="86" ry="72" fill="${G}" opacity=".25"/>`;
    // fishing line + tail fin behind
    g += `<path d="M44,124 Q30,60 6,8" fill="none" stroke="#8fb4d8" stroke-width="2"/>`;
    g += `<path d="M150,90 L182,62 Q190,90 178,104 Q190,118 182,146 L150,122 Z" fill="${D}" ${O}/>`;
    // dorsal fin
    g += `<path d="M76,58 Q92,30 118,40 Q126,46 124,58 Z" fill="${D}" ${O}/>`;
    // round body + belly
    g += `<ellipse cx="96" cy="112" rx="66" ry="58" fill="${B}" ${O}/><path d="M42,128 Q96,180 150,128 Q144,166 96,170 Q48,166 42,128 Z" fill="${K}"/>` ;
    // glowing mutant spots
    for (const [x, y, r] of [[60, 80, 4.5], [138, 78, 4], [146, 102, 3], [54, 106, 3]])
      g += `<circle cx="${x}" cy="${y}" r="${r * 1.9}" fill="${G}" opacity=".35"/><circle cx="${x}" cy="${y}" r="${r}" fill="${G}"/>`;
    // tiny third eye
    g += `<ellipse cx="96" cy="64" rx="5.5" ry="6.5" fill="#3a2218"/><circle cx="94.5" cy="62" r="2" fill="#fff"/><path d="M89,57 Q96,53 103,57" fill="none" stroke="${L}" stroke-width="2" stroke-linecap="round"/>`;
    g += face(96, 86, 1, { nose: false, mouth: false });
    // wide grinning catfish mouth
    g += `<path d="M58,112 Q96,124 134,112 Q128,138 96,138 Q64,138 58,112 Z" fill="#6b3a2a" ${O}/>` +
      `<path d="M74,132 Q96,120 118,132 Q108,138 96,138 Q84,138 74,132 Z" fill="#ff7f9e"/>`;
    // droopy curly whiskers
    g += tube("M60,112 C40,112 26,124 24,142 C22,156 34,158 36,148", D, 3.5) +
      tube("M132,112 C152,112 166,126 166,146 C166,160 154,160 154,150", D, 3.5) +
      tube("M70,118 C58,128 54,146 60,160 C64,168 72,164 70,158", D, 3) +
      tube("M122,118 C134,128 138,144 132,158 C128,166 120,162 122,156", D, 3);
    // hook caught in lip (left), with line
    g += `<path d="M46,96 L46,118 Q46,126 54,126 Q61,126 61,118" fill="none" stroke="${L}" stroke-width="5" stroke-linecap="round"/><path d="M46,96 L46,118 Q46,126 54,126 Q61,126 61,118" fill="none" stroke="#d6dde6" stroke-width="2.4" stroke-linecap="round"/><circle cx="46" cy="94" r="3" fill="#fff" stroke="${L}" stroke-width="1.5"/>`;
    // side fin holding a mug of bubbling, glowing green imperial stout + straw
    g += `<path d="M180,140 Q194,140 194,156 Q194,172 180,172" fill="none" stroke="${L}" stroke-width="7" stroke-linecap="round"/><path d="M180,140 Q194,140 194,156 Q194,172 180,172" fill="none" stroke="#d9f2ff" stroke-width="3" stroke-linecap="round"/>` +
      `<path d="M128,126 L156,96 L162,100" fill="none" stroke="${L}" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M128,126 L156,96 L162,100" fill="none" stroke="#ff8fb0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<rect x="146" y="124" width="36" height="56" rx="7" fill="#57d92e" ${O}/><path d="M156,138 L156,170 M168,138 L168,170" stroke="#b6ff7a" stroke-width="3.5" stroke-linecap="round"/>` +
      `<circle cx="162" cy="152" r="3" fill="#d9ffb0"/><circle cx="159" cy="166" r="2.2" fill="#d9ffb0"/>` +
      `<path d="M143,128 Q144,114 154,118 Q160,110 168,116 Q178,110 184,122 Q186,128 184,130 Z" fill="#d9ffb0" ${O}/>` +
      `<circle cx="176" cy="104" r="4" fill="#d9ffb0" ${O} stroke-width="1.8"/><circle cx="184" cy="92" r="2.6" fill="#d9ffb0" ${O} stroke-width="1.5"/>` +
      `<path d="M150,150 Q138,146 136,158 Q138,170 152,164 Z" fill="${D}" ${O}/>`;
    // bubbles
    g += `<circle cx="28" cy="40" r="6" fill="#e3f6ff" opacity=".8" stroke="#6fb4d8" stroke-width="1.5"/>`;
    return svg("Potomac Gulper", g);
  };

  // ── Chessie: friendly sea serpent in a sailor hat, humps in wavy water ──
  C.chessie = (id) => {
    const B = "#8fdcc8", D = "#5fbfa6";
    let g = "";
    // humps + tail
    g += `<path d="M120,168 C120,124 160,124 160,168 Z" fill="${B}" ${O}/>` +
      `<path d="M166,168 C166,140 182,138 186,122 L196,118 L190,134 C188,146 188,156 190,168 Z" fill="${B}" ${O}/>` +
      `<circle cx="132" cy="146" r="4" fill="${D}"/><circle cx="146" cy="140" r="5" fill="${D}"/><circle cx="148" cy="156" r="3.5" fill="${D}"/><circle cx="176" cy="152" r="3" fill="${D}"/>`;
    // neck
    g += `<path d="M56,172 C52,142 62,124 70,112 L110,114 C100,132 96,152 100,172 Z" fill="${B}" ${O}/>` +
      `<path d="M74,170 C72,148 78,132 86,120 L100,122 C92,136 88,152 90,170 Z" fill="#e6fff4"/>`;
    // ear fins
    g += mirror(`<path d="M44,76 L18,62 L24,76 L14,84 L26,88 L20,100 L46,94 Z" fill="${D}" ${O}/>`);
    // head
    g += `<ellipse cx="100" cy="86" rx="52" ry="40" fill="${B}" ${O}/>` +
      `<circle cx="66" cy="62" r="5" fill="${D}"/><circle cx="138" cy="66" r="4" fill="${D}"/><circle cx="76" cy="54" r="3" fill="${D}"/>`;
    g += face(100, 84, 1);
    // sailor (dixie cup) hat
    g += `<g transform="rotate(14 112 44)"><path d="M90,48 Q88,22 112,20 Q136,22 134,48 Z" fill="#fff" ${O}/>` +
      `<path d="M82,48 Q112,38 142,48 Q144,58 112,56 Q80,58 82,48 Z" fill="#fff" ${O}/>` +
      `<path d="M86,50 Q112,44 138,50" fill="none" stroke="#4a6fb8" stroke-width="3" stroke-linecap="round"/></g>`;
    // water
    g += `<path d="M10,168 Q22,158 34,168 T58,168 T82,168 T106,168 T130,168 T154,168 T178,168 Q192,162 192,174 Q190,190 160,192 L40,192 Q10,190 8,176 Q8,170 10,168 Z" fill="#9fd8f2" ${O}/>` +
      `<path d="M30,180 Q40,175 50,180 M86,182 Q96,177 106,182 M140,180 Q150,175 160,180" fill="none" stroke="#e3f6ff" stroke-width="3" stroke-linecap="round"/>` +
      `<circle cx="22" cy="150" r="4" fill="#e3f6ff" stroke="#6fb4d8" stroke-width="1.5"/><circle cx="30" cy="140" r="2.5" fill="#e3f6ff" stroke="#6fb4d8" stroke-width="1.2"/>`;
    return svg("Chessie", g);
  };

  // ── Goatman: fluffy goat kid with curly horns, beard tuft and a flaming beer ──
  C.goatman = (id) => {
    const F = "#fff6ea", H = "#e9c08c";
    const fluff = [[60, 72, 14], [76, 56, 14], [100, 50, 15], [124, 56, 14], [140, 72, 14], [146, 96, 12], [54, 96, 12]];
    let g = "";
    // ears + horns (behind head)
    g += mirror(`<ellipse cx="44" cy="96" rx="20" ry="9" transform="rotate(18 44 96)" fill="${F}" ${O}/><ellipse cx="42" cy="96" rx="12" ry="4.5" transform="rotate(18 44 96)" fill="#ffb7c9"/>`);
    g += mirror(tube("M82,54 C72,26 40,30 42,52 C44,66 62,64 60,52", H, 8) + `<path d="M74,40 l-6,4 M62,34 l-2,6 M50,40 l4,4" stroke="#c99a5e" stroke-width="2" stroke-linecap="round"/>`);
    // hoodie body + hooves
    g += mirror(`<ellipse cx="84" cy="184" rx="11" ry="7" fill="#8a5a3c" ${O}/>`);
    g += `<ellipse cx="100" cy="158" rx="36" ry="28" fill="#ff9b7a" ${O}/><path d="M86,140 Q100,150 114,140" fill="none" stroke="#e07b5c" stroke-width="2.5" stroke-linecap="round"/>`;
    g += flame(92, 168, .55);
    // flaming beer mug + hoof
    g += `<path d="M162,140 Q176,140 176,152 Q176,164 162,164" fill="none" stroke="${L}" stroke-width="7" stroke-linecap="round"/><path d="M162,140 Q176,140 176,152 Q176,164 162,164" fill="none" stroke="#ffe6bf" stroke-width="3" stroke-linecap="round"/>` +
      `<rect x="134" y="132" width="30" height="40" rx="6" fill="#ffb648" ${O}/><path d="M142,142 L142,164 M152,142 L152,164" stroke="#ffd98a" stroke-width="3" stroke-linecap="round"/>` +
      flame(149, 124, 1.15) +
      `<path d="M132,134 Q134,124 142,128 Q148,120 156,128 Q164,124 166,134 Z" fill="#fff" ${O}/>` +
      `<ellipse cx="134" cy="154" rx="9" ry="8" fill="${F}" ${O}/>`;
    // fluffy head: outlined puffs, then fill pass to hide inner lines
    const puffs = (d) => `<ellipse cx="100" cy="92" rx="${46 - d}" ry="${40 - d}"/>` + fluff.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r - d}"/>`).join("");
    g += `<g fill="${F}" ${O}>${puffs(0)}</g><g fill="${F}">${puffs(2)}</g>`;
    g += face(100, 90, 1);
    // beard tuft
    g += `<path d="M86,124 Q86,140 94,152 Q98,146 100,154 Q102,146 106,152 Q114,140 114,124 Q100,132 86,124 Z" fill="${F}" ${O}/>`;
    return svg("Goatman", g);
  };

  // ── Bunnyman: kid in a fluffy bunny suit with a floppy ear and a lite juice box ──
  C.bunnyman = (id) => {
    const S = "#ece4ff", P = "#ffb7c9";
    let g = "";
    // ears: one up, one flopped
    g += `<g transform="rotate(-12 76 58)"><ellipse cx="76" cy="34" rx="15" ry="34" fill="${S}" ${O}/><ellipse cx="76" cy="36" rx="7" ry="24" fill="${P}"/></g>`;
    g += `<path d="M114,62 C116,24 150,14 166,32 C176,44 164,56 152,48 C142,42 132,48 130,66 Z" fill="${S}" ${O}/><path d="M122,56 C126,32 146,24 158,34 C162,40 156,44 150,40 C140,36 132,42 130,56 Z" fill="${P}"/>`;
    // body, tail, slippers
    g += `<circle cx="138" cy="170" r="10" fill="#fff" ${O}/>`;
    g += `<ellipse cx="100" cy="160" rx="34" ry="27" fill="${S}" ${O}/><ellipse cx="100" cy="164" rx="20" ry="17" fill="#fff"/>` +
      `<path d="M94,150 l6,6 l6,-6" fill="none" stroke="#c9b8f0" stroke-width="2" stroke-linecap="round"/>`;
    g += mirror(`<ellipse cx="82" cy="185" rx="14" ry="7" fill="${S}" ${O}/><ellipse cx="78" cy="181" rx="3" ry="4" fill="${P}"/><ellipse cx="86" cy="181" rx="3" ry="4" fill="${P}"/>`);
    // hood + face opening
    g += `<ellipse cx="100" cy="98" rx="52" ry="46" fill="${S}" ${O}/><ellipse cx="100" cy="106" rx="38" ry="32" fill="#ffdcbf" ${O}/>` +
      `<path d="M78,82 Q86,90 94,80 Q100,90 108,80 Q116,90 124,82 Q114,72 100,74 Q86,74 78,82 Z" fill="#8a5a3c" ${O} stroke-width="2"/>`;
    g += face(100, 104, .88);
    // cheeky brows
    g += `<path d="M78,90 L91,93 M122,90 L109,93" stroke="${L}" stroke-width="2.6" stroke-linecap="round"/>`;
    // lite juice box + paw
    g += `<g transform="rotate(-8 58 150)"><path d="M62,128 L68,108 L74,110" fill="none" stroke="${L}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M62,128 L68,108 L74,110" fill="none" stroke="#ff8fb0" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
      `<rect x="44" y="128" width="28" height="36" rx="4" fill="#a8e0c4" ${O}/><rect x="47" y="140" width="22" height="11" rx="2" fill="#fff1dc"/>` +
      `<text x="58" y="149" font-family="system-ui,sans-serif" font-size="8.5" font-weight="800" text-anchor="middle" fill="#5a3220">LITE</text>` +
      `<circle cx="51" cy="134" r="2" fill="#fff"/></g>` +
      `<ellipse cx="74" cy="152" rx="9" ry="8" fill="${S}" ${O}/>`;
    return svg("Bunnyman", g);
  };

  // Some shapes add a stroke override after the shared outline attrs, which repeats an attribute on one tag.
  // Browsers keep the FIRST copy (dropping the override) and strict SVG parsers reject it, so keep the LAST copy.
  const dedupeAttrs = (svg) => svg.replace(/<([a-zA-Z][\w:-]*)((?:\s+[\w:-]+="[^"]*")+)\s*(\/?)>/g, (m, tag, attrs, close) => {
    const seen = new Map();
    for (const [, k, v] of attrs.matchAll(/\s+([\w:-]+)="([^"]*)"/g)) { seen.delete(k); seen.set(k, v); }
    return `<${tag}${[...seen].map(([k, v]) => ` ${k}="${v}"`).join("")}${close ? "/" : ""}>`;
  });
  for (const k of ["snallygaster", "chessie", "gulper", "goatman", "bunnyman"]) {
    const f = C[k];
    if (typeof f === "function") C[k] = (id) => dedupeAttrs(f(id));
  }

  if (typeof module !== "undefined") module.exports = C;
})(typeof window !== "undefined" ? window : globalThis);
