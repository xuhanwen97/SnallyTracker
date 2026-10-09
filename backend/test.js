#!/usr/bin/env node
/**
 * Tests for Code.gs. No dependencies:  node snally/backend/test.js
 *
 * Loads Code.gs into a vm context with small in-memory fakes of the Apps Script
 * services it uses, then drives doGet/doPost the way the frontend would.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const crypto = require('crypto');

const CODE = fs.readFileSync(path.join(__dirname, 'Code.gs'), 'utf8');
const BEERS_JSON = fs.readFileSync(path.join(__dirname, '..', 'beers.json'), 'utf8');

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

/** Mimic how Sheets stores a written value (leading ' forces literal text). */
function storeValue(v) {
  if (typeof v === 'string' && v.startsWith("'")) return v.slice(1);
  if (typeof v === 'string' && /^[=+\-@]/.test(v) && v.length > 1) throw new Error('formula written to sheet: ' + v);
  // Like real Sheets, unquoted strings that look like numbers/booleans/dates are coerced.
  if (typeof v === 'string' && v.trim() !== '' && isFinite(Number(v))) return Number(v);
  if (typeof v === 'string' && /^(true|false)$/i.test(v)) return v.toLowerCase() === 'true';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(v + 'T00:00:00');
  return v;
}

class FakeRange {
  constructor(sheet, row, col, nr, nc) { Object.assign(this, { sheet, row, col, nr, nc }); }
  getValues() {
    const out = [];
    for (let r = 0; r < this.nr; r++) {
      const src = this.sheet.data[this.row - 1 + r] || [];
      const line = [];
      for (let c = 0; c < this.nc; c++) {
        const v = src[this.col - 1 + c];
        line.push(v === undefined ? '' : v);
      }
      out.push(line);
    }
    return out;
  }
  setValues(values) {
    assert.strictEqual(values.length, this.nr, 'setValues row count');
    values.forEach((line, r) => {
      assert.strictEqual(line.length, this.nc, 'setValues col count');
      line.forEach((v, c) => this.sheet.set(this.row + r, this.col + c, storeValue(v)));
    });
    return this;
  }
  setValue(v) { this.sheet.set(this.row, this.col, storeValue(v)); return this; }
  clearContent() {
    for (let r = 0; r < this.nr; r++) for (let c = 0; c < this.nc; c++) this.sheet.set(this.row + r, this.col + c, '');
    return this;
  }
  setNumberFormat() { return this; }
  setFontWeight() { return this; }
}

class FakeSheet {
  constructor(ss, name) { this.ss = ss; this.name = name; this.data = []; this.maxRows = 1000; this.frozen = 0; }
  getName() { return this.name; }
  setName(n) { this.name = n; return this; }
  set(r, c, v) {
    if (r > this.maxRows) throw new Error('range outside sheet dimensions');
    while (this.data.length < r) this.data.push([]);
    this.data[r - 1][c - 1] = v;
  }
  getLastRow() {
    for (let r = this.data.length; r > 0; r--) if (this.data[r - 1].some((v) => v !== '' && v !== undefined)) return r;
    return 0;
  }
  getLastColumn() {
    let m = 0;
    this.data.forEach((row) => row.forEach((v, i) => { if (v !== '' && v !== undefined) m = Math.max(m, i + 1); }));
    return m;
  }
  getMaxRows() { return this.maxRows; }
  insertRowsAfter(after, n) { this.maxRows += n; return this; }
  getRange(row, col, nr = 1, nc = 1) {
    if (row < 1 || col < 1 || nr < 1 || nc < 1) throw new Error(`bad range ${row},${col},${nr},${nc}`);
    return new FakeRange(this, row, col, nr, nc);
  }
  appendRow(values) {
    const r = this.getLastRow() + 1;
    if (r > this.maxRows) this.maxRows = r;
    values.forEach((v, i) => this.set(r, i + 1, storeValue(v)));
    return this;
  }
  setFrozenRows(n) { this.frozen = n; }
  copyTo(ss) {
    const copy = new FakeSheet(ss, 'Copy of ' + this.name);
    copy.data = this.data.map((row) => row.slice());
    ss.sheets.push(copy);
    return copy;
  }
  /** Test helper: rows as objects keyed by header. */
  objects() {
    const [h, ...rows] = this.data;
    return rows.map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]])));
  }
}

class FakeSpreadsheet {
  constructor() { this.sheets = [new FakeSheet(this, 'Sheet1')]; }
  getSheetByName(n) { return this.sheets.find((s) => s.name === n) || null; }
  insertSheet(n) {
    if (this.getSheetByName(n)) throw new Error('sheet exists: ' + n);
    const s = new FakeSheet(this, n); this.sheets.push(s); return s;
  }
  getSheets() { return this.sheets.slice(); }
}

function makeContext() {
  const ss = new FakeSpreadsheet();
  const props = {};
  const cache = new Map();
  const stats = { fetches: 0, cacheHits: 0, lockWaits: 0, propReads: 0, events: [] };
  const ctx = {
    console: { log() {}, warn() {}, error() {} },
    SpreadsheetApp: { getActive: () => ss, flush() { stats.events.push('flush'); } },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (body) => ({ body, mime: null, setMimeType(m) { this.mime = m; return this; }, getContent() { return this.body; } }),
    },
    CacheService: {
      getScriptCache: () => ({
        get: (k) => { const v = cache.get(k); if (v !== undefined) stats.cacheHits++; return v === undefined ? null : v; },
        getAll: (keys) => Object.fromEntries(keys.filter((k) => cache.has(k)).map((k) => [k, cache.get(k)])),
        put: (k, v) => { if (Buffer.byteLength(v, 'utf8') > 100 * 1024 || k.length > 250) throw new Error('too big'); cache.set(k, v); },
        putAll: (o) => { for (const [k, v] of Object.entries(o)) { if (Buffer.byteLength(v, 'utf8') > 100 * 1024 || k.length > 250) throw new Error('too big'); cache.set(k, v); } },
      }),
    },
    LockService: { getScriptLock: () => ({ waitLock() { stats.lockWaits++; }, releaseLock() {} }) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k) => { stats.propReads++; return k in props ? props[k] : null; },
        setProperty: (k, v) => { stats.events.push('set:' + k); props[k] = String(v); },
      }),
    },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      formatDate: (d) => d.toISOString().replace('T', ' ').slice(0, 19),
    },
    Session: { getScriptTimeZone: () => 'America/New_York' },
    UrlFetchApp: {
      fetch: () => { stats.fetches++; return { getResponseCode: () => 200, getContentText: () => BEERS_JSON }; },
    },
  };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx, { filename: 'Code.gs' });
  return { ctx, ss, props, cache, stats };
}

// ---------------------------------------------------------------------------
// Tiny test runner
// ---------------------------------------------------------------------------

const { ctx, ss, props, cache, stats } = makeContext();
let clock = new Date('2026-10-10T16:00:00Z');
ctx.now_ = () => new Date(clock.getTime()); // override the clock in Code.gs

const get = (params) => JSON.parse(ctx.doGet({ parameter: params }).getContent());
const post = (body) => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body), type: 'text/plain' } }).getContent());
const PIN = 'snally';
const BEERS = JSON.parse(BEERS_JSON).beers;
const zombie = BEERS.find((b) => b.id === 'r3');
const tbd = BEERS.find((b) => b.abv === null);

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed++; console.log('  ok   ' + name); } catch (e) { failures.push(name); console.log('  FAIL ' + name + '\n       ' + (e.stack || e).toString().split('\n').slice(0, 3).join('\n       ')); }
}
function expectError(res, pattern) {
  assert.strictEqual(res.ok, false, 'expected failure, got ' + JSON.stringify(res));
  assert.match(res.error, pattern);
}

console.log('Code.gs tests');

test('setup creates tabs, default PIN and loads beers', () => {
  ctx.setup();
  for (const n of ['Drinkers', 'Beers', 'Pours']) assert.ok(ss.getSheetByName(n), n + ' tab');
  assert.strictEqual(props.ADMIN_PIN, 'snally');
  const beers = ss.getSheetByName('Beers');
  assert.deepStrictEqual(beers.data[0], ['id', 'brewery', 'beer', 'style', 'abv', 'est', 'tent']);
  assert.strictEqual(beers.getLastRow() - 1, BEERS.length);
  assert.deepStrictEqual(ss.getSheetByName('Pours').data[0].length, 14);
  assert.strictEqual(stats.fetches, 1);
});

test('setup is safe to re-run (does not refetch beers)', () => {
  ctx.setup();
  assert.strictEqual(stats.fetches, 1);
  assert.strictEqual(ss.getSheetByName('Beers').getLastRow() - 1, BEERS.length);
});

test('checkPin', () => {
  assert.strictEqual(post({ action: 'checkPin', pin: PIN }).ok, true);
  expectError(post({ action: 'checkPin', pin: 'nope' }), /PIN/);
  expectError(post({ action: 'checkPin' }), /PIN/);
});

test('addDrinker rejects bad PIN', () => {
  expectError(post({ action: 'addDrinker', pin: 'wrong', name: 'Hanwen' }), /Wrong PIN/);
  assert.deepStrictEqual(get({ action: 'state' }).drinkers, []);
});

test('addDrinker adds names, rejects duplicates and bad names', () => {
  assert.strictEqual(post({ action: 'addDrinker', pin: PIN, name: '  Hanwen ' }).ok, true);
  assert.strictEqual(post({ action: 'addDrinker', pin: PIN, name: 'Sam' }).ok, true);
  expectError(post({ action: 'addDrinker', pin: PIN, name: 'hanwen' }), /already/);
  expectError(post({ action: 'addDrinker', pin: PIN, name: '' }), /required/);
  expectError(post({ action: 'addDrinker', pin: PIN, name: 'x'.repeat(41) }), /too long/);
  // organizer can also type straight into the sheet
  ss.getSheetByName('Drinkers').appendRow(['Alex']);
  assert.deepStrictEqual(get({ action: 'state' }).drinkers, ['Hanwen', 'Sam', 'Alex']);
});

let firstPour;
test('valid listed pour copies beer data from the sheet, not the client', () => {
  const res = post({ action: 'pour', drinker: 'HANWEN', beerId: 'r3', beer: 'Fake', abv: 60, oz: 99, size: 'standard', rating: 4.26, clientId: 'c-1' });
  assert.strictEqual(res.ok, true, JSON.stringify(res));
  firstPour = res.pour;
  assert.strictEqual(res.pour.id, 'c-1');
  assert.strictEqual(res.pour.drinker, 'Hanwen');
  assert.strictEqual(res.pour.beer, zombie.beer);
  assert.strictEqual(res.pour.brewery, zombie.brewery);
  assert.strictEqual(res.pour.tent, zombie.tent);
  assert.strictEqual(res.pour.abv, zombie.abv);
  assert.strictEqual(res.pour.oz, 4);
  assert.strictEqual(res.pour.rating, 4.3);
  assert.strictEqual(res.pour.custom, false);
  assert.strictEqual(res.pour.t, clock.toISOString());
  const row = ss.getSheetByName('Pours').objects()[0];
  assert.strictEqual(row.deleted, false);
  assert.ok(row.timestamp instanceof Date);
});

test('preset sizes force oz server-side', () => {
  assert.strictEqual(post({ action: 'pour', drinker: 'Sam', beerId: 'r4', size: 'small', oz: 5, rating: 3 }).pour.oz, 2);
  const brim = post({ action: 'pour', drinker: 'Sam', beerId: 'r4', size: 'brim', rating: 3 });
  assert.strictEqual(brim.pour.oz, 5.5);
  assert.ok(brim.pour.id.length > 10, 'server generated uuid');
  expectError(post({ action: 'pour', drinker: 'Sam', beerId: 'r4', size: 'pint', rating: 3 }), /Size/);
});

test('listed beer with blank ABV requires client ABV', () => {
  assert.ok(tbd, 'beers.json has a null-abv beer');
  expectError(post({ action: 'pour', drinker: 'Sam', beerId: tbd.id, size: 'standard', rating: 3 }), /ABV/);
  const res = post({ action: 'pour', drinker: 'Sam', beerId: tbd.id, abv: 11.5, size: 'standard', rating: 3 });
  assert.strictEqual(res.ok, true, JSON.stringify(res));
  assert.strictEqual(res.pour.abv, 11.5);
  assert.strictEqual(res.pour.tent, tbd.tent);
});

test('custom pour', () => {
  const res = post({ action: 'pour', drinker: 'alex', beer: '  Mystery   Sour ', brewery: 'Friend', abv: '7.2', size: 'custom', oz: 3, rating: 5 });
  assert.strictEqual(res.ok, true, JSON.stringify(res));
  assert.deepStrictEqual(
    { beer: res.pour.beer, brewery: res.pour.brewery, abv: res.pour.abv, oz: res.pour.oz, tent: res.pour.tent, custom: res.pour.custom, beerId: res.pour.beerId },
    { beer: 'Mystery Sour', brewery: 'Friend', abv: 7.2, oz: 3, tent: '', custom: true, beerId: '' });
});

test('custom pour validation', () => {
  expectError(post({ action: 'pour', drinker: 'Alex', beer: '', abv: 5, size: 'standard', rating: 3 }), /name/);
  expectError(post({ action: 'pour', drinker: 'Alex', beer: 'x'.repeat(81), abv: 5, size: 'standard', rating: 3 }), /too long/);
  expectError(post({ action: 'pour', drinker: 'Alex', beer: 'Thing', size: 'standard', rating: 3 }), /ABV/);
  expectError(post({ action: 'pour', drinker: 'Alex', beer: 'Thing', abv: 71, size: 'standard', rating: 3 }), /ABV/);
  expectError(post({ action: 'pour', drinker: 'Alex', beer: 'Thing', abv: 'strong', size: 'standard', rating: 3 }), /ABV/);
});

test('formula-looking text is stored as literal text', () => {
  const res = post({ action: 'pour', drinker: 'Alex', beer: '=IMPORTXML("x")', abv: 5, size: 'standard', rating: 3 });
  assert.strictEqual(res.ok, true, JSON.stringify(res));
  const rows = ss.getSheetByName('Pours').objects();
  assert.strictEqual(rows[rows.length - 1].beer, '=IMPORTXML("x")');
});

test('oversize custom oz rejected', () => {
  expectError(post({ action: 'pour', drinker: 'Alex', beerId: 'r3', size: 'custom', oz: 5.6, rating: 3 }), /5\.5/);
  expectError(post({ action: 'pour', drinker: 'Alex', beerId: 'r3', size: 'custom', oz: 0, rating: 3 }), /greater than 0/);
  expectError(post({ action: 'pour', drinker: 'Alex', beerId: 'r3', size: 'custom', rating: 3 }), /ounces/);
  assert.strictEqual(post({ action: 'pour', drinker: 'Alex', beerId: 'r3', size: 'custom', oz: 5.5, rating: 3 }).pour.oz, 5.5);
});

test('unknown drinker rejected', () => {
  expectError(post({ action: 'pour', drinker: 'Mallory', beerId: 'r3', size: 'standard', rating: 3 }), /Unknown drinker/);
  expectError(post({ action: 'pour', beerId: 'r3', size: 'standard', rating: 3 }), /Unknown drinker/);
});

test('unknown beerId rejected', () => {
  expectError(post({ action: 'pour', drinker: 'Sam', beerId: 'r99999', beer: 'Sneaky', abv: 5, size: 'standard', rating: 3 }), /not on the festival list/);
});

test('rating out of range rejected', () => {
  expectError(post({ action: 'pour', drinker: 'Sam', beerId: 'r3', size: 'standard', rating: 0.9 }), /Rating/);
  expectError(post({ action: 'pour', drinker: 'Sam', beerId: 'r3', size: 'standard', rating: 5.1 }), /Rating/);
  expectError(post({ action: 'pour', drinker: 'Sam', beerId: 'r3', size: 'standard' }), /rating/);
  assert.strictEqual(post({ action: 'pour', drinker: 'Sam', beerId: 'r3', size: 'standard', rating: 1 }).pour.rating, 1);
});

test('idempotent clientId returns the existing pour', () => {
  const before = ss.getSheetByName('Pours').getLastRow();
  const res = post({ action: 'pour', drinker: 'Hanwen', beerId: 'r3', size: 'standard', rating: 4.26, clientId: 'c-1' });
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.duplicate, true);
  assert.deepStrictEqual(res.pour, firstPour);
  assert.strictEqual(ss.getSheetByName('Pours').getLastRow(), before);
  expectError(post({ action: 'pour', drinker: 'Hanwen', beerId: 'r3', size: 'standard', rating: 4, clientId: 'bad id!' }), /clientId/);
});

test('state returns drinkers + pours in API shape', () => {
  const st = get({ action: 'state' });
  assert.strictEqual(st.ok, true);
  assert.ok(st.serverTime);
  const p = st.pours.find((x) => x.id === 'c-1');
  assert.deepStrictEqual(p, firstPour);
  assert.deepStrictEqual(Object.keys(p).sort(), ['abv', 'beer', 'beerId', 'brewery', 'custom', 'drinker', 'id', 'oz', 'rating', 'size', 'style', 't', 'tent']);
  assert.strictEqual(get({}).ok, true, 'default action is state');
  expectError(get({ action: 'nope' }), /Unknown action/);
});

test('state is cached and invalidated by writes', () => {
  const a = get({ action: 'state' });
  const hits = stats.cacheHits;
  const b = get({ action: 'state' });
  assert.ok(stats.cacheHits > hits, 'second read served from cache');
  assert.deepStrictEqual(a.pours, b.pours);
  post({ action: 'pour', drinker: 'Sam', beerId: 'r5', size: 'standard', rating: 2, clientId: 'c-cache' });
  assert.ok(get({ action: 'state' }).pours.some((p) => p.id === 'c-cache'), 'new pour visible immediately');
});

test('state survives payloads larger than one cache entry', () => {
  for (let i = 0; i < 450; i++) post({ action: 'pour', drinker: 'Alex', beerId: BEERS[i % BEERS.length].id, abv: 5, size: 'small', rating: 3, clientId: 'bulk-' + i });
  const a = get({ action: 'state' });
  const b = get({ action: 'state' });
  assert.ok(JSON.stringify(a.pours).length > 100000, 'payload is big');
  assert.deepStrictEqual(a.pours, b.pours);
  assert.ok([...cache.keys()].some((k) => /:1$/.test(k)), 'stored in multiple chunks');
});

test('deletePour: organizer with PIN; deleted pours drop out of state', () => {
  expectError(post({ action: 'deletePour', pin: 'wrong', id: 'c-cache' }), /PIN/);
  assert.strictEqual(post({ action: 'deletePour', pin: PIN, id: 'c-cache' }).ok, true);
  assert.ok(!get({ action: 'state' }).pours.some((p) => p.id === 'c-cache'));
  assert.strictEqual(post({ action: 'deletePour', pin: PIN, id: 'c-cache' }).alreadyDeleted, true);
  expectError(post({ action: 'deletePour', pin: PIN, id: 'missing' }), /not found/);
  // deleted pours still exist in the sheet (soft delete)
  assert.strictEqual(ss.getSheetByName('Pours').objects().find((r) => r.id === 'c-cache').deleted, true);
});

test('drinker can delete own pour within 10 minutes only', () => {
  clock = new Date('2026-10-10T17:00:00Z');
  post({ action: 'pour', drinker: 'Sam', beerId: 'r6', size: 'standard', rating: 3, clientId: 'c-mine' });
  post({ action: 'pour', drinker: 'Sam', beerId: 'r6', size: 'standard', rating: 3, clientId: 'c-old' });
  clock = new Date('2026-10-10T17:09:00Z');
  expectError(post({ action: 'deletePour', id: 'c-mine', drinker: 'Hanwen' }), /organizer/);
  expectError(post({ action: 'deletePour', id: 'c-mine' }), /organizer/);
  assert.strictEqual(post({ action: 'deletePour', id: 'c-mine', drinker: 'sam' }).ok, true);
  assert.ok(!get({ action: 'state' }).pours.some((p) => p.id === 'c-mine'));
  clock = new Date('2026-10-10T17:11:00Z');
  expectError(post({ action: 'deletePour', id: 'c-old', drinker: 'Sam' }), /10 minutes/);
  assert.ok(get({ action: 'state' }).pours.some((p) => p.id === 'c-old'));
});

test('bad request bodies give readable errors', () => {
  const r = JSON.parse(ctx.doPost({ postData: { contents: 'not json' } }).getContent());
  expectError(r, /JSON/);
  expectError(post({ action: 'launchMissiles' }), /Unknown action/);
});

test('resetPours backs up then clears (PIN required)', () => {
  expectError(post({ action: 'resetPours', pin: 'x' }), /PIN/);
  const n = ss.getSheetByName('Pours').getLastRow();
  const res = post({ action: 'resetPours', pin: PIN });
  assert.strictEqual(res.ok, true, JSON.stringify(res));
  const backup = ss.getSheetByName(res.backup);
  assert.ok(backup && /^Pours backup /.test(res.backup));
  assert.strictEqual(backup.getLastRow(), n);
  assert.strictEqual(ss.getSheetByName('Pours').getLastRow(), 1);
  assert.deepStrictEqual(get({ action: 'state' }).pours, []);
  assert.strictEqual(post({ action: 'pour', drinker: 'Sam', beerId: 'r3', size: 'standard', rating: 3 }).ok, true);
});

test('numeric/date/boolean-looking text survives the sheet round trip', () => {
  for (const id of ['1e5', '2026-10-10', '0123']) {
    const a = post({ action: 'pour', drinker: 'Sam', beer: 'TRUE', brewery: '1554', abv: 5, size: 'small', rating: 3, clientId: id });
    assert.strictEqual(a.ok, true, JSON.stringify(a));
    const b = post({ action: 'pour', drinker: 'Sam', beer: 'TRUE', abv: 5, size: 'small', rating: 3, clientId: id });
    assert.strictEqual(b.duplicate, true, 'idempotent for clientId ' + id);
  }
  const p = get({ action: 'state' }).pours.find((x) => x.id === '0123');
  assert.strictEqual(p.beer, 'TRUE');
  assert.strictEqual(p.brewery, '1554');
  assert.strictEqual(post({ action: 'addDrinker', pin: PIN, name: '2026-10-10' }).ok, true);
  assert.ok(get({ action: 'state' }).drinkers.includes('2026-10-10'));
});

test('self-delete refused when the timestamp is blank/unparseable', () => {
  post({ action: 'pour', drinker: 'Sam', beerId: 'r3', size: 'standard', rating: 3, clientId: 'c-nots' });
  const sheet = ss.getSheetByName('Pours');
  const r = sheet.objects().findIndex((x) => x.id === 'c-nots') + 2;
  sheet.set(r, sheet.data[0].indexOf('timestamp') + 1, '');
  expectError(post({ action: 'deletePour', id: 'c-nots', drinker: 'Sam' }), /10 minutes/);
});

test('blanked-out rows in Pours are not served as pours', () => {
  const sheet = ss.getSheetByName('Pours');
  const r = sheet.objects().findIndex((x) => x.id === 'c-nots') + 2;
  for (let c = 1; c <= 14; c++) sheet.set(r, c, '');
  post({ action: 'pour', drinker: 'Sam', beerId: 'r3', size: 'standard', rating: 3, clientId: 'c-after' }); // bump version
  const st = get({ action: 'state' });
  assert.ok(st.pours.every((p) => p.id && p.drinker), JSON.stringify(st.pours.filter((p) => !p.id)));
});

test('writes flush the sheet before bumping the data version', () => {
  stats.events.length = 0;
  post({ action: 'pour', drinker: 'Sam', beerId: 'r3', size: 'standard', rating: 3 });
  const set = stats.events.indexOf('set:DATA_VERSION');
  assert.ok(set > 0 && stats.events.slice(0, set).includes('flush'), stats.events.join(','));
});

test('state polling does not read Script Properties every time', () => {
  get({ action: 'state' });
  const before = stats.propReads;
  for (let i = 0; i < 50; i++) get({ action: 'state' });
  assert.strictEqual(stats.propReads, before, 'version served from cache');
});

test('multi-byte payloads stay under the 100KB cache value limit', () => {
  for (let i = 0; i < 300; i++) post({ action: 'pour', drinker: 'Alex', beer: '\u{1F37A}'.repeat(40), brewery: 'Põhjala Kölsch Rosé', abv: 5, size: 'small', rating: 3, clientId: 'mb-' + i });
  const a = get({ action: 'state' });
  const hits = stats.cacheHits;
  const b = get({ action: 'state' });
  assert.ok(stats.cacheHits > hits, 'served from cache');
  assert.deepStrictEqual(a.pours, b.pours);
});

test('responses are JSON ContentService outputs', () => {
  const out = ctx.doGet({ parameter: { action: 'state' } });
  assert.strictEqual(out.mime, 'application/json');
});

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length) process.exit(1);
