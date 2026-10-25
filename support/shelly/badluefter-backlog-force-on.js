/**
 * Shelly 2PM Gen4 - Badezimmerluefter mit Zeitkonto und force_on.
 * O2 bleibt eingeschaltet bei force_on=true ODER backlog_sec>0.
 * Kaminfreigabe bleibt durch die vorhandene Verdrahtung wirksam.
 * Zeitkonto laeuft auch bei force_on weiter; Abbau nur mit O2 und Kamin frei.
 * restzeit: editierbares virtuelles Number (Minuten, 0..60), automatisch angelegt.
 * Skriptneustart uebernimmt restzeit; Geraeteneustart setzt sie auf 0.
 * Eigene Anzeige-Updates aendern das interne sekundengenaue Zeitkonto nicht.
 * Nur ein Switch.Set gleichzeitig, keine unbedingte Status-Rueckkopplung.
 */

// -------------------- Konfiguration --------------------

// Virtuelle Boolean-Komponente für Präsenz (in Shelly "Virtual components" als Boolean anlegen)
let PRESENCE_BOOL_ID = 200;          // <-- ggf. anpassen (meist 200..299)

// Shelly 2PM: O1 = switch:0, O2 = switch:1
// null: bestehendes Boolean mit exakt dem Namen force_on automatisch suchen.
// Alternativ hier die tatsaechliche numerische Komponenten-ID eintragen.
let FORCE_ON_BOOL_ID = null;
let FORCE_ON_BOOL_NAME = "force_on";

// null: anhand des exakten Namens suchen, bei Fehlen automatisch anlegen.
let RESTZEIT_NUMBER_ID = null;
let RESTZEIT_NUMBER_NAME = "restzeit";

let FAN_SWITCH_ID = 1;               // O2 = switch:1

// S1 ist input:0, S2 ist input:1 (Standard bei 2PM)
let KAMIN_INPUT = "input:0";         // S1 -> "Kamin frei" (über K1)

// Zeitparameter
let TICK_MS = 10 * 1000;             // 10s Takt
let PRESENCE_DEBOUNCE_SEC = 90;      // Präsenz muss so lange anliegen, bevor "Session" zählt
let ADD_SEC_PER_MIN_PRESENT = 60;    // pro Minute Präsenz +60s Backlog
let MAX_BACKLOG_SEC = 60 * 60;       // max 60 Minuten
let MIN_POSTRUN_SEC = 10 * 60;       // min. 10 Minuten Nachlauf, wenn echter Besuch
let MIN_SESSION_FOR_POSTRUN_SEC = 3 * 60; // erst ab 3 Minuten "echter Besuch" -> min Nachlauf

// Optional: Logging
let DEBUG = true;


// -------------------- interner Zustand --------------------

let backlog_sec = 0;

let presence_raw = false;        // aktueller Präsenzwert (virtuelles Boolean)
let presence_on_since = 0;       // Uptime (sec), seit wann presence_raw = true
let session_active = false;      // Debounce bestanden, wir zählen Präsenzzeit
let session_start_ts = 0;        // Uptime (sec)

let last_add_ts = 0;             // ts (sec) wann wir zuletzt Präsenz-Minuten addiert haben
let last_tick_ts = 0;
let drain_was_allowed = false;
let force_on = false;
let fan_call_pending = false;
let fan_retry_after = 0;
let fast_tick_timer = null;
let fan_retry_timer = null;
let restzeit_handle = null;
let own_source = null;
let last_restzeit_sent = null;
let restzeit_retry_after = 0;


// -------------------- Helfer --------------------

function nowSec() {
  // Uptime statt Wanduhr: NTP-Korrekturen veraendern das Zeitkonto nicht.
  return Shelly.getComponentStatus("sys").uptime;
}

function log(msg) {
  if (DEBUG) print("[bathfan] " + msg);
}

function clampBacklog() {
  if (backlog_sec < 0) backlog_sec = 0;
  if (backlog_sec > MAX_BACKLOG_SEC) backlog_sec = MAX_BACKLOG_SEC;
}

function readPresence() {
  let st = Shelly.getComponentStatus("boolean", PRESENCE_BOOL_ID);
  return !!(st && st.value);
}

function readKaminFrei() {
  let st = Shelly.getComponentStatus(KAMIN_INPUT);
  return !!(st && st.state);
}

function resolveForceOnId() {
  if (FORCE_ON_BOOL_ID === null) {
    let found = null;
    for (let id = 200; id <= 299; id++) {
      let cfg = Shelly.getComponentConfig("boolean", id);
      if (cfg && cfg.name === FORCE_ON_BOOL_NAME) {
        if (found !== null) throw new Error("Mehrere Booleans namens force_on: ID konfigurieren");
        found = id;
      }
    }
    FORCE_ON_BOOL_ID = found;
  }
  if (FORCE_ON_BOOL_ID === null || FORCE_ON_BOOL_ID === PRESENCE_BOOL_ID) {
    throw new Error("force_on nicht eindeutig gefunden: FORCE_ON_BOOL_ID konfigurieren");
  }
  let st = Shelly.getComponentStatus("boolean", FORCE_ON_BOOL_ID);
  if (!st || typeof st.value !== "boolean") {
    throw new Error("force_on: ungueltige Boolean-Komponente");
  }
  log("force_on = boolean:" + FORCE_ON_BOOL_ID);
}

function readForceOn() {
  let st = Shelly.getComponentStatus("boolean", FORCE_ON_BOOL_ID);
  return !!(st && st.value === true);
}

function readFanOutput() {
  let st = Shelly.getComponentStatus("switch", FAN_SWITCH_ID);
  return st && st.output;
}

function scheduleTick() {
  if (fast_tick_timer !== null) return;
  fast_tick_timer = Timer.set(100, false, runFastTick);
}

function runFastTick() {
  fast_tick_timer = null;
  tick();
}

function runFanRetry() {
  fan_retry_timer = null;
  tick();
}

function deferFanRetry() {
  fan_retry_after = nowSec() + 2;
  if (fan_retry_timer === null) {
    fan_retry_timer = Timer.set(2000, false, runFanRetry);
  }
}

function onFanSetDone(result, error_code, error_message) {
  fan_call_pending = false;
  if (error_code !== 0) {
    print("[bathfan] Switch.Set fehlgeschlagen: " + error_code + " " + error_message);
    deferFanRetry();
    return;
  }
  // Neuesten Wunsch erneut lesen: force_on kann waehrend des Aufrufs wechseln.
  scheduleTick();
}

function applyFanState() {
  if (fan_call_pending || nowSec() < fan_retry_after) return;
  let want = force_on || backlog_sec > 0;
  let output = readFanOutput();
  if (typeof output !== "boolean" || output === want) return;

  fan_call_pending = true;
  try {
    Shelly.call("Switch.Set", { id: FAN_SWITCH_ID, on: want }, onFanSetDone);
  } catch (e) {
    // Auch ein synchroner RPC-Limitfehler darf das Skript nicht beenden.
    fan_call_pending = false;
    print("[bathfan] Switch.Set vorerst nicht moeglich: " + e);
    deferFanRetry();
  }
}

// Anzeige auf 0,1 min aufrunden: eine positive Restzeit erscheint nie als 0.
function publishRestzeit() {
  if (!restzeit_handle || nowSec() < restzeit_retry_after) return;
  let minutes = Math.ceil(backlog_sec / 6) / 10;
  if (minutes === last_restzeit_sent) return;
  try {
    // Kein zusaetzlicher Shelly.call: Aktualisierung ueber den Virtual-Handle.
    restzeit_handle.setValue(minutes);
    last_restzeit_sent = minutes;
  } catch (e) {
    restzeit_retry_after = nowSec() + 10;
    print("[bathfan] Restzeit-Anzeige fehlgeschlagen: " + e);
  }
}

function onRestzeitChange(ev) {
  if (!ev || typeof ev.value !== "number" || ev.value !== ev.value) return;
  // Eigene Meldungen NICHT ins Zeitkonto zuruecklesen: sonst Rundungsfehler!
  if (ev.source === own_source) return;

  backlog_sec = Math.round(ev.value * 60);
  clampBacklog();
  let t = nowSec();
  // Eingabe ersetzt die Restzeit ab jetzt, nicht rueckwirkend.
  last_tick_ts = t;
  drain_was_allowed = readKaminFrei() && readFanOutput() === true;
  if (session_active) last_add_ts = t;
  last_restzeit_sent = null;
  log("Restzeit manuell gesetzt: " + backlog_sec + "s");
  scheduleTick();
}

function onPresenceChange(newVal) {
  let t = nowSec();
  presence_raw = newVal;

  if (presence_raw) {
    presence_on_since = t;
    // session_active wird nach Debounce aktiviert (im Tick)
    log("presence ON (raw)");
  } else {
    log("presence OFF (raw)");
    // Wenn Session aktiv war und lang genug -> Mindestnachlauf sicherstellen
    if (session_active) {
      let session_len = t - session_start_ts;
      log("session ended, len=" + session_len + "s, backlog=" + backlog_sec + "s");

      if (session_len >= MIN_SESSION_FOR_POSTRUN_SEC && backlog_sec < MIN_POSTRUN_SEC) {
        backlog_sec = MIN_POSTRUN_SEC;
        log("apply min postrun => backlog=" + backlog_sec + "s");
      }
    }

    // Session zurücksetzen
    session_active = false;
    session_start_ts = 0;
    presence_on_since = 0;
    last_add_ts = 0;

    clampBacklog();
  }
}

function tick() {
  let t = nowSec();

  // Erst vergangene Laufzeit abbauen, bevor neue Minuten/Nachlauf entstehen.
  // Nur bestaetigter O2-Ausgang und Kaminfreigabe zaehlen als Laufzeit.
  let drain_now = readKaminFrei() && readFanOutput() === true;
  let dt = t - last_tick_ts;
  if (drain_was_allowed && drain_now && dt > 0 && backlog_sec > 0) {
    backlog_sec -= dt;
    clampBacklog();
  }
  last_tick_ts = t;
  drain_was_allowed = drain_now;

  let f = readForceOn();
  if (f !== force_on) {
    force_on = f;
    log("force_on " + (force_on ? "ON" : "OFF"));
  }

  // 1) Präsenz lesen + Debounce/Session-Start
  let p = readPresence();
  if (p !== presence_raw) {
    onPresenceChange(p);
  }

  if (presence_raw) {
    // Debounce: erst nach PRESENCE_DEBOUNCE_SEC Session aktiv
    if (!session_active && (t - presence_on_since) >= PRESENCE_DEBOUNCE_SEC) {
      session_active = true;
      session_start_ts = presence_on_since; // Besuchsdauer ab erster Praesenz
      last_add_ts = t;
      log("session ACTIVE (debounced)");
    }

    // 2) Backlog aufbauen: pro Minute Präsenz +ADD_SEC_PER_MIN_PRESENT
    if (session_active) {
      if (last_add_ts === 0) last_add_ts = t;

      // add in Minuten-Schritten (robust bei Jitter)
      let elapsed = t - last_add_ts;
      if (elapsed >= 60) {
        let minutes = Math.floor(elapsed / 60);
        backlog_sec += minutes * ADD_SEC_PER_MIN_PRESENT;
        last_add_ts += minutes * 60;

        clampBacklog();
        log("add backlog +" + (minutes * ADD_SEC_PER_MIN_PRESENT) + "s => " + backlog_sec + "s");
      }
    }
  }

  // O2 entsprechend force_on oder Restzeit setzen.
  applyFanState();
  publishRestzeit();
}


// Nur relevante Werte beruecksichtigen: Leistung, WLAN etc. ignorieren.
function onStatus(ev) {
  if (!ev || !ev.delta) return;
  if ((ev.component === "boolean:" + PRESENCE_BOOL_ID ||
       ev.component === "boolean:" + FORCE_ON_BOOL_ID) &&
      typeof ev.delta.value === "boolean") {
    scheduleTick();
  } else if (ev.component === KAMIN_INPUT &&
             typeof ev.delta.state === "boolean") {
    scheduleTick();
  } else if (ev.component === "switch:" + FAN_SWITCH_ID &&
             typeof ev.delta.output === "boolean") {
    scheduleTick();
  }
}

function startControl() {
  restzeit_handle = Virtual.getHandle("number:" + RESTZEIT_NUMBER_ID);
  if (!restzeit_handle) throw new Error("restzeit Number nicht verfuegbar");
  own_source = "script:" + Shelly.getCurrentScriptId();
  let value = restzeit_handle.getValue();
  backlog_sec = typeof value === "number" && value === value ? Math.round(value * 60) : 0;
  clampBacklog();
  restzeit_handle.setConfig({
    name: RESTZEIT_NUMBER_NAME,
    min: 0,
    max: MAX_BACKLOG_SEC / 60,
    persisted: false,
    default_value: 0,
    meta: { ui: { view: "field", unit: "min", step: 0.1 } }
  });
  restzeit_handle.on("change", onRestzeitChange);
  presence_raw = readPresence();
  last_tick_ts = nowSec();
  if (presence_raw) presence_on_since = last_tick_ts;
  force_on = readForceOn();
  drain_was_allowed = readKaminFrei() && readFanOutput() === true;
  Shelly.addStatusHandler(onStatus);
  Timer.set(TICK_MS, true, tick);
  tick();
  log("init done; Restzeit = number:" + RESTZEIT_NUMBER_ID);
}

function onRestzeitCreated(result, error_code, error_message) {
  if (error_code !== 0 || !result || typeof result.id !== "number") {
    print("[bathfan] restzeit konnte nicht angelegt werden: " + error_code + " " + error_message);
    print("[bathfan] Freien Virtual-Component-Platz pruefen und Skript neu starten.");
    return;
  }
  RESTZEIT_NUMBER_ID = result.id;
  startControl();
}

function ensureRestzeit() {
  if (RESTZEIT_NUMBER_ID !== null) {
    startControl();
    return;
  }
  let found = null;
  for (let id = 200; id <= 299; id++) {
    let cfg = Shelly.getComponentConfig("number", id);
    if (cfg && cfg.name === RESTZEIT_NUMBER_NAME) {
      if (found !== null) throw new Error("Mehrere restzeit Numbers: ID konfigurieren");
      found = id;
    }
  }
  if (found !== null) {
    RESTZEIT_NUMBER_ID = found;
    startControl();
    return;
  }
  // Genau ein RPC vor Start der Steuerung; kein paralleler Switch.Set-Aufruf.
  try {
    Shelly.call("Virtual.Add", {
      type: "number",
      config: {
        name: RESTZEIT_NUMBER_NAME,
        min: 0, max: MAX_BACKLOG_SEC / 60,
        persisted: false, default_value: 0,
        meta: { ui: { view: "field", unit: "min", step: 0.1 } }
      }
    }, onRestzeitCreated);
  } catch (e) {
    print("[bathfan] Virtual.Add vorerst nicht moeglich: " + e);
    Timer.set(2000, false, ensureRestzeit);
  }
}

function init() {
  // Erst Konfiguration pruefen, dann Komponente und Steuerung starten.
  resolveForceOnId();
  let p = Shelly.getComponentStatus("boolean", PRESENCE_BOOL_ID);
  if (!p || typeof p.value !== "boolean") {
    throw new Error("Praesenz-Boolean nicht gefunden: PRESENCE_BOOL_ID pruefen");
  }
  if (typeof Virtual === "undefined") {
    throw new Error("Virtual-Skript-API fehlt: Shelly-Firmware pruefen");
  }
  ensureRestzeit();
}

init();
