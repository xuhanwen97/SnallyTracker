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

  // ── Snallygaster: crowned dragon-bird, feathery wings, beak, curly chin tentacles ──
  C.snallygaster = (id) => {
    let g = "";
    // feathered wings
    g += mirror(`<path d="M76,122 C64,104 42,94 24,98 Q12,106 24,113 Q12,121 26,128 Q18,138 34,140 Q32,150 50,147 Q64,146 78,144 Z" fill="#a8e0c4" ${O}/>` +
      `<path d="M70,124 C56,114 40,112 30,113 M70,132 C58,128 44,128 34,129 M72,140 C62,138 54,140 46,142" fill="none" stroke="#6fbf98" stroke-width="2.2" stroke-linecap="round"/>`);
    // body, belly, feet
    g += `<ellipse cx="100" cy="154" rx="36" ry="30" fill="#f39a5b" ${O}/><ellipse cx="100" cy="160" rx="22" ry="19" fill="#ffe6bf"/>`;
    g += mirror(`<ellipse cx="83" cy="184" rx="13" ry="6.5" fill="#ffc86b" ${O}/>`);
    // curly tentacles under chin
    g += tube("M86,122 C80,140 94,144 88,156 C85,162 79,158 82,153", "#ff9fb5", 6) +
      tube("M114,122 C120,140 106,144 112,156 C115,162 121,158 118,153", "#ff9fb5", 6) +
      tube("M100,124 C100,142 106,150 100,162 C97,167 92,163 95,159", "#ffb8c8", 6);
    // head
    g += `<ellipse cx="100" cy="88" rx="50" ry="42" fill="#f39a5b" ${O}/><path d="M58,82 Q58,62 76,52" fill="none" stroke="#e07b3c" stroke-width="3" stroke-linecap="round"/>`;
    // crown
    g += `<g transform="rotate(-8 100 46)"><path d="M76,54 L70,22 L87,38 L100,16 L113,38 L130,22 L124,54 Z" fill="#ffd34d" stroke="#c9961a" stroke-width="2.5" stroke-linejoin="round"/>` +
      `<path d="M77,48 L123,48" stroke="#c9961a" stroke-width="2"/>` +
      `<circle cx="70" cy="22" r="3.5" fill="#fff2a8" stroke="#c9961a" stroke-width="1.5"/><circle cx="100" cy="16" r="4" fill="#fff2a8" stroke="#c9961a" stroke-width="1.5"/><circle cx="130" cy="22" r="3.5" fill="#fff2a8" stroke="#c9961a" stroke-width="1.5"/>` +
      `<circle cx="100" cy="40" r="5" fill="#ff5d8f" stroke="#a8325b" stroke-width="1.5"/><circle cx="85" cy="43" r="3" fill="#5dd6ff"/><circle cx="115" cy="43" r="3" fill="#5dd6ff"/></g>`;
    g += face(100, 84, 1, { nose: false, mouth: false });
    // little beak + smile
    g += `<path d="M90,96 Q100,91 110,96 Q105,104 100,107 Q95,104 90,96 Z" fill="#ffc86b" ${O} stroke-width="2.2"/>` +
      `<path d="M95,104 Q100,111 105,104" fill="#ff7f9e" ${O} stroke-width="2"/>`;
    return svg("Snallygaster", g);
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

  if (typeof module !== "undefined") module.exports = C;
})(typeof window !== "undefined" ? window : globalThis);
