"use strict";

// ---------- Data ----------

const DEFAULT_WORDS = [
  "treasure", "measure", "leisure", "pleasure", "exposure",
  "enclosure", "closure", "disclosure", "composure",
];

const WEEKS = [
  {
    name: "Week 1 (test 14/09)",
    spelling: "mouth, sprout, around, sound, spout, ouch, hound, trout, found, proud",
    exception: "after, again, because, first, house",
  },
  {
    name: "Week 2 (test 21/09)",
    spelling: "touch, double, country, trouble, young, cousin, enough, couple, encourage, flourish",
    exception: "laugh, little, night, there, their",
  },
  {
    name: "Week 3 (test 28/09)",
    spelling: "symbol, gym, myth, synonym, Egypt, lyrics, pyramid, system, mystery, gymnastics",
    exception: "these, three, water, where, would",
  },
  {
    name: "Week 4 (test 05/10)",
    spelling: "treasure, measure, leisure, pleasure, pressure, exposure, enclosure, closure, disclosure, composure",
    exception: "because, laugh, where, house, little",
  },
  {
    name: "Week 5 (test 12/10)",
    spelling: "adventure, future, picture, nature, creature, furniture, capture, sculpture, fracture, mixture",
    exception: "again, there, these, would, night",
  },
  {
    name: "Week 6 (test 19/10)",
    spelling: "actual, bicycle, answer, circle, earth, enough, island, fruit, often, popular",
    exception: "first, their, water, three, after",
  },
];

const STORAGE_KEY = "spelling_words";
const MIN_GAP_SECONDS = 1;
const DEFAULT_GAP_SECONDS = 7;
const REPEAT_PAUSE_MS = 600;

// ---------- Helpers ----------

const $ = (id) => document.getElementById(id);

const splitList = (text) =>
  text.split(/[\n,]+/).map((w) => w.trim()).filter(Boolean);

function uniqueAppend(target, words) {
  const seen = new Set(target.map((w) => w.toLowerCase()));
  for (const w of words) {
    const key = w.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      target.push(w);
    }
  }
  return target;
}

function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function setStatus(text) {
  $("status").textContent = text;
}

// ---------- Word list ----------

function getWords() {
  return splitList($("words").value);
}

function setWords(words) {
  $("words").value = words.join("\n");
  saveWords();
}

function saveWords() {
  try {
    localStorage.setItem(STORAGE_KEY, $("words").value);
  } catch (e) { /* storage unavailable */ }
}

function restoreWords() {
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch (e) { /* storage unavailable */ }
  $("words").value = saved && saved.trim() ? saved : DEFAULT_WORDS.join("\n");
}

// ---------- Preset weeks ----------

function renderWeeks() {
  const container = $("weeks");
  WEEKS.forEach((week, i) => {
    const label = document.createElement("label");
    label.title = week.name;

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = String(i);

    const span = document.createElement("span");
    span.textContent = `Week ${i + 1}`;

    label.append(input, span);
    container.appendChild(label);
  });
}

function setAllWeeks(checked) {
  document.querySelectorAll("#weeks input").forEach((c) => { c.checked = checked; });
}

function pickedWords() {
  const useSpelling = $("typeSpelling").checked;
  const useException = $("typeException").checked;
  const out = [];
  document.querySelectorAll("#weeks input:checked").forEach((c) => {
    const week = WEEKS[Number(c.value)];
    if (useSpelling) uniqueAppend(out, splitList(week.spelling));
    if (useException) uniqueAppend(out, splitList(week.exception));
  });
  return out;
}

// ---------- Speech ----------

const VOICE_KEY = "spelling_voice";
const ONLINE_VOICE = "online-google";
const ONLINE_TIMEOUT_MS = 8000;

// Higher score = more natural sounding. Neural/premium voices first,
// robotic or novelty voices (eSpeak, Apple's Eloquence set) last.
function voiceScore(v) {
  const name = v.name;
  if (/natural|neural|premium/i.test(name)) return 5;
  if (/enhanced|siri/i.test(name)) return 4;
  if (/google/i.test(name)) return 3;
  if (/eddy|flo|grandma|grandpa|reed|rocko|sandy|shelley|espeak/i.test(name)) return 0;
  return v.localService === false ? 2 : 1;
}

let voices = [];

function addOption(parent, value, text) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  parent.appendChild(option);
}

function loadVoices() {
  voices = "speechSynthesis" in window ? speechSynthesis.getVoices() : [];
  const select = $("voice");
  let preferred = select.value;
  if (!preferred) {
    try { preferred = localStorage.getItem(VOICE_KEY); } catch (e) { /* storage unavailable */ }
  }
  select.innerHTML = "";

  addOption(select, ONLINE_VOICE, "★ Google British voice (online, same on every device)");

  const british = voices.filter((v) => /en[-_]GB/i.test(v.lang));
  const list = (british.length ? british : voices)
    .slice()
    .sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));

  if (list.length) {
    const group = document.createElement("optgroup");
    group.label = "This device's voices (work offline)";
    list.forEach((v) => addOption(group, v.name, `${v.name} (${v.lang})`));
    select.appendChild(group);
  }

  select.value = preferred && (preferred === ONLINE_VOICE || list.some((v) => v.name === preferred))
    ? preferred
    : ONLINE_VOICE;
}

// The "Speed" values were tuned for device voices, where 0.85 is a clear pace.
// Google's audio is already clear at normal speed, so 0.85 maps to 1x playback.
const playbackRate = () => parseFloat($("rate").value) / 0.85;

// One shared element: iOS only allows audio that started from a tap,
// and reusing the element keeps that permission for the whole test.
const player = new Audio();
let stopPlayer = null;

function onlineUrl(text) {
  const params = new URLSearchParams({ ie: "UTF-8", client: "tw-ob", tl: "en-GB", q: text });
  return `https://translate.google.com/translate_tts?${params}`;
}

// Resolves true when the clip played, false if it failed (so we can fall back).
function sayOnline(text) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      player.onended = player.onerror = null;
      stopPlayer = null;
      resolve(ok);
    };
    const timeout = setTimeout(() => { player.pause(); finish(false); }, ONLINE_TIMEOUT_MS);

    stopPlayer = () => { player.pause(); finish(true); };
    player.onended = () => finish(true);
    player.onerror = () => finish(false);
    player.src = onlineUrl(text);
    player.playbackRate = playbackRate();
    player.play().then(() => clearTimeout(timeout), () => finish(false));
  });
}

function sayOnDevice(text, voiceName) {
  return new Promise((resolve) => {
    if (!("speechSynthesis" in window)) return resolve();
    const u = new SpeechSynthesisUtterance(text);
    const voice = voices.find((v) => v.name === voiceName);
    if (voice) {
      u.voice = voice;
      u.lang = voice.lang;
    } else {
      u.lang = "en-GB";
    }
    u.rate = parseFloat($("rate").value);
    u.onend = resolve;
    u.onerror = resolve;
    speechSynthesis.speak(u);
  });
}

async function say(text) {
  const choice = $("voice").value;
  if (choice !== ONLINE_VOICE) return sayOnDevice(text, choice);

  const ok = await sayOnline(text);
  if (!ok) {
    $("voiceNote").hidden = false;
    await sayOnDevice(text, null);
  }
}

function stopSpeaking() {
  if (stopPlayer) stopPlayer();
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

// ---------- Test runner ----------

let running = false;
let timer = null;

const wait = (ms) => new Promise((resolve) => { timer = setTimeout(resolve, ms); });

function renderAnswers(order) {
  const list = $("answers");
  list.innerHTML = "";
  order.forEach((w) => {
    const li = document.createElement("li");
    li.textContent = w;
    list.appendChild(li);
  });
  $("answerCard").hidden = false;
}

async function runTest() {
  if (running) return;

  const words = getWords();
  if (!words.length) {
    setStatus("Please enter at least one word.");
    return;
  }

  running = true;
  let order = shuffle(words);
  const count = parseInt($("count").value, 10);
  if (count > 0 && count < order.length) order = order.slice(0, count);

  renderAnswers(order);
  const gapMs = Math.max(MIN_GAP_SECONDS, parseInt($("gap").value, 10) || DEFAULT_GAP_SECONDS) * 1000;

  for (let i = 0; i < order.length && running; i++) {
    const label = `Word ${i + 1} of ${order.length}`;
    setStatus(`${label}…`);
    await say(`Number ${i + 1}. ${order[i]}.`);
    if (!running) break;
    await wait(REPEAT_PAUSE_MS);
    await say(`${order[i]}.`);
    if (!running) break;
    setStatus(`${label}: write it down`);
    if (i < order.length - 1) await wait(gapMs);
  }

  if (running) setStatus("Test finished. Check the answer key below.");
  running = false;
}

function stopTest() {
  running = false;
  clearTimeout(timer);
  stopSpeaking();
  setStatus("Stopped.");
}

// ---------- Wire up ----------

function init() {
  renderWeeks();
  restoreWords();

  $("words").addEventListener("input", saveWords);

  $("load").addEventListener("click", () => {
    const words = pickedWords();
    if (!words.length) {
      setStatus("Tick at least one week and one word type.");
      return;
    }
    setWords(words);
  });

  $("add").addEventListener("click", () => {
    setWords(uniqueAppend(getWords(), pickedWords()));
  });

  $("allWeeks").addEventListener("click", () => setAllWeeks(true));
  $("noWeeks").addEventListener("click", () => setAllWeeks(false));
  $("clear").addEventListener("click", () => setWords([]));

  $("start").addEventListener("click", () => {
    stopSpeaking();
    runTest();
  });
  $("stop").addEventListener("click", stopTest);
  $("voice").addEventListener("change", () => {
    try { localStorage.setItem(VOICE_KEY, $("voice").value); } catch (e) { /* storage unavailable */ }
  });
  $("testVoice").addEventListener("click", () => {
    stopSpeaking();
    $("voiceNote").hidden = true;
    say("Number 1. Treasure.");
  });

  loadVoices();
  if ("speechSynthesis" in window) speechSynthesis.onvoiceschanged = loadVoices;
}

init();
