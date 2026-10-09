/**
 * Snally Hoard 2026 — backend (Google Apps Script, V8 runtime).
 *
 * Bind this script to a Google Sheet (Extensions -> Apps Script), run setup()
 * once, then Deploy -> Web app (Execute as: Me, Who has access: Anyone).
 * See SETUP.md for the click-by-click guide.
 *
 * Tabs:
 *   Drinkers : Name                                  (organizer-managed)
 *   Beers    : id, brewery, beer, style, abv, est, tent  (loaded from BEERS_URL)
 *   Pours    : id, timestamp, drinker, beerId, brewery, beer, style, abv,
 *              tent, oz, size, rating, custom, deleted
 *
 * API (all responses are JSON: {ok:true, ...} or {ok:false, error:"..."}):
 *   GET  ?action=state
 *   POST {action:"pour", drinker, beerId, beer, brewery, abv, oz, size, rating, clientId}
 *   POST {action:"addDrinker", pin, name}
 *   POST {action:"deletePour", id, pin}            (organizer)
 *   POST {action:"deletePour", id, drinker}        (own pour, within 10 minutes)
 *   POST {action:"checkPin", pin}
 *   POST {action:"resetPours", pin}                (backs up, then clears Pours)
 * The frontend POSTs with Content-Type text/plain and a JSON string body so the
 * browser does not send a CORS preflight (Apps Script cannot answer one).
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Where setup() loads the festival beer list from. */
var BEERS_URL = 'https://raw.githubusercontent.com/xuhanwen97/SnallyTracker/main/beers.json';

var DEFAULT_PIN = 'snally';
var STATE_CACHE_SECONDS = 5;
var SELF_DELETE_MINUTES = 10;

var SIZES = { small: 2, standard: 4, brim: 5.5 }; // ounces; "custom" uses the client oz
var MAX_OZ = 5.5;
var MAX_ABV = 70;

var TABS = {
  drinkers: { name: 'Drinkers', headers: ['Name'] },
  beers: { name: 'Beers', headers: ['id', 'brewery', 'beer', 'style', 'abv', 'est', 'tent'] },
  pours: {
    name: 'Pours',
    headers: ['id', 'timestamp', 'drinker', 'beerId', 'brewery', 'beer', 'style', 'abv',
      'tent', 'oz', 'size', 'rating', 'custom', 'deleted'],
  },
};

// ---------------------------------------------------------------------------
// Pure helpers (no Google services; unit-tested by test.js)
// ---------------------------------------------------------------------------

/** An error whose message is safe to show to the user. */
function ApiError(message) {
  this.message = message;
  this.name = 'ApiError';
}
ApiError.prototype = Object.create(Error.prototype);

function fail_(message) {
  throw new ApiError(message);
}

/** Trim and collapse internal whitespace; non-strings become "". */
function cleanText_(value) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

/** Numbers and numeric strings -> number; anything else -> null. */
function toNumber_(value) {
  if (typeof value === 'number') return isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    var n = Number(value.trim());
    return isFinite(n) ? n : null;
  }
  return null;
}

/** Sheets stores booleans as true/false but hand edits may be "TRUE"/"yes". */
function toBool_(value) {
  if (value === true) return true;
  var s = String(value).trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === '1' || s === 'x';
}

/** Round to `places` decimals. */
function round_(n, places) {
  var f = Math.pow(10, places);
  return Math.round(n * f) / f;
}

/**
 * Text typed by users must not be interpreted as a formula by Sheets.
 * A leading apostrophe makes Sheets store it as literal text (and it is not
 * part of the cell's value when read back).
 */
function sheetSafe_(text) {
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

/**
 * For user/text cells in Pours and Drinkers: always store as literal text.
 * Without the apostrophe Sheets coerces strings that look like numbers, dates
 * or booleans ("1e5", "2026-10-10", "3/4", "TRUE"), which breaks clientId
 * idempotency and mangles names on read-back.
 */
function textCell_(text) {
  text = text === null || text === undefined ? '' : String(text);
  return text === '' ? '' : "'" + text;
}

/** Case-insensitive name match; returns the canonical name from the list, or null. */
function findDrinker_(drinkers, name) {
  var wanted = cleanText_(name).toLowerCase();
  if (!wanted) return null;
  for (var i = 0; i < drinkers.length; i++) {
    if (cleanText_(drinkers[i]).toLowerCase() === wanted) return cleanText_(drinkers[i]);
  }
  return null;
}

/** Validate an ABV value (percent). */
function parseAbv_(value) {
  var abv = toNumber_(value);
  if (abv === null) fail_('ABV is required (a number like 6.5).');
  if (abv < 0 || abv > MAX_ABV) fail_('ABV must be between 0 and ' + MAX_ABV + '%.');
  return round_(abv, 2);
}

/** Validate a rating: 1.0–5.0, rounded to 0.1. */
function parseRating_(value) {
  var r = toNumber_(value);
  if (r === null) fail_('Please give it a rating (1 to 5).');
  if (r < 1 || r > 5) fail_('Rating must be between 1 and 5.');
  return round_(r, 1);
}

/** Validate size + oz; the server decides oz for the preset sizes. */
function parseSize_(size, oz) {
  size = cleanText_(size).toLowerCase();
  if (SIZES.hasOwnProperty(size)) return { size: size, oz: SIZES[size] };
  if (size !== 'custom') fail_('Size must be small, standard, brim or custom.');
  var n = toNumber_(oz);
  if (n === null || n <= 0) fail_('Custom pours need an amount in ounces greater than 0.');
  if (n > MAX_OZ) fail_('Festival pours max out at ' + MAX_OZ + ' oz.');
  return { size: 'custom', oz: round_(n, 2) };
}

/** Validate an optional client-generated id (used for idempotency). */
function parseClientId_(value) {
  if (value === undefined || value === null || value === '') return null;
  var id = String(value);
  if (!/^[A-Za-z0-9._:\-]{1,64}$/.test(id)) fail_('Invalid clientId.');
  return id;
}

/**
 * Build a pour record from a client request. Pure: everything it needs is passed in.
 *   req      : the parsed POST body
 *   drinkers : array of canonical names from the Drinkers tab
 *   beer     : the Beers-tab record for req.beerId (or null if not found / not given)
 *   id, now  : the pour id and timestamp to use
 * Throws ApiError with a human-readable message on bad input.
 */
function buildPour_(req, drinkers, beer, id, now) {
  var drinker = findDrinker_(drinkers, req.drinker);
  if (!drinker) fail_('Unknown drinker "' + cleanText_(req.drinker) + '". Ask the organizer to add you.');

  var pour = { id: id, t: now.toISOString(), drinker: drinker };
  var beerId = cleanText_(req.beerId);

  if (beerId) {
    if (!beer) fail_('That beer is not on the festival list (id ' + beerId + ').');
    pour.beerId = beer.id;
    pour.brewery = beer.brewery;
    pour.beer = beer.beer;
    pour.style = beer.style;
    pour.tent = beer.tent;
    // Never trust the client's ABV for a listed beer — unless the list has none (e.g. "TBD").
    pour.abv = beer.abv === null ? parseAbv_(req.abv) : beer.abv;
    pour.custom = false;
  } else {
    var name = cleanText_(req.beer);
    if (!name) fail_('Custom drinks need a name.');
    if (name.length > 80) fail_('Drink name is too long (80 characters max).');
    pour.beerId = '';
    pour.brewery = cleanText_(req.brewery).slice(0, 80);
    pour.beer = name;
    pour.style = '';
    pour.tent = '';
    pour.abv = parseAbv_(req.abv);
    pour.custom = true;
  }

  var sz = parseSize_(req.size, req.oz);
  pour.oz = sz.oz;
  pour.size = sz.size;
  pour.rating = parseRating_(req.rating);
  return pour;
}

/** Validate a new drinker name against the existing list; returns the cleaned name. */
function validateNewDrinker_(drinkers, name) {
  name = cleanText_(name);
  if (!name) fail_('Name is required.');
  if (name.length > 40) fail_('Name is too long (40 characters max).');
  if (findDrinker_(drinkers, name)) fail_('"' + name + '" is already a drinker.');
  return name;
}

/**
 * May this request delete this pour? Organizer (correct PIN) always can;
 * the drinker who logged it can within SELF_DELETE_MINUTES.
 */
function canDeletePour_(pour, req, pinOk, now) {
  if (pinOk) return true;
  if (!req.drinker || cleanText_(req.drinker).toLowerCase() !== pour.drinker.toLowerCase()) {
    fail_('Only the organizer (with the PIN) or the drinker who logged it can delete a pour.');
  }
  var ageMs = now.getTime() - new Date(pour.t).getTime();
  // !(<=) so a blank or unparseable timestamp (NaN) is treated as too old.
  if (!(ageMs <= SELF_DELETE_MINUTES * 60 * 1000)) {
    fail_('Pours can only be undone within ' + SELF_DELETE_MINUTES + ' minutes. Ask the organizer.');
  }
  return true;
}

/** Map header names to 0-based column indexes. */
function headerIndex_(headerRow) {
  var map = {};
  for (var i = 0; i < headerRow.length; i++) {
    var h = cleanText_(headerRow[i]);
    if (h && !map.hasOwnProperty(h)) map[h] = i;
  }
  return map;
}

/** Convert a Pours-tab row to the API pour shape (plus `deleted`). */
function rowToPour_(row, idx) {
  function get(k) { return idx.hasOwnProperty(k) ? row[idx[k]] : ''; }
  var ts = get('timestamp');
  var d = ts instanceof Date ? ts : new Date(ts);
  var abv = toNumber_(get('abv'));
  return {
    id: String(get('id')),
    t: isNaN(d.getTime()) ? '' : d.toISOString(),
    drinker: cleanText_(get('drinker')),
    beerId: cleanText_(get('beerId')),
    brewery: cleanText_(get('brewery')),
    beer: cleanText_(get('beer')),
    style: cleanText_(get('style')),
    abv: abv,
    tent: cleanText_(get('tent')),
    oz: toNumber_(get('oz')),
    size: cleanText_(get('size')),
    rating: toNumber_(get('rating')),
    custom: toBool_(get('custom')),
    deleted: toBool_(get('deleted')),
  };
}

/** Convert a pour to a Pours-tab row in the sheet's actual column order. */
function pourToRow_(pour, idx, width, timestamp) {
  var row = [];
  for (var i = 0; i < width; i++) row.push('');
  var values = {
    id: textCell_(pour.id), timestamp: timestamp, drinker: textCell_(pour.drinker), beerId: textCell_(pour.beerId),
    brewery: textCell_(pour.brewery), beer: textCell_(pour.beer), style: textCell_(pour.style),
    abv: pour.abv, tent: textCell_(pour.tent), oz: pour.oz, size: textCell_(pour.size),
    rating: pour.rating, custom: pour.custom, deleted: false,
  };
  Object.keys(values).forEach(function (k) {
    if (idx.hasOwnProperty(k)) row[idx[k]] = values[k];
  });
  return row;
}

/** Strip the internal `deleted` flag before sending a pour to clients. */
function publicPour_(p) {
  return {
    id: p.id, t: p.t, drinker: p.drinker, beerId: p.beerId, brewery: p.brewery, beer: p.beer,
    style: p.style, abv: p.abv, tent: p.tent, oz: p.oz, size: p.size, rating: p.rating,
    custom: p.custom,
  };
}

/** Clock, overridable in tests. */
function now_() {
  return new Date();
}

// ---------------------------------------------------------------------------
// Web app entry points
// ---------------------------------------------------------------------------

function doGet(e) {
  return respond_(function () {
    var action = (e && e.parameter && e.parameter.action) || 'state';
    if (action === 'state') return getStateJson_();
    if (action === 'ping') return { ok: true, serverTime: now_().toISOString() };
    fail_('Unknown action "' + action + '".');
  });
}

function doPost(e) {
  return respond_(function () {
    var req;
    try {
      req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    } catch (err) {
      fail_('Request body must be JSON.');
    }
    if (!req || typeof req !== 'object') fail_('Request body must be a JSON object.');
    switch (req.action) {
      case 'pour': return apiPour_(req);
      case 'addDrinker': return apiAddDrinker_(req);
      case 'deletePour': return apiDeletePour_(req);
      case 'checkPin': requirePin_(req.pin); return { ok: true };
      case 'resetPours': requirePin_(req.pin); return { ok: true, backup: backupAndResetPours_() };
      default: fail_('Unknown action "' + req.action + '".');
    }
  });
}

/**
 * Run a handler and turn its result (object, or pre-serialized JSON string)
 * or its error into a ContentService JSON response.
 */
function respond_(handler) {
  var body;
  try {
    var result = handler();
    body = typeof result === 'string' ? result : JSON.stringify(result);
  } catch (err) {
    var msg = err instanceof ApiError ? err.message : 'Server error: ' + (err && err.message ? err.message : err);
    if (!(err instanceof ApiError)) console.error(err && err.stack ? err.stack : err);
    body = JSON.stringify({ ok: false, error: msg });
  }
  return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

function apiPour_(req) {
  var clientId = parseClientId_(req.clientId);
  return withLock_(function () {
    var pours = readPours_();
    if (clientId) {
      // Idempotency: a retried request returns the pour we already stored.
      for (var i = 0; i < pours.rows.length; i++) {
        if (pours.rows[i].id === clientId) return { ok: true, pour: publicPour_(pours.rows[i]), duplicate: true };
      }
    }
    var beerId = cleanText_(req.beerId);
    var beer = beerId ? readBeers_()[beerId] || null : null;
    var now = now_();
    var pour = buildPour_(req, readDrinkers_(), beer, clientId || Utilities.getUuid(), now);
    pours.sheet.appendRow(pourToRow_(pour, pours.idx, pours.width, now)); // appendRow grows the sheet as needed
    bumpVersion_();
    return { ok: true, pour: pour };
  });
}

function apiAddDrinker_(req) {
  requirePin_(req.pin);
  return withLock_(function () {
    var name = validateNewDrinker_(readDrinkers_(), req.name);
    getTab_(TABS.drinkers).appendRow([textCell_(name)]);
    bumpVersion_();
    return { ok: true, name: name, drinkers: readDrinkers_() };
  });
}

function apiDeletePour_(req) {
  var id = cleanText_(req.id);
  if (!id) fail_('Which pour? (id is required)');
  var pinOk = req.pin !== undefined && req.pin !== null && req.pin !== '' && pinMatches_(req.pin);
  if (req.pin && !pinOk && !req.drinker) fail_('Wrong PIN.');
  return withLock_(function () {
    var pours = readPours_();
    for (var i = 0; i < pours.rows.length; i++) {
      var p = pours.rows[i];
      if (p.id !== id) continue;
      if (p.deleted) return { ok: true, id: id, alreadyDeleted: true };
      canDeletePour_(p, req, pinOk, now_());
      pours.sheet.getRange(i + 2, pours.idx.deleted + 1).setValue(true);
      bumpVersion_();
      return { ok: true, id: id };
    }
    fail_('Pour not found (it may have been reset).');
  });
}

// ---------------------------------------------------------------------------
// State (cached)
// ---------------------------------------------------------------------------

/**
 * Returns the state response as a JSON string. The expensive part (drinkers +
 * pours) is cached for a few seconds under a key that includes the data
 * version, so any write through the API invalidates it immediately. Hand
 * edits in the sheet show up once the short cache expires.
 */
function getStateJson_() {
  var cache = CacheService.getScriptCache();
  var key = 'state:' + getVersion_();
  var payload = cacheGetBig_(cache, key);
  if (!payload) {
    var pours = readPours_().rows
      .filter(function (p) { return !p.deleted && p.id; }) // skip blanked-out rows
      .map(publicPour_);
    payload = JSON.stringify({ drinkers: readDrinkers_(), pours: pours });
    cachePutBig_(cache, key, payload, STATE_CACHE_SECONDS);
  }
  // Splice a fresh serverTime onto the cached payload.
  return '{"ok":true,"serverTime":' + JSON.stringify(now_().toISOString()) + ',' + payload.slice(1);
}

// CacheService values are limited to 100KB (bytes, UTF-8), so large payloads are
// split across keys. 30000 chars stays under the limit even if every char is 3 bytes.
var CACHE_CHUNK = 30000;

function cachePutBig_(cache, key, value, seconds) {
  try {
    var parts = {};
    var n = Math.ceil(value.length / CACHE_CHUNK) || 1;
    for (var i = 0; i < n; i++) parts[key + ':' + i] = value.slice(i * CACHE_CHUNK, (i + 1) * CACHE_CHUNK);
    parts[key] = String(n);
    cache.putAll(parts, seconds);
  } catch (err) {
    console.warn('cache put failed: ' + err); // caching is best-effort
  }
}

function cacheGetBig_(cache, key) {
  try {
    var n = Number(cache.get(key));
    if (!n) return null;
    var keys = [];
    for (var i = 0; i < n; i++) keys.push(key + ':' + i);
    var got = cache.getAll(keys);
    var out = '';
    for (var j = 0; j < n; j++) {
      if (typeof got[keys[j]] !== 'string') return null;
      out += got[keys[j]];
    }
    return out;
  } catch (err) {
    return null;
  }
}

/*
 * The data version lives in Script Properties (durable) and is mirrored in the
 * script cache so the every-20s state polls don't hit the Properties quota
 * (50,000 reads/day on consumer accounts; 30 phones polling all day exceeds it).
 */
var VERSION_CACHE_KEY = 'dataVersion';

function getVersion_() {
  var cache = CacheService.getScriptCache();
  var v = null;
  try { v = cache.get(VERSION_CACHE_KEY); } catch (err) { v = null; }
  if (v) return v;
  v = PropertiesService.getScriptProperties().getProperty('DATA_VERSION') || '0';
  try { cache.put(VERSION_CACHE_KEY, v, 21600); } catch (err) { /* best-effort */ }
  return v;
}

function bumpVersion_() {
  // Commit pending sheet writes first, so a state request that sees the new
  // version can't read (and cache under that version) a sheet without them.
  SpreadsheetApp.flush();
  var props = PropertiesService.getScriptProperties();
  var v = String(Number(props.getProperty('DATA_VERSION') || 0) + 1);
  props.setProperty('DATA_VERSION', v);
  try { CacheService.getScriptCache().put(VERSION_CACHE_KEY, v, 21600); } catch (err) { /* best-effort */ }
}

// ---------------------------------------------------------------------------
// Sheet access
// ---------------------------------------------------------------------------

/** Get a tab, creating it with headers if missing. */
function getTab_(tab) {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(tab.name);
  if (!sheet) {
    sheet = ss.insertSheet(tab.name);
    sheet.getRange(1, 1, 1, tab.headers.length).setValues([tab.headers]).setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** All values of a tab including the header row ([] if empty). */
function readAll_(sheet) {
  var rows = sheet.getLastRow();
  var cols = sheet.getLastColumn();
  if (rows < 1 || cols < 1) return [];
  return sheet.getRange(1, 1, rows, cols).getValues();
}

/** Drinker names in sheet order (blank rows and duplicates skipped). */
function readDrinkers_() {
  var values = readAll_(getTab_(TABS.drinkers));
  var out = [];
  for (var i = 1; i < values.length; i++) {
    var name = cleanText_(values[i][0]);
    if (name && !findDrinker_(out, name)) out.push(name);
  }
  return out;
}

/** Beers tab as {id: record}. */
function readBeers_() {
  var values = readAll_(getTab_(TABS.beers));
  if (!values.length) return {};
  var idx = headerIndex_(values[0]);
  var out = {};
  for (var i = 1; i < values.length; i++) {
    var r = values[i];
    var id = cleanText_(r[idx.id]);
    if (!id) continue;
    out[id] = {
      id: id,
      brewery: cleanText_(r[idx.brewery]),
      beer: cleanText_(r[idx.beer]),
      style: cleanText_(r[idx.style]),
      abv: toNumber_(r[idx.abv]),
      est: toBool_(r[idx.est]),
      tent: cleanText_(r[idx.tent]),
    };
  }
  return out;
}

/** Pours tab: {sheet, idx (header map), width, rows: [pour...]}; row i is sheet row i+2. */
function readPours_() {
  var sheet = getTab_(TABS.pours);
  var values = readAll_(sheet);
  var header = values.length ? values[0] : TABS.pours.headers;
  var idx = headerIndex_(header);
  TABS.pours.headers.forEach(function (h) {
    if (!idx.hasOwnProperty(h)) fail_('Pours tab is missing the "' + h + '" column. Re-run setup or fix the header row.');
  });
  var rows = [];
  for (var i = 1; i < values.length; i++) rows.push(rowToPour_(values[i], idx));
  return { sheet: sheet, idx: idx, width: header.length, rows: rows };
}

// ---------------------------------------------------------------------------
// Auth + locking
// ---------------------------------------------------------------------------

function pinMatches_(pin) {
  var real = PropertiesService.getScriptProperties().getProperty('ADMIN_PIN') || DEFAULT_PIN;
  return cleanText_(pin) !== '' && cleanText_(pin) === cleanText_(real);
}

function requirePin_(pin) {
  if (!pinMatches_(pin)) fail_('Wrong PIN.');
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    fail_('The server is busy — please try again in a moment.');
  }
  try {
    var result = fn();
    SpreadsheetApp.flush();
    return result;
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Setup, beer loading, reset (run from the editor or the "Snally" menu)
// ---------------------------------------------------------------------------

/**
 * One-time setup: creates the tabs, sets a default ADMIN_PIN if none, and
 * loads the beer list if the Beers tab is empty. Safe to run again.
 */
function setup() {
  getTab_(TABS.drinkers);
  getTab_(TABS.pours);
  var beers = getTab_(TABS.beers);
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ADMIN_PIN')) props.setProperty('ADMIN_PIN', DEFAULT_PIN);
  var loaded = beers.getLastRow() <= 1 ? loadBeers_() : null;
  bumpVersion_();
  var msg = 'Snally setup done. ' +
    (loaded === null ? 'Beers tab already filled (use the menu to reload).' : 'Loaded ' + loaded + ' beers.');
  console.log(msg);
  return msg;
}

/** Fetch beers.json from BEERS_URL and replace the Beers tab contents. Returns count. */
function loadBeers_() {
  var res = UrlFetchApp.fetch(BEERS_URL, { muteHttpExceptions: true });
  if (res.getResponseCode() !== 200) {
    throw new Error('Could not download the beer list (HTTP ' + res.getResponseCode() + ') from ' + BEERS_URL);
  }
  var data = JSON.parse(res.getContentText());
  var list = Array.isArray(data) ? data : data.beers;
  if (!list || !list.length) throw new Error('Beer list at ' + BEERS_URL + ' is empty.');
  var headers = TABS.beers.headers;
  var rows = list.map(function (b) {
    return [
      String(b.id), sheetSafe_(cleanText_(b.brewery)), sheetSafe_(cleanText_(b.beer)),
      sheetSafe_(cleanText_(b.style)), b.abv === null || b.abv === undefined ? '' : Number(b.abv),
      !!b.est, sheetSafe_(cleanText_(b.tent)),
    ];
  });
  var sheet = getTab_(TABS.beers);
  var last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 1, last - 1, Math.max(sheet.getLastColumn(), headers.length)).clearContent();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  if (sheet.getMaxRows() < rows.length + 1) sheet.insertRowsAfter(sheet.getMaxRows(), rows.length + 1 - sheet.getMaxRows());
  // Text columns as plain text so names like "1554" or "3/4" are not turned into numbers/dates.
  sheet.getRange(2, 1, rows.length, 4).setNumberFormat('@');
  sheet.getRange(2, 7, rows.length, 1).setNumberFormat('@');
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  return rows.length;
}

/** Copy Pours to "Pours backup <timestamp>", then clear all pour rows (keeps header). */
function backupAndResetPours_() {
  return withLock_(function () {
    var ss = SpreadsheetApp.getActive();
    var sheet = getTab_(TABS.pours);
    var name = 'Pours backup ' + Utilities.formatDate(now_(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    sheet.copyTo(ss).setName(name);
    var last = sheet.getLastRow();
    if (last > 1) sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).clearContent();
    bumpVersion_();
    return name;
  });
}

// --- Menu ------------------------------------------------------------------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Snally')
    .addItem('Setup / reload beers', 'menuSetupReloadBeers')
    .addItem('Back up & reset pours', 'menuResetPours')
    .addToUi();
}

function menuSetupReloadBeers() {
  setup();
  var n = loadBeers_();
  bumpVersion_();
  SpreadsheetApp.getUi().alert('Setup done. Loaded ' + n + ' beers from:\n' + BEERS_URL);
}

function menuResetPours() {
  var ui = SpreadsheetApp.getUi();
  var answer = ui.alert('Back up & reset pours?',
    'This copies the Pours tab to a backup tab and then empties it. Everyone\'s leaderboard starts from zero.',
    ui.ButtonSet.OK_CANCEL);
  if (answer !== ui.Button.OK) return;
  ui.alert('Done. Old pours saved in tab "' + backupAndResetPours_() + '".');
}
