// SnallyTally: pour logger + leaderboard. Vanilla JS, no build step.
// All backend traffic goes through api(action, payload). With an empty API_URL that
// function routes to Mock (a localStorage fake of the Apps Script backend) instead.
(() => {
  "use strict";

  const CFG = Object.assign({ API_URL: "", REFRESH_MS: 20000 }, window.SNALLY_CONFIG || {});
  const API_URL = String(CFG.API_URL || "").trim();
  const DEMO = !API_URL;
  const REFRESH_MS = Math.max(5000, +CFG.REFRESH_MS || 20000);
  const LORE = window.SNALLY_LORE || { awards: {}, tents: {}, ratings: [] };
  const SIZES = { small: { oz: 2, label: "Small" }, standard: { oz: 4, label: "Standard" }, brim: { oz: 5.5, label: "To the Brim" }, custom: { oz: null, label: "Custom" } };
  const MAX_OZ = 5.5, MIN_AVG_POURS = 7, UNDO_MS = 10 * 60 * 1000;
  const TENT_ORDER = Object.keys(LORE.tents);

  // ---------- helpers ----------
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const store = (kind) => ({
    get(k, d = null) { try { const v = window[kind].getItem(k); return v == null ? d : v; } catch { return d; } },
    set(k, v) { try { window[kind].setItem(k, v); } catch { /* private mode */ } },
    del(k) { try { window[kind].removeItem(k); } catch { /* ignore */ } },
  });
  const LS = store("localStorage"), SS = store("sessionStorage");
  const num = (v) => (v === "" || v == null || v === false ? NaN : +v);
  const trim0 = (n, d) => String(+(+n).toFixed(d));
  const fmtAu = (n) => (n >= 1000 ? Math.round(n).toLocaleString() : (+n).toFixed(1));
  const fmtOz = (n) => trim0(n, 2);
  const fmtPct = (n, d = 2) => (isFinite(n) ? (+n).toFixed(d) + "%" : "—");
  const fmtAbv = (abv, est) => (abv == null || !isFinite(abv) ? "ABV TBD" : (est ? "~" : "") + trim0(abv, 2) + "%");
  const plural = (n, w, p = w + "s") => `${n} ${n === 1 ? w : p}`;
  const norm = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9.%]+/g, " ").trim();
  const now = () => Date.now() + S.skew; // server-aligned clock
  // Each drinker gets their own Snally colors: palette = their place in the Drinkers list (stable as long as the list order is).
  const palFor = (name) => {
    const k = String(name || "").toLowerCase(), i = S.drinkers.findIndex((d) => d.toLowerCase() === k);
    return i >= 0 ? i : [...k].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);
  };
  const art = (stage, opt = {}) => (window.Snally ? window.Snally.draw(stage, { ...opt, palette: opt.who == null ? 0 : palFor(opt.who) }) : "");
  const stageFor = (n) => (window.Snally ? window.Snally.stageFor(n) : Math.min(5, 1 + Math.floor(n / 3)));
  const stageInfo = (st) => (window.Snally ? window.Snally.STAGES[st] : { name: "Stage " + st, title: "Stage " + st, blurb: "" });
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    const b = new Uint8Array(16);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(b); else for (let i = 0; i < 16; i++) b[i] = Math.random() * 256 | 0;
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
    return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
  }
  function ago(ms) {
    if (!isFinite(ms)) return "time unknown";
    const s = Math.max(0, Math.round((now() - ms) / 1000));
    if (s < 45) return "just now";
    if (s < 3600) return Math.round(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h " + Math.round((s % 3600) / 60) + "m ago";
    return new Date(ms).toLocaleDateString();
  }
  const CLOCK_FMT = new Intl.DateTimeFormat([], { hour: "numeric", minute: "2-digit" }); // toLocaleTimeString per pour is slow at ~1000 pours
  const clock = (ms) => (isFinite(ms) ? CLOCK_FMT.format(ms) : "");
  // The owner's personal scale (est. 10/27/23): Y · Yu · Yum · Yumm · Yummyy…(4.1–4.9: one extra y per tenth) · Yummy! (perfect)
  function yum(r) {
    const t = Math.round(r * 10);
    if (t >= 50) return "Yummy!";
    if (t > 40) return "Yumm" + "y".repeat(t - 40 + 1);
    if (t >= 40) return "Yumm";
    if (t >= 30) return "Yum";
    if (t >= 20) return "Yu";
    return "Y";
  }

  const byNewest = (a, b) => (isFinite(b.tms) ? b.tms : -Infinity) - (isFinite(a.tms) ? a.tms : -Infinity) || 0;
  class NetError extends Error {}

  // ---------- beers ----------
  let BEERS = [];
  const BEER_BY_ID = new Map();
  async function loadBeers() {
    try {
      const r = await fetch("beers.json", { cache: "no-cache" });
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      BEERS = (j.beers || []).map((b) => ({
        ...b, abv: b.abv == null || b.abv === "" ? null : +b.abv,
        hay: norm(`${b.brewery} ${b.beer} ${b.style}`), words: " " + norm(`${b.brewery} ${b.beer}`),
      }));
      BEERS.forEach((b) => BEER_BY_ID.set(String(b.id), b));
    } catch (e) {
      console.warn("beers.json failed to load", e);
      showFormError("The beer list didn't load. You can still log a custom drink.");
    }
  }
  function searchBeers(q, limit = 12) {
    const toks = norm(q).split(" ").filter(Boolean);
    if (!toks.length) return [];
    const out = [];
    for (const b of BEERS) {
      if (!toks.every((t) => b.hay.includes(t))) continue;
      let score = 0;
      for (const t of toks) score += b.words.includes(" " + t) ? 3 : b.words.includes(t) ? 1 : 0;
      out.push([score, b]);
    }
    out.sort((a, b) => b[0] - a[0] || a[1].brewery.localeCompare(b[1].brewery) || a[1].beer.localeCompare(b[1].beer) || a[1].tent.localeCompare(b[1].tent));
    return out.slice(0, limit).map((x) => x[1]);
  }

  // ---------- API (single entry point) ----------
  async function api(action, payload = {}) {
    if (DEMO) return JSON.parse(JSON.stringify(await Mock.handle(action, JSON.parse(JSON.stringify(payload)))));
    let res;
    try {
      if (action === "state") {
        res = await fetch(API_URL + (API_URL.includes("?") ? "&" : "?") + "action=state&_=" + Date.now(), { cache: "no-store" });
      } else {
        res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action, ...payload }) });
      }
    } catch (e) { throw new NetError("Couldn't reach the server."); }
    if (!res.ok) throw new NetError(`The server answered ${res.status}.`);
    try { return await res.json(); } catch { throw new NetError("The server sent something that isn't JSON."); }
  }

  // ---------- Demo backend (same API, localStorage) ----------
  const Mock = (() => {
    const KEY = "snally-demo-v2", PIN = "1234";
    let db = null;
    const save = () => LS.set(KEY, JSON.stringify(db));
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
    function seed() {
      const R = rng(20261010);
      const names = ["Maya", "Dev", "Priya", "Theo", "Jordan", "Sam", "Rosa", "Kenji"];
      const counts = [14, 12, 10, 9, 8, 7, 6, 3];
      const all = BEERS.filter((b) => b.abv != null && b.tent);
      // a short "buzz list" most people hit, so Sightings has repeat beers
      const buzz = all.length ? Array.from({ length: 22 }, () => all[(R() * all.length) | 0]) : [];
      const pool = all;
      const pickFrom = () => { const src = R() < .55 ? buzz : all; return src[(R() * src.length) | 0]; };
      const fallback = [{ id: null, brewery: "Demo Brewing", beer: "Placeholder Pils", style: "Pilsner", abv: 5, tent: "Rodan" }];
      const pours = [];
      const end = Date.now() - 4 * 60 * 1000, span = 4 * 3600 * 1000;
      names.forEach((name, i) => {
        // each drinker leans toward lighter or heavier beers so the averages differ
        const lean = i % 3 === 0 ? 1 : i % 3 === 1 ? -1 : 0;
        for (let k = 0; k < counts[i]; k++) {
          let b = pool.length ? pickFrom() : fallback[0];
          if (pool.length && lean) { const c = pickFrom(); if (lean * (c.abv - b.abv) > 0) b = c; }
          const r = R(), size = r < .2 ? "small" : r < .8 ? "standard" : "brim";
          pours.push({
            id: "d" + pours.length, t: new Date(end - span * R()).toISOString(), drinker: name,
            beerId: b.id, brewery: b.brewery, beer: b.beer, style: b.style, abv: b.abv, tent: b.tent,
            oz: SIZES[size].oz, size, rating: Math.round((1.8 + R() * 3.2) * 10) / 10, custom: false,
          });
        }
      });
      pours.push({ id: "d" + pours.length, t: new Date(end - 3600e3).toISOString(), drinker: "Rosa", beerId: null, brewery: "", beer: "Water", style: "", abv: 0, tent: "", oz: 5.5, size: "brim", rating: 3, custom: true });
      pours.push({ id: "d" + pours.length, t: new Date(end - 5400e3).toISOString(), drinker: "Theo", beerId: null, brewery: "Theo's Garage", beer: "Homebrew Mead", style: "", abv: 11, tent: "", oz: 2, size: "small", rating: 4.1, custom: true });
      pours.sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
      return { drinkers: names, pours, clientIds: {} };
    }
    function load() {
      if (db) return;
      try { db = JSON.parse(LS.get(KEY)); } catch { db = null; }
      if (!db || !Array.isArray(db.pours) || !Array.isArray(db.drinkers)) { db = seed(); save(); }
      db.clientIds = db.clientIds || {};
    }
    const fail = (error) => ({ ok: false, error });
    async function handle(action, p) {
      await wait(150 + Math.random() * 250);
      if (LS.get("snally-demo-offline") === "1") throw new NetError("Demo is pretending to be offline.");
      load();
      switch (action) {
        case "state":
          return { ok: true, drinkers: db.drinkers.slice(), pours: db.pours, serverTime: new Date().toISOString() };
        case "pour": {
          if (!db.drinkers.includes(p.drinker)) return fail("Unknown drinker.");
          if (p.clientId && db.clientIds[p.clientId]) {
            const dup = db.pours.find((x) => x.id === db.clientIds[p.clientId]);
            if (dup) return { ok: true, pour: dup, duplicate: true };
          }
          const oz = +p.oz, abv = +p.abv, rating = +p.rating;
          if (!(oz > 0 && oz <= MAX_OZ)) return fail("Pour size must be between 0 and 5.5 oz.");
          if (!(abv >= 0 && abv <= 70) || p.abv === null || p.abv === "") return fail("ABV must be 0–70%.");
          if (!(rating >= 1 && rating <= 5)) return fail("Rating must be 1–5.");
          if (!String(p.beer || "").trim()) return fail("Drink name is required.");
          const b = p.beerId ? BEER_BY_ID.get(String(p.beerId)) : null;
          if (p.beerId && !b) return fail("Unknown beer id.");
          const pour = {
            id: "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), t: new Date().toISOString(), drinker: p.drinker,
            beerId: b ? b.id : null, brewery: b ? b.brewery : String(p.brewery || "").trim(), beer: b ? b.beer : String(p.beer).trim(),
            style: b ? b.style : "", abv, tent: b ? b.tent : "", oz, size: p.size, rating: Math.round(rating * 10) / 10, custom: !b,
          };
          db.pours.push(pour);
          if (p.clientId) db.clientIds[p.clientId] = pour.id;
          save();
          return { ok: true, pour };
        }
        case "addDrinker": {
          if (p.pin !== PIN) return fail("Wrong PIN.");
          const name = String(p.name || "").trim().replace(/\s+/g, " ");
          if (!name || name.length > 40) return fail("Name must be 1–40 characters.");
          if (db.drinkers.some((d) => d.toLowerCase() === name.toLowerCase())) return fail(`${name} is already a drinker.`);
          db.drinkers.push(name); save();
          return { ok: true, drinkers: db.drinkers.slice() };
        }
        case "deletePour": {
          const i = db.pours.findIndex((x) => x.id === p.id);
          if (i < 0) return fail("That pour is already gone.");
          const pour = db.pours[i];
          if (p.pin != null) { if (p.pin !== PIN) return fail("Wrong PIN."); }
          else if (p.drinker !== pour.drinker) return fail("You can only undo your own pours.");
          else if (Date.now() - Date.parse(pour.t) > UNDO_MS) return fail("Undo window (10 minutes) has passed. Ask the organizer.");
          db.pours.splice(i, 1); save();
          return { ok: true };
        }
        case "checkPin":
          return p.pin === PIN ? { ok: true } : fail("Wrong PIN.");
        default:
          return fail("Unknown action.");
      }
    }
    function reset() { LS.del(KEY); db = null; }
    return { handle, reset };
  })();

  // ---------- state + scoring ----------
  const S = { sig: "", gen: 0, drinkers: [], pours: [], loaded: false, lastFetch: 0, lastAttempt: 0, skew: 0, err: null, refreshing: false };

  function normPour(p) {
    const abv = p.abv === "" || p.abv == null ? NaN : +p.abv;
    const oz = +p.oz;
    const t = typeof p.t === "number" ? p.t : Date.parse(p.t);
    const b = p.beerId ? BEER_BY_ID.get(String(p.beerId)) : null;
    const custom = p.custom === true || /^true$/i.test(String(p.custom)) || !p.beerId;
    const counted = isFinite(abv) && abv > 0 && oz > 0;
    return {
      ...p, abv, oz, tms: t,
      rating: p.rating === "" || p.rating == null ? NaN : +p.rating,
      tent: custom ? "" : p.tent || (b && b.tent) || "",
      style: p.style || (b && b.style) || "",
      est: b ? !!b.est : false,
      custom, counted, au: counted ? oz * abv : 0,
    };
  }

  function compute() {
    const people = new Map();
    const person = (name) => {
      if (!people.has(name)) people.set(name, { name, pours: [], all: [], n: 0, au: 0, oz: 0, rSum: 0, rN: 0, tentWins: 0, tentsWon: [] });
      return people.get(name);
    };
    S.drinkers.forEach(person);
    const tents = new Map();
    const beers = new Map();
    for (const p of S.pours) {
      if (!p.drinker) continue;
      const r = person(p.drinker);
      r.all.push(p);
      if (!p.counted) continue;
      r.pours.push(p); r.n++; r.au += p.au; r.oz += p.oz;
      if (isFinite(p.rating)) { r.rSum += p.rating; r.rN++; }
      if (p.tent && !p.custom) {
        if (!tents.has(p.tent)) tents.set(p.tent, { tent: p.tent, by: new Map(), n: 0 });
        const t = tents.get(p.tent); t.n++; t.by.set(p.drinker, (t.by.get(p.drinker) || 0) + p.au);
      }
      const key = norm(p.brewery) + "|" + norm(p.beer);
      if (!beers.has(key)) beers.set(key, { brewery: p.brewery, beer: p.beer, n: 0, au: 0, rSum: 0, rN: 0, tents: new Set(), est: p.est, abv: p.abv });
      const bk = beers.get(key); bk.n++; bk.au += p.au; if (isFinite(p.rating)) { bk.rSum += p.rating; bk.rN++; } if (p.tent) bk.tents.add(p.tent);
    }
    for (const t of tents.values()) {
      const ranked = [...t.by.entries()].sort((a, b) => b[1] - a[1]);
      t.ranked = ranked;
      const top = ranked.length ? ranked[0][1] : 0;
      t.champs = ranked.filter((x) => Math.abs(x[1] - top) < 1e-9 && top > 0).map((x) => x[0]);
      t.champs.forEach((n) => { const r = person(n); r.tentWins++; r.tentsWon.push(t.tent); });
    }
    const list = [...people.values()];
    list.forEach((r) => {
      r.avgAbv = r.oz > 0 ? r.au / r.oz : NaN;
      r.avgRating = r.rN ? r.rSum / r.rN : NaN;
      r.stage = stageFor(r.n);
      r.all.sort(byNewest);
    });
    list.sort((a, b) => b.au - a.au || b.n - a.n || a.name.localeCompare(b.name));
    const maxAu = Math.max(0, ...list.map((r) => r.au));
    list.forEach((r) => { r.hoard = maxAu > 0 ? r.au / maxAu : 0; });
    return { list, byName: people, tents, beers: [...beers.values()], maxAu };
  }
  let C = compute();

  async function refresh(manual = false) {
    if (S.refreshing) return;
    S.refreshing = true; S.lastAttempt = Date.now();
    $("refreshBtn").classList.add("spin");
    const gen = S.gen;
    try {
      const d = await api("state");
      // a pour/undo/delete happened while this request was in flight: its answer may be stale,
      // so drop it (otherwise a just-logged pour vanishes) and refetch on the next tick
      if (gen !== S.gen) { S.lastAttempt = 0; return; }
      if (!d || !d.ok) throw new Error((d && d.error) || "The server didn't return the leaderboard.");
      const st = Date.parse(d.serverTime);
      S.skew = isFinite(st) ? st - Date.now() : 0;
      S.lastFetch = Date.now(); S.err = null;
      // most polls bring nothing new: skip the (big) rerender then
      const sig = JSON.stringify([d.drinkers, d.pours]);
      if (!S.loaded || sig !== S.sig) {
        S.sig = sig;
        S.drinkers = (d.drinkers || []).map(String).filter(Boolean);
        S.pours = (d.pours || []).map(normPour);
        S.loaded = true;
        renderAll();
      }
      if (manual) toast("Fresh from the hoard ✨");
    } catch (e) {
      console.warn("refresh failed", e);
      S.err = e;
      if (manual) toast("Couldn't refresh: " + e.message, true);
    } finally {
      S.refreshing = false;
      $("refreshBtn").classList.remove("spin");
      renderStatus();
    }
  }

  function renderStatus() {
    const el = $("status");
    if (!S.loaded && !S.err) { el.textContent = "Loading the hoard…"; return; }
    if (!S.loaded) { el.innerHTML = `<span class="warn">Couldn't load the leaderboard. Retrying…</span>`; return; }
    const s = Math.round((Date.now() - S.lastFetch) / 1000);
    const age = s < 5 ? "just now" : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ${s % 60}s ago`;
    el.innerHTML = S.err ? `<span class="warn">Offline? Last updated ${age}</span>` : `Updated ${age}`;
  }

  function renderAll() {
    C = compute();
    renderDrinkers();
    renderMySnally();
    renderRecent();
    if (currentView === "board") renderBoard(); // route() renders it on entering the tab
    if (currentView === "admin") renderAdmin();
    updateForm();
  }

  // ---------- Log tab ----------
  const F = { beer: null, custom: false, clientId: null, submitting: false, showErrors: false, active: -1, results: [] };
  let me = LS.get("snally-drinker", "");

  function renderDrinkers() {
    const sel = $("drinkerSel");
    const names = [...S.drinkers].sort((a, b) => a.localeCompare(b));
    if (me && S.loaded && !names.includes(me)) { me = ""; LS.del("snally-drinker"); }
    const html = `<option value="">${names.length ? "Choose your name…" : "No drinkers yet"}</option>` +
      names.map((n) => `<option${n === me ? " selected" : ""}>${esc(n)}</option>`).join("");
    if (html !== lastDrinkerHtml) { sel.innerHTML = html; lastDrinkerHtml = html; }
    const chosen = !!me && !pickingDrinker;
    $("whoPick").hidden = chosen;
    $("whoChosen").hidden = !chosen;
    $("whoName").textContent = me;
  }
  let pickingDrinker = false, lastDrinkerHtml = "";

  function renderMySnally() {
    const box = $("mySnally");
    const r = me && C.byName.get(me);
    if (!r) { box.hidden = true; return; }
    box.hidden = false;
    const info = stageInfo(r.stage);
    const next = r.stage < 5 ? (r.stage * 3) - r.n : 0;
    box.innerHTML = `<div class="my-art">${art(r.stage, { hoard: r.hoard, id: "me", who: r.name })}</div>
      <div class="my-txt"><div class="my-stage">Your Snally: <b>${esc(info.title)}</b></div>
      <div class="my-stats"><b>${fmtAu(r.au)}</b> AU · ${plural(r.n, "pour")}${r.tentWins ? ` · 🏕️×${r.tentWins}` : ""}</div>
      <div class="my-next">${next > 0 ? `${plural(next, "more pour")} to evolve` : "Fully evolved. Bow before the hoard."}</div></div>`;
  }

  function renderRecent() {
    const ul = $("recentList");
    const r = me && C.byName.get(me);
    if (!me) { ul.innerHTML = `<li class="empty">Pick your name above to see your pours.</li>`; return; }
    const list = r ? r.all.slice(0, 10) : [];
    ul.innerHTML = list.length ? list.map((p) => pourItem(p, { undo: now() - p.tms < UNDO_MS })).join("") : `<li class="empty">No pours yet. Your egg is waiting. 🥚</li>`;
  }

  function pourItem(p, { undo = false, del = false, who = false } = {}) {
    const math = p.counted ? `${fmtOz(p.oz)} oz × ${fmtAbv(p.abv, p.est)} = <b>${fmtAu(p.au)} AU</b>` : isFinite(p.abv) ? `${fmtOz(p.oz)} oz · ${fmtAbv(p.abv)} · <i>doesn't count</i>` : `${fmtOz(p.oz)} oz`;
    const tent = p.tent ? tentChip(p.tent) : p.custom ? `<span class="chip chip-custom">custom</span>` : "";
    const btn = undo ? `<button type="button" class="btn btn-mini" data-undo="${esc(p.id)}">↩ Undo</button>`
      : del ? `<button type="button" class="btn btn-mini btn-danger" data-del="${esc(p.id)}">Delete</button>` : "";
    return `<li class="pour">
      <div class="pour-main"><div class="pour-name">${who ? `<span class="pour-who">${esc(p.drinker)}</span> · ` : ""}<b>${esc(p.beer)}</b>${p.brewery ? ` <span class="muted">· ${esc(p.brewery)}</span>` : ""}</div>
      <div class="pour-meta">${tent} <span>${math}</span>${isFinite(p.rating) ? ` <span class="pour-star">${trim0(p.rating, 1)}★</span>` : ""} <span class="muted"${isFinite(p.tms) ? ` title="${esc(new Date(p.tms).toLocaleString())}"` : ""}>${isFinite(p.tms) ? clock(p.tms) + " · " : ""}${ago(p.tms)}</span></div></div>
      ${btn}</li>`;
  }
  const tentChip = (t) => `<span class="chip chip-tent">${esc((LORE.tents[t] || {}).emoji || "⛺")} ${esc(t)}</span>`;

  // beer combobox
  const input = $("beerInput"), listEl = $("beerList");
  function openResults() {
    const q = input.value;
    F.results = q.trim() ? searchBeers(q) : [];
    F.active = -1;
    if (!q.trim()) { closeResults(); return; }
    const rows = F.results.map((b, i) => `<li role="option" id="opt-${i}" class="res" data-i="${i}" aria-selected="false">
      <div class="res-top"><b class="res-beer">${esc(b.beer)}</b><span class="res-abv">${esc(fmtAbv(b.abv, b.est))}</span></div>
      <div class="res-sub"><span class="res-brew">${esc(b.brewery)}</span>${b.tent ? tentChip(b.tent) : ""}</div>
      ${b.style ? `<div class="res-style">${esc(b.style)}</div>` : ""}</li>`);
    rows.unshift(`<li role="option" id="opt-c" class="res res-custom" data-i="custom" aria-selected="false">+ Add a custom drink: <b>“${esc(q.trim())}”</b></li>`);
    listEl.innerHTML = rows.join("") + (F.results.length ? "" : `<li class="res-none" role="presentation">${BEERS.length ? `No festival beer matches “${esc(q.trim())}”.` : "The festival beer list didn't load (try reloading the page). Add it as a custom drink above."}</li>`);
    listEl.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }
  function closeResults() {
    listEl.hidden = true; listEl.innerHTML = ""; F.active = -1;
    input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant");
  }
  function setActive(i) {
    const opts = [...listEl.querySelectorAll('[role="option"]')];
    if (!opts.length) return;
    F.active = (i + opts.length) % opts.length;
    opts.forEach((o, k) => o.setAttribute("aria-selected", k === F.active ? "true" : "false"));
    const o = opts[F.active];
    input.setAttribute("aria-activedescendant", o.id);
    o.scrollIntoView({ block: "nearest" });
  }
  function choose(which) {
    const typed = input.value.trim();
    closeResults();
    if (which === "custom") {
      F.beer = null; F.custom = true;
      $("cName").value = typed; $("cBrewery").value = ""; $("cAbv").value = "";
    } else {
      F.beer = F.results[which]; F.custom = false;
      $("tbdAbv").value = "";
    }
    F.clientId = null; F.showErrors = false;
    renderChosen();
    updateForm();
    if (F.custom) $("cAbv").focus({ preventScroll: true });
    else if (F.beer && F.beer.abv == null) $("tbdAbv").focus({ preventScroll: true });
  }
  function clearBeer() {
    F.beer = null; F.custom = false; F.clientId = null;
    input.value = "";
    renderChosen(); updateForm();
    input.focus();
  }
  function renderChosen() {
    const has = !!F.beer || F.custom;
    $("beerSearch").hidden = has;
    $("customFields").hidden = !F.custom;
    $("tbdAbvWrap").hidden = !(F.beer && F.beer.abv == null);
    const box = $("beerChosen");
    box.hidden = !has;
    if (F.beer) {
      const b = F.beer;
      box.innerHTML = `<div class="chosen-txt"><div class="chosen-beer">${esc(b.beer)}</div>
        <div class="chosen-brew">${esc(b.brewery)}${b.style ? ` · <span class="muted">${esc(b.style)}</span>` : ""}</div>
        <div class="chosen-meta"><span class="chip chip-abv">${esc(fmtAbv(b.abv, b.est))}</span>${b.tent ? tentChip(b.tent) : ""}</div></div>
        <button type="button" class="xbtn" id="clearBeer" aria-label="Clear beer ${esc(b.beer)}">×</button>`;
    } else if (F.custom) {
      box.innerHTML = `<div class="chosen-txt"><div class="chosen-beer">Custom drink</div><div class="chosen-brew muted">Not on the festival list. No tent, but it still counts for AU.</div></div>
        <button type="button" class="xbtn" id="clearBeer" aria-label="Cancel custom drink">×</button>`;
    } else box.innerHTML = "";
  }

  input.addEventListener("input", () => {
    openResults(); updateForm();
    // on phones, lift the search box up so the result list isn't hidden under the keyboard
    if (!listEl.hidden && input.getBoundingClientRect().top > window.innerHeight * 0.35) $("beerSearch").scrollIntoView({ block: "start", behavior: "smooth" });
  });
  input.addEventListener("focus", () => { if (input.value.trim()) openResults(); });
  input.addEventListener("keydown", (e) => {
    const open = !listEl.hidden;
    if (e.key === "ArrowDown") { e.preventDefault(); if (!open) openResults(); setActive(F.active + 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); if (open) setActive(F.active - 1); }
    else if (e.key === "Escape") { if (open) { e.preventDefault(); closeResults(); } }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (open && F.active >= 0) {
        const o = listEl.querySelectorAll('[role="option"]')[F.active];
        choose(o.dataset.i === "custom" ? "custom" : +o.dataset.i);
      } else if (open && F.results.length === 1) choose(0); // the lone listed beer, not custom
      else { F.showErrors = true; updateForm(); }
    }
  });
  // pointerdown + preventDefault keeps focus in the input so the list doesn't vanish mid-tap
  listEl.addEventListener("mousedown", (e) => e.preventDefault());
  listEl.addEventListener("click", (e) => {
    const o = e.target.closest('[role="option"]');
    if (o) choose(o.dataset.i === "custom" ? "custom" : +o.dataset.i);
  });
  input.addEventListener("blur", () => setTimeout(() => { if (document.activeElement !== input) closeResults(); }, 150));
  $("beerChosen").addEventListener("click", (e) => { if (e.target.closest("#clearBeer")) clearBeer(); });

  // drinker
  $("drinkerSel").addEventListener("change", (e) => {
    me = e.target.value; pickingDrinker = false;
    if (me) LS.set("snally-drinker", me); else LS.del("snally-drinker");
    F.clientId = null;
    renderDrinkers(); renderMySnally(); renderRecent(); updateForm();
  });
  // "(change)" then re-picking the same name fires no change event: go back on blur
  $("drinkerSel").addEventListener("blur", () => { if (pickingDrinker && me && $("drinkerSel").value === me) { pickingDrinker = false; renderDrinkers(); } });
  $("whoChange").addEventListener("click", () => { pickingDrinker = true; renderDrinkers(); $("drinkerSel").focus(); });

  // sizes + glasses
  function glassSvg(oz) {
    const lvl = Math.max(0, Math.min(1, (+oz || 0) / MAX_OZ));
    const top = 4, bot = 30, half = (y) => 6 + ((bot - y) / (bot - top)) * 4.5;
    const y = bot - lvl * (bot - top - 1);
    const fill = lvl > 0 ? `<path d="M${12 - half(y)},${y} L${12 + half(y)},${y} L18,${bot} L6,${bot} Z" fill="var(--beer)"/>` +
      `<path d="M${12 - half(y)},${y} L${12 + half(y)},${y}" stroke="var(--foam)" stroke-width="2.4"/>` : "";
    return `<svg viewBox="0 0 24 34" aria-hidden="true">${fill}<path d="M1.5,${top} L22.5,${top} L18,${bot} L6,${bot} Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;
  }
  document.querySelectorAll(".glass").forEach((g) => { g.innerHTML = glassSvg(g.dataset.oz); });
  const sizeVal = () => (document.querySelector('input[name="size"]:checked') || {}).value || "standard";
  let savedSize = LS.get("snally-size", "standard");
  if (SIZES[savedSize]) { const r = document.querySelector(`input[name="size"][value="${savedSize}"]`); if (r) r.checked = true; }
  function syncSize() {
    const v = sizeVal();
    $("customOzWrap").hidden = v !== "custom";
    $("customGlass").innerHTML = glassSvg(v === "custom" ? $("customOz").value : 0);
    LS.set("snally-size", v);
  }
  $("sizes").addEventListener("change", () => { syncSize(); updateForm(); if (sizeVal() === "custom") $("customOz").focus(); });
  $("customOz").addEventListener("input", () => { syncSize(); updateForm(); });

  // rating
  function syncRating() {
    const v = +$("rating").value, l = yum(v);
    $("ratingVal").textContent = v.toFixed(1);
    $("ratingLabel").textContent = l;
    $("rating").setAttribute("aria-valuetext", `${v.toFixed(1)} stars, ${l}`);
    $("rating").style.setProperty("--pct", ((v - 1) / 4) * 100 + "%");
  }
  $("rating").addEventListener("input", syncRating);

  ["cName", "cBrewery", "cAbv", "tbdAbv"].forEach((id) => $(id).addEventListener("input", updateForm));

  function validate() {
    const errs = [];
    if (!me) errs.push(["drinkerSel", "Choose who's drinking.", 1]);
    if (F.custom) {
      if (!$("cName").value.trim()) errs.push(["cName", "Give your custom drink a name.", 2]);
      const a = num($("cAbv").value);
      if (!(a >= 0 && a <= 70)) errs.push(["cAbv", "Enter the drink's ABV (0–70%).", 2]);
    } else if (F.beer) {
      if (F.beer.abv == null) { const a = num($("tbdAbv").value); if (!(a >= 0 && a <= 70)) errs.push(["tbdAbv", "This beer's ABV isn't listed yet: enter it (0–70%).", 2]); }
    } else {
      errs.push(["beerInput", input.value.trim() ? "Pick a beer from the list (or “+ Add a custom drink” at the top)." : "Search for your beer and pick it.", 2]);
    }
    if (sizeVal() === "custom") {
      const oz = num($("customOz").value);
      if (!(oz > 0 && oz <= MAX_OZ)) errs.push(["customOz", "Custom pour must be more than 0 and at most 5.5 oz.", 3]);
    }
    const r = num($("rating").value);
    if (!(r >= 1 && r <= 5)) errs.push(["rating", "Rate it from 1 to 5.", 4]);
    return errs;
  }
  function updateForm() {
    const errs = validate();
    const btn = $("submitBtn");
    btn.disabled = !!errs.length || F.submitting;
    btn.textContent = F.submitting ? "Adding to the hoard…" : "Add to my hoard 🪙";
    $("formHints").innerHTML = errs.map(([id, m, n]) => `<li data-for="${id}"><span class="hint-num" aria-label="Step ${n}">${n}</span>${esc(m)}</li>`).join("");
    $("formHints").classList.toggle("loud", F.showErrors);
    document.querySelectorAll(".pour-form [aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
    if (F.showErrors) errs.forEach(([id]) => $(id) && $(id).setAttribute("aria-invalid", "true"));
    return errs;
  }

  function buildPayload() {
    const size = sizeVal();
    const oz = size === "custom" ? Math.round(num($("customOz").value) * 100) / 100 : SIZES[size].oz;
    const rating = Math.round(num($("rating").value) * 10) / 10;
    const base = { drinker: me, oz, size, rating, clientId: F.clientId };
    if (F.custom) return { ...base, beerId: null, brewery: $("cBrewery").value.trim(), beer: $("cName").value.trim(), abv: num($("cAbv").value), style: "", tent: "" };
    const b = F.beer;
    return { ...base, beerId: b.id, brewery: b.brewery, beer: b.beer, abv: b.abv == null ? num($("tbdAbv").value) : b.abv, style: b.style, tent: b.tent };
  }

  function showFormError(msg) { const el = $("formError"); el.hidden = !msg; el.textContent = msg || ""; }

  $("pourForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (F.submitting) return;
    const errs = validate();
    if (errs.length) {
      F.showErrors = true; updateForm();
      const first = $(errs[0][0]); if (first) first.focus();
      return;
    }
    F.clientId = F.clientId || uuid();
    const payload = buildPayload();
    const before = (C.byName.get(me) || { n: 0 }).n;
    F.submitting = true; showFormError(""); updateForm();
    let d;
    try {
      d = await api("pour", payload);
    } catch (err) {
      F.submitting = false; updateForm();
      showFormError(`${err.message || "Network error."} Your pour is still filled in. Tap “Add to my hoard” to retry (it won't double count).`);
      return;
    }
    F.submitting = false;
    if (!d || !d.ok) {
      F.clientId = null; updateForm();
      showFormError("Not saved: " + ((d && d.error) || "the server said no."));
      return;
    }
    const pour = normPour(d.pour || { ...payload, id: "local-" + payload.clientId, t: new Date(now()).toISOString(), custom: !payload.beerId });
    if (!S.pours.some((p) => p.id === pour.id)) S.pours.push(pour);
    S.gen++; S.sig = "";
    // reset beer + rating, keep drinker + size
    F.beer = null; F.custom = false; F.clientId = null; F.showErrors = false;
    input.value = ""; $("rating").value = 3; syncRating();
    ["cName", "cBrewery", "cAbv", "tbdAbv"].forEach((id) => { $(id).value = ""; });
    renderChosen();
    renderAll();
    const after = (C.byName.get(me) || { n: 0 }).n;
    if (pour.counted) toast(`+${fmtAu(pour.au)} AU! ${fmtOz(pour.oz)} oz × ${fmtAbv(pour.abv)} of ${pour.beer} 🪙`);
    else toast(`Logged ${pour.beer} 💧 0% doesn't count toward the hoard. Hydration hero!`);
    const s0 = stageFor(before), s1 = stageFor(after);
    if (s1 > s0) evolve(s0, s1, after);
    setTimeout(() => refresh(), 1200);
  });

  $("recentList").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-undo]");
    if (!b) return;
    const p = S.pours.find((x) => x.id === b.dataset.undo);
    if (!p || !confirm(`Undo “${p.beer}” (${fmtOz(p.oz)} oz)?`)) return;
    b.disabled = true;
    try {
      const d = await api("deletePour", { id: p.id, drinker: me });
      if (!d.ok) throw new Error(d.error || "Couldn't undo.");
      S.pours = S.pours.filter((x) => x.id !== p.id); S.gen++; S.sig = "";
      renderAll(); toast("Pour undone. The coins slink back. ↩");
    } catch (err) { b.disabled = false; toast(err.message, true); }
  });

  // ---------- Evolution + toast ----------
  function evolve(s0, s1, n) {
    const a = stageInfo(s0), b = stageInfo(s1);
    $("evolveFrom").innerHTML = art(s0, { id: "evo-a", who: me }) + `<span>${esc(a.title)}</span>`;
    $("evolveTo").innerHTML = art(s1, { id: "evo-b", who: me }) + `<span>${esc(b.title)}</span>`;
    $("evolveText").innerHTML = `${plural(n, "pour")} in, your <b>${esc(a.title)}</b> became a <b>${esc(b.title)}</b>! ${esc(b.blurb)}`;
    const dlg = $("evolveDlg");
    if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute("open", "");
  }
  $("evolveDlg").addEventListener("click", (e) => { if (e.target === $("evolveDlg")) $("evolveDlg").close(); });

  let toastTimer = 0;
  function toast(msg, bad = false) {
    const t = $("toast");
    t.textContent = msg; t.hidden = false;
    t.classList.toggle("bad", bad);
    t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.classList.remove("show"); setTimeout(() => { t.hidden = true; }, 300); }, bad ? 6000 : 4200);
  }

  // ---------- Leaderboard ----------
  const AWARDS = [
    { key: "snallygaster", rule: "Most total AU", formula: "Total AU = Σ (oz × ABV%) over every counted pour",
      ok: (r) => r.au > 0, sort: (a, b) => b.au - a.au, val: (r) => fmtAu(r.au) + " AU" },
    { key: "chessie", rule: "Most total volume", formula: "Total volume = Σ oz over every counted pour",
      ok: (r) => r.oz > 0, sort: (a, b) => b.oz - a.oz, val: (r) => fmtOz(r.oz) + " oz" },
    { key: "goatman", rule: "Highest average ABV · min 7 pours", formula: "Avg ABV = Total AU ÷ Total oz (volume-weighted)", min: MIN_AVG_POURS,
      ok: (r) => isFinite(r.avgAbv), sort: (a, b) => b.avgAbv - a.avgAbv, val: (r) => fmtPct(r.avgAbv) },
    { key: "bunnyman", rule: "Lowest average ABV · min 7 pours", formula: "Avg ABV = Total AU ÷ Total oz (volume-weighted)", min: MIN_AVG_POURS,
      ok: (r) => isFinite(r.avgAbv), sort: (a, b) => a.avgAbv - b.avgAbv, val: (r) => fmtPct(r.avgAbv) },
  ];

  function renderBoard() {
    const { list, tents } = C;
    // podium
    const top = list.filter((r) => r.au > 0).slice(0, 3);
    $("podium").innerHTML = top.length ? [1, 0, 2].map((i) => {
      const r = top[i];
      if (!r) return `<div class="pod pod-${i + 1} pod-empty" aria-hidden="true"></div>`;
      return `<div class="pod pod-${i + 1}">
        <div class="pod-art">${art(r.stage, { hoard: r.hoard, id: "pod" + i, who: r.name })}</div>
        <div class="pod-name">${esc(r.name)}</div>
        <div class="pod-stage">${esc(stageInfo(r.stage).title)}</div>
        <div class="pod-au"><b>${fmtAu(r.au)}</b> AU</div>
        <div class="block"><span>${["🥇", "🥈", "🥉"][i]}</span><b>${i + 1}</b></div></div>`;
    }).join("") : `<p class="empty card">No pours yet. Every dragon starts as an egg. 🥚</p>`;

    // awards
    $("awards").innerHTML = AWARDS.map((a) => {
      const L = LORE.awards[a.key] || { emoji: "", name: a.key, story: "" };
      const elig = list.filter((r) => a.ok(r) && (!a.min || r.n >= a.min)).sort(a.sort);
      const lead = elig[0];
      const rest = elig.slice(1, 5).map((r, i) => `<li><span class="pos">${i + 2}</span><span class="who">${esc(r.name)}</span><span class="val">${a.val(r)}</span></li>`).join("");
      const waiting = a.min ? list.filter((r) => r.n > 0 && r.n < a.min).sort((x, y) => y.n - x.n) : [];
      const wait = waiting.length ? `<p class="waiting">Still hatching: ${waiting.slice(0, 6).map((r) => `${esc(r.name)} <span class="muted">needs ${plural(a.min - r.n, "more pour")}</span>`).join(" · ")}${waiting.length > 6 ? ` · +${waiting.length - 6} more` : ""}</p>` : "";
      return `<article class="card award award-${a.key}">
        <header class="award-h"><span class="award-emoji" aria-hidden="true">${L.emoji}</span><div><h3>${esc(L.name)}</h3><div class="rule">${esc(a.rule)}</div></div></header>
        <p class="story">${esc(L.story)}</p>
        <div class="leader">${lead ? `<div class="leader-art">${art(lead.stage, { hoard: lead.hoard, id: "aw-" + a.key, who: lead.name })}</div>
          <div><div class="leader-name">${esc(lead.name)}</div><div class="leader-val">${a.val(lead)}</div></div>`
          : `<div class="leader-none">Up for grabs${a.min ? ` · first to ${a.min} pours` : ""}</div>`}</div>
        ${rest ? `<ol class="runners">${rest}</ol>` : ""}
        ${wait}
        <div class="formula"><span>Formula</span><code>${esc(a.formula)}</code></div>
      </article>`;
    }).join("");

    // rankings
    $("rankBody").innerHTML = list.length ? list.map((r, i) => {
      const open = expanded.has(r.name);
      const id = "rk-" + i;
      const st = stageInfo(r.stage);
      const wins = r.tentWins ? `🏕️×${r.tentWins}` : "—";
      return `<tr class="rank-row${open ? " open" : ""}" data-name="${esc(r.name)}">
        <td class="c-pos">${r.au > 0 ? i + 1 : "–"}</td>
        <td class="c-av"><div class="av">${art(r.stage, { hoard: r.hoard, id, who: r.name })}</div></td>
        <td class="c-who"><button type="button" class="who-btn" aria-expanded="${open}" aria-controls="${id}-d">${esc(r.name)}</button>
          <div class="who-stage">${esc(st.name)}</div>
          <div class="who-mini"><span>${fmtOz(r.oz)} oz</span> · <span>${fmtPct(r.avgAbv, 1)}</span> · <span>${isFinite(r.avgRating) ? r.avgRating.toFixed(1) + "★" : "–★"}</span>${r.tentWins ? ` · <span>${wins}</span>` : ""}</div></td>
        <td class="c-num c-au">${fmtAu(r.au)}</td>
        <td class="c-num">${r.n}</td>
        <td class="c-num c-wide">${fmtOz(r.oz)}</td>
        <td class="c-num c-wide">${fmtPct(r.avgAbv)}</td>
        <td class="c-num c-wide">${isFinite(r.avgRating) ? r.avgRating.toFixed(1) : "—"}</td>
        <td class="c-num c-wide">${wins}</td></tr>
        <tr class="detail-row" id="${id}-d"${open ? "" : " hidden"}><td colspan="9">${open ? detailHtml(r) : ""}</td></tr>`;
    }).join("") : `<tr><td colspan="9" class="empty">No drinkers yet.</td></tr>`;

    // field guide
    $("tents").innerHTML = TENT_ORDER.filter((t) => !LORE.tents[t].hiddenUnlessPoured || tents.has(t)).map((t) => {
      const L = LORE.tents[t], d = tents.get(t);
      const champ = d && d.champs.length ? `<div class="tent-champ"><span class="crown" aria-hidden="true">👑</span> <b>${d.champs.map(esc).join(" &amp; ")}</b> <span class="tent-au">${fmtAu(d.ranked[0][1])} AU${d.champs.length > 1 ? " each" : ""}</span></div>
        ${d.ranked.length > d.champs.length ? `<div class="tent-rest muted">${d.ranked.slice(d.champs.length, d.champs.length + 2).map(([n, au]) => `${esc(n)} ${fmtAu(au)}`).join(" · ")}</div>` : ""}`
        : `<div class="tent-champ muted">No sightings yet. Unclaimed!</div>`;
      return `<article class="card tent"><div class="tent-emoji" aria-hidden="true">${L.emoji}</div>
        <div class="tent-body"><h3>${esc(t)}</h3><p class="tent-blurb">${esc(L.blurb)}</p>${champ}
        <div class="tent-n muted">${d ? plural(d.n, "pour") : "0 pours"}</div></div></article>`;
    }).join("");
    // tents with pours that aren't in the lore (new tent names from the sheet)
    for (const [t, d] of tents) if (!LORE.tents[t] && d.champs.length) $("tents").insertAdjacentHTML("beforeend",
      `<article class="card tent"><div class="tent-emoji" aria-hidden="true">⛺</div><div class="tent-body"><h3>${esc(t)}</h3><div class="tent-champ"><b>${d.champs.map(esc).join(" &amp; ")}</b> <span class="tent-au">${fmtAu(d.ranked[0][1])} AU</span></div></div></article>`);

    // sightings
    const sightRow = (b, val) => `<li><div class="sight-name"><b>${esc(b.beer)}</b>${b.brewery ? ` <span class="muted">· ${esc(b.brewery)}</span>` : ""}</div><div class="sight-val">${val}</div></li>`;
    const most = [...C.beers].sort((a, b) => b.n - a.n || b.au - a.au).slice(0, 10);
    $("mostPoured").innerHTML = most.length ? most.map((b) => sightRow(b, `${plural(b.n, "pour")} · ${fmtAu(b.au)} AU`)).join("") : `<li class="empty">Nothing spotted yet.</li>`;
    const rated = C.beers.filter((b) => b.rN >= 3).map((b) => ({ ...b, avg: b.rSum / b.rN })).sort((a, b) => b.avg - a.avg || b.rN - a.rN).slice(0, 10);
    $("topRated").innerHTML = rated.length ? rated.map((b) => sightRow(b, `<b>${b.avg.toFixed(2)}★</b> · ${plural(b.rN, "rating")}`)).join("") : `<li class="empty">No beer has 3 ratings yet.</li>`;

    // all pours
    const all = [...S.pours].sort(byNewest);
    $("allCount").textContent = `(${all.length})`;
    if (!$("allPoursBox").open) { $("allPours").innerHTML = ""; return; } // filled when opened (can be ~1000 rows)
    $("allPours").innerHTML = all.length ? all.map((p) => pourItem(p, { who: true })).join("") : `<li class="empty">No pours yet.</li>`;
  }
  $("allPoursBox").addEventListener("toggle", () => { if ($("allPoursBox").open) renderBoard(); });
  const expanded = new Set();
  function detailHtml(r) {
    const extra = r.all.length - r.n;
    return `<div class="detail"><div class="detail-h">${esc(r.name)}'s pours · ${esc(stageInfo(r.stage).title)}${r.tentsWon.length ? ` · champion of ${r.tentsWon.map(esc).join(", ")}` : ""}</div>
      <ul class="pour-list">${r.all.map((p) => pourItem(p)).join("") || `<li class="empty">No pours yet.</li>`}</ul>
      ${extra ? `<p class="help">${plural(extra, "pour")} at 0% not counted.</p>` : ""}</div>`;
  }
  $("rankBody").addEventListener("click", (e) => {
    const row = e.target.closest(".rank-row");
    if (!row) return;
    const name = row.dataset.name;
    if (expanded.has(name)) expanded.delete(name); else expanded.add(name);
    const open = expanded.has(name);
    const det = row.nextElementSibling;
    row.classList.toggle("open", open);
    row.querySelector(".who-btn").setAttribute("aria-expanded", open);
    det.hidden = !open;
    det.firstElementChild.innerHTML = open ? detailHtml(C.byName.get(name)) : "";
  });

  // ---------- Admin ----------
  let pin = SS.get("snally-pin", "");
  function renderAdmin() {
    $("pinDemoHint").hidden = !DEMO;
    $("resetDemoBtn").hidden = !DEMO;
    $("pinForm").hidden = !!pin;
    $("adminPanel").hidden = !pin;
    if (!pin) return;
    $("drinkerNames").textContent = S.drinkers.join(", ") || "none yet";
    const all = [...S.pours].sort(byNewest);
    $("adminCount").textContent = `(${all.length})`;
    $("adminPours").innerHTML = all.length ? all.map((p) => pourItem(p, { del: true, who: true })).join("") : `<li class="empty">No pours.</li>`;
  }
  $("pinForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = $("pinInput").value.trim();
    const err = $("pinError");
    if (!v) { err.hidden = false; err.textContent = "Enter the PIN."; return; }
    try {
      const d = await api("checkPin", { pin: v });
      if (!d.ok) throw new Error(d.error || "Wrong PIN.");
      pin = v; SS.set("snally-pin", v); err.hidden = true; $("pinInput").value = "";
      renderAdmin();
    } catch (ex) { err.hidden = false; err.textContent = ex.message; }
  });
  $("lockBtn").addEventListener("click", () => { pin = ""; SS.del("snally-pin"); renderAdmin(); });
  $("addDrinkerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("newDrinker").value.trim(), msg = $("addDrinkerMsg");
    if (!name) { msg.hidden = false; msg.textContent = "Enter a name."; return; }
    try {
      const d = await api("addDrinker", { pin, name });
      if (!d.ok) throw new Error(d.error || "Couldn't add drinker.");
      msg.hidden = true; $("newDrinker").value = "";
      toast(`${name} joined the hoard! 🥚`);
      await refresh();
    } catch (ex) { msg.hidden = false; msg.textContent = ex.message; }
  });
  $("adminPours").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-del]");
    if (!b) return;
    const p = S.pours.find((x) => x.id === b.dataset.del);
    if (!p || !confirm(`Delete ${p.drinker}'s “${p.beer}” (${clock(p.tms)})?`)) return;
    b.disabled = true;
    try {
      const d = await api("deletePour", { id: p.id, pin });
      if (!d.ok) throw new Error(d.error || "Couldn't delete.");
      S.pours = S.pours.filter((x) => x.id !== p.id); S.gen++; S.sig = "";
      renderAll(); toast("Pour deleted.");
    } catch (ex) { b.disabled = false; toast(ex.message, true); }
  });
  $("resetDemoBtn").addEventListener("click", async () => {
    if (!confirm("Reset demo data to fresh fake drinkers?")) return;
    Mock.reset(); await refresh(); toast("Demo data reset.");
  });

  // ---------- routing ----------
  const VIEWS = ["log", "board", "admin"];
  let currentView = "";
  function route() {
    let v = location.hash.slice(1);
    if (!VIEWS.includes(v)) {
      v = LS.get("snally-tab", "log");
      if (!VIEWS.includes(v) || v === "admin") v = "log";
      history.replaceState(null, "", "#" + v);
    }
    if (v !== "admin") LS.set("snally-tab", v);
    currentView = v;
    VIEWS.forEach((x) => { $("view-" + x).hidden = x !== v; });
    ["log", "board"].forEach((x) => { const t = $("tab-" + x); if (x === v) t.setAttribute("aria-current", "page"); else t.removeAttribute("aria-current"); });
    if (v === "admin") renderAdmin();
    if (v === "board") renderBoard();
  }
  window.addEventListener("hashchange", () => { route(); window.scrollTo({ top: 0 }); });

  // ---------- boot ----------
  $("refreshBtn").addEventListener("click", () => refresh(true));
  document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - S.lastAttempt > REFRESH_MS / 2) refresh(); });
  setInterval(() => {
    renderStatus();
    if (!document.hidden && !S.refreshing && Date.now() - S.lastAttempt >= REFRESH_MS) refresh();
  }, 1000);
  setInterval(() => { if (S.loaded && currentView === "log") renderRecent(); }, 15000);

  async function boot() {
    $("demoBanner").hidden = !DEMO;
    $("mastArt").innerHTML = art(3, { hoard: 0.45, id: "mast" }); // stage 5 stays a surprise
    syncSize(); syncRating();
    route();
    renderDrinkers(); renderRecent(); renderBoard(); updateForm();
    await loadBeers();
    await refresh();
  }
  boot();
})();
