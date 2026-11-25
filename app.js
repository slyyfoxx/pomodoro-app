// FocusForge Pomodoro
// Add ?fast to the URL to run each phase in seconds instead of minutes (handy for testing).

const UNIT = new URLSearchParams(location.search).has('fast') ? 1 : 60;
const DURATIONS = { work: 25 * UNIT, short: 5 * UNIT, long: 15 * UNIT }; // seconds
const LABELS = { work: 'Work', short: 'Break', long: 'Long break' };
const LONG_EVERY = 4; // long break after every 4th work session
const STORAGE_KEY = 'focusforge.sessions';

const $ = (id) => document.getElementById(id);
const els = {
  time: $('time'), status: $('status'), toggle: $('toggle'), reset: $('reset'),
  skip: $('skip'), count: $('count'), dots: $('dots'), clear: $('clear'),
  progress: document.querySelector('.progress'),
  modes: document.querySelectorAll('.mode'),
};
const RING = 2 * Math.PI * 54;

const state = {
  mode: 'work',
  remaining: DURATIONS.work, // seconds left when paused
  endsAt: null,              // timestamp (ms) when running, null when paused
  tick: null,
  sessions: loadSessions(),
};

function loadSessions() {
  try { return Number(localStorage.getItem(STORAGE_KEY)) || 0; } catch { return 0; }
}

function saveSessions() {
  try { localStorage.setItem(STORAGE_KEY, String(state.sessions)); } catch { /* storage unavailable */ }
}

// Remaining time is derived from a fixed end timestamp, so the timer stays
// accurate even when the browser throttles timers in a background tab.
function secondsLeft() {
  return state.endsAt ? Math.max(0, (state.endsAt - Date.now()) / 1000) : state.remaining;
}

function format(sec) {
  const s = Math.ceil(sec);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

function render() {
  const left = secondsLeft();
  const text = format(left);
  els.time.textContent = text;
  els.progress.style.strokeDashoffset = RING * (1 - left / DURATIONS[state.mode]);
  document.title = state.endsAt ? `${text} · ${LABELS[state.mode]}` : 'FocusForge Pomodoro';
}

function renderStatic() {
  document.body.dataset.mode = state.mode;
  els.modes.forEach((b) => b.setAttribute('aria-selected', b.dataset.mode === state.mode));
  els.toggle.textContent = state.endsAt ? 'Pause' : (state.remaining < DURATIONS[state.mode] ? 'Resume' : 'Start');
  els.count.textContent = state.sessions;
  const filled = state.sessions % LONG_EVERY;
  els.dots.innerHTML = Array.from({ length: LONG_EVERY }, (_, i) =>
    `<span class="${i < filled ? 'on' : ''}"></span>`).join('');
  render();
}

function setStatus(text) { els.status.textContent = text; }

function start() {
  if (state.endsAt) return;
  unlockAudio();
  state.endsAt = Date.now() + state.remaining * 1000;
  state.tick = setInterval(onTick, 250);
  setStatus(state.mode === 'work' ? 'Focus time' : 'Take a breather');
  renderStatic();
  react('start');
}

function pause() {
  if (!state.endsAt) return;
  state.remaining = secondsLeft();
  state.endsAt = null;
  clearInterval(state.tick);
  setStatus('Paused');
  renderStatic();
  react('pause');
}

function setMode(mode, statusText = 'Ready when you are') {
  clearInterval(state.tick);
  state.mode = mode;
  state.remaining = DURATIONS[mode];
  state.endsAt = null;
  setStatus(statusText);
  renderStatic();
}

function reset() { setMode(state.mode); }

function nextMode() {
  if (state.mode !== 'work') return 'work';
  return state.sessions % LONG_EVERY === 0 ? 'long' : 'short';
}

// Called when a phase finishes (or is skipped). Only completed work blocks count.
function advance(completed) {
  if (completed && state.mode === 'work') {
    state.sessions++;
    saveSessions();
  }
  const finished = LABELS[state.mode];
  const next = nextMode();
  if (completed) {
    chime();
    notify(`${finished} done`, `Up next: ${LABELS[next]}`);
    react(state.mode === 'work' ? 'workDone' : 'breakDone');
  }
  setMode(next, completed ? `${finished} done, ${LABELS[next].toLowerCase()} is next` : 'Skipped');
  if (completed) start(); // auto-start the next phase, like the reference app
}

function onTick() {
  if (secondsLeft() <= 0) advance(true);
  else render();
}

// --- Sound (Web Audio, no audio files needed) ---
let audioCtx;
function unlockAudio() {
  if (!audioCtx) {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (Ctx) audioCtx = new Ctx();
  }
  if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
}

function chime() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  [660, 880, 990].forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.3, now + i * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.4);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now + i * 0.18);
    osc.stop(now + i * 0.18 + 0.45);
  });
}

function notify(title, body) {
  if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body });
  }
}

// --- Events ---
els.toggle.addEventListener('click', () => (state.endsAt ? pause() : start()));
els.reset.addEventListener('click', reset);
els.skip.addEventListener('click', () => advance(false));
els.modes.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode)));
// Two-click clear (confirm() pop-ups are blocked in embedded browsers like VS Code's preview)
let clearTimer = null;
els.clear.addEventListener('click', () => {
  if (!clearTimer) {
    els.clear.textContent = 'sure?';
    clearTimer = setTimeout(() => { els.clear.textContent = 'clear'; clearTimer = null; }, 3000);
    return;
  }
  clearTimeout(clearTimer);
  clearTimer = null;
  els.clear.textContent = 'clear';
  state.sessions = 0;
  saveSessions();
  renderStatic();
});

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
  const key = e.key.toLowerCase();
  if (key === ' ') { e.preventDefault(); els.toggle.click(); }
  else if (key === 'r') reset();
  else if (key === 's') advance(false);
  else if (key === 'm') toggleMusic();
});

renderStatic();

// --- Walking friends: a kitten and a pup wander, visit each other, and walk to your clicks ---
const SIZE = 64;
const groundY = () => window.innerHeight - SIZE - 8;
const clampX = (x) => Math.min(Math.max(x, 0), window.innerWidth - SIZE);
const clampY = (y) => Math.min(Math.max(y, 0), groundY());
const calm = matchMedia('(prefers-reduced-motion: reduce)').matches; // no idle wandering

const makeCritter = (id, x, speed) =>
  ({ el: document.getElementById(id), x, y: groundY(), target: null, speed, pace: speed, restUntil: 0 });
const kitty = makeCritter('kitty', 40, 55);
const doggy = makeCritter('doggy', window.innerWidth - 120, 70);
const critters = [kitty, doggy];
let nextHug = 0; // cooldown so they don't greet every frame

function walkTo(c, x, y, speed = c.pace) {
  c.target = { x: clampX(x), y: clampY(y) };
  c.speed = speed;
  c.el.classList.add('walking');
}

function face(c, left) { c.el.classList.toggle('left', left); }

function popHeart(x, y) {
  const heart = document.createElement('span');
  heart.className = 'heart';
  heart.textContent = '♥';
  heart.style.left = `${x}px`;
  heart.style.top = `${y}px`;
  heart.addEventListener('animationend', () => heart.remove());
  document.body.appendChild(heart);
}

function hop(c) {
  c.el.classList.remove('hop');
  void c.el.offsetWidth; // restart the animation
  c.el.classList.add('hop');
}

// Speech bubble above a critter
function say(c, text, ms = 2200) {
  c.el.querySelector('.bubble')?.remove();
  const b = document.createElement('div');
  b.className = 'bubble';
  b.textContent = text;
  c.el.appendChild(b);
  setTimeout(() => b.remove(), ms);
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// When both are standing close together: face each other, hop, and share a heart
function greet(now) {
  if (now < nextHug || kitty.target || doggy.target) return;
  if (Math.hypot(kitty.x - doggy.x, kitty.y - doggy.y) > 90) return;
  face(kitty, doggy.x < kitty.x);
  face(doggy, kitty.x < doggy.x);
  for (const c of critters) {
    hop(c);
    c.restUntil = now + 2500 + Math.random() * 2000;
  }
  popHeart((kitty.x + doggy.x) / 2 + SIZE / 2 - 6, Math.min(kitty.y, doggy.y) - 14);
  nextHug = now + 6000;
}

// Petting: click right on a critter
const PET_LINES = { kitty: ['mew ♡', 'purrr…', 'hehe!', 'more pets?'], doggy: ['woof!', 'arf arf ♡', '*wag wag*', 'best human!'] };
function pet(c) {
  c.target = null;
  c.el.classList.remove('walking');
  c.restUntil = performance.now() + 2500;
  hop(c);
  say(c, pick(PET_LINES[c.el.id]));
  popHeart(c.x + SIZE / 2 - 6, c.y - 10);
}

// They react to the timer
let lastReact = 0;
function react(event) {
  const now = performance.now();
  if (event === 'start' && now - lastReact < 1500) return; // don't talk over "done!" when the next phase auto-starts
  lastReact = now;
  if (event === 'start' && state.mode === 'work') say(pick(critters), pick(["let's focus!", 'you got this!', 'study buddies ♡']));
  if (event === 'start' && state.mode !== 'work') say(kitty, "can't catch me!");
  if (event === 'pause') say(doggy, pick(['snack break?', 'paws-ed!']));
  if (event === 'workDone') {
    critters.forEach(hop);
    say(kitty, 'yay! break time ♪');
    say(doggy, 'woof woof!');
  }
  if (event === 'breakDone') say(doggy, 'back to work!');
}

// During a running break, the pup chases the kitten around
const playtime = () => state.endsAt && state.mode !== 'work';

function wander(c, now) {
  if (calm) return;
  if (playtime()) {
    if (c === doggy) {
      const side = kitty.x < doggy.x ? 1 : -1;
      walkTo(doggy, kitty.x + side * 40, kitty.y, 120);
    } else if (!c.target && now >= c.restUntil) {
      walkTo(c, Math.random() * window.innerWidth, groundY(), 135);
    }
    return;
  }
  if (c.target || now < c.restUntil) return;
  const friend = c === kitty ? doggy : kitty;
  if (Math.random() < 0.3) {
    const side = c.x < friend.x ? -1 : 1; // go stand next to the friend
    walkTo(c, friend.x + side * 56, friend.y);
  } else {
    walkTo(c, Math.random() * window.innerWidth, groundY());
  }
}

function move(c, now, dt) {
  if (!c.target) return;
  const dx = c.target.x - c.x;
  const dy = c.target.y - c.y;
  const dist = Math.hypot(dx, dy);
  const step = c.speed * dt;
  if (Math.abs(dx) > 1) face(c, dx < 0);
  if (dist <= step) {
    c.x = c.target.x;
    c.y = c.target.y;
    c.target = null;
    c.el.classList.remove('walking');
    const friend = c === kitty ? doggy : kitty;
    const friendComing = friend.target && friend.speed > 100; // both were called by a click
    c.restUntil = now + (friendComing ? 8000 : 1500 + Math.random() * 3000);
  } else {
    c.x += (dx / dist) * step;
    c.y += (dy / dist) * step;
  }
}

let lastFrame = performance.now();
function critterFrame(now) {
  const dt = Math.min((now - lastFrame) / 1000, 0.1);
  lastFrame = now;
  for (const c of critters) {
    wander(c, now);
    move(c, now, dt);
    c.el.style.transform = `translate(${c.x}px, ${c.y}px)`;
  }
  greet(now);
  requestAnimationFrame(critterFrame);
}

// Click a critter to pet it; click anywhere else and both run there side by side
document.addEventListener('pointerdown', (e) => {
  const petted = critters.find((c) =>
    e.clientX >= c.x && e.clientX <= c.x + SIZE && e.clientY >= c.y && e.clientY <= c.y + SIZE);
  if (petted) return pet(petted);
  const y = e.clientY - SIZE + 6;
  walkTo(kitty, e.clientX - SIZE + 4, y, 170);
  walkTo(doggy, e.clientX - 4, y, 190);
  nextHug = 0;
});

window.addEventListener('resize', () => critters.forEach((c) => { c.x = clampX(c.x); c.y = clampY(c.y); }));
requestAnimationFrame(critterFrame);


// --- Lofi music: plays lofi.mp3 on a loop, remembers where you left off ---
const music = document.getElementById('lofi');
const musicBtn = document.getElementById('music');
const MUSIC_KEY = 'focusforge.musicTime';
const MUSIC_VOLUME = 0.5;
let fadeTimer = null;

function fadeTo(target, done) { // gentle ~0.6s fade in/out
  clearInterval(fadeTimer);
  fadeTimer = setInterval(() => {
    const next = music.volume + Math.sign(target - music.volume) * 0.05;
    if (Math.abs(target - music.volume) <= 0.05) {
      music.volume = target;
      clearInterval(fadeTimer);
      if (done) done();
    } else {
      music.volume = next;
    }
  }, 30);
}

function setMusicButton(on) {
  musicBtn.setAttribute('aria-pressed', on);
  musicBtn.textContent = on ? '♫ Lofi on' : '♫ Lofi off';
  document.body.classList.toggle('music-on', on); // friends bop along while standing still
  if (on) say(pick(critters), pick(['♪ my jam!', '♫ la la la', '*vibes*']));
}

function toggleMusic() {
  if (music.paused) {
    if (!music.currentTime) {
      try { music.currentTime = Number(localStorage.getItem(MUSIC_KEY)) || 0; } catch { /* ignore */ }
    }
    music.volume = 0;
    music.play().then(() => fadeTo(MUSIC_VOLUME)).catch(() => setMusicButton(false));
    setMusicButton(true);
  } else {
    setMusicButton(false);
    fadeTo(0, () => music.pause());
  }
}

// Save the position so a reload picks up where you were
function saveMusicTime() {
  if (!music.currentTime) return;
  try { localStorage.setItem(MUSIC_KEY, String(music.currentTime)); } catch { /* ignore */ }
}
music.addEventListener('pause', saveMusicTime);
window.addEventListener('pagehide', saveMusicTime);

musicBtn.addEventListener('click', toggleMusic);
