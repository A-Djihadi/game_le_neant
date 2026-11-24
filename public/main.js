// Le Néant™ : rendu, compteur, étoiles, bouton fuyard, scores. Aucun appel réseau, aucun traceur.
import {
  rankFor, formatDuration, formatPercentOfDay, nextMessage, insertScore,
  ACHIEVEMENTS, achievementsFor, formatAttempts, pickFreeSpot, rectsOverlap, FREE_SPOT_MARGIN,
} from './logic.js';

const SCORES_KEY = 'odg.le-neant.scores';
const ATTEMPTS_KEY = 'odg.le-neant.attempts';

// ---------- Copie d'ambiance (hors logique pure) ----------
const STAR_MESSAGES = [
  "Tu croyais que quelque chose de spécial allait se produire ? Non. Tu as la vue trouble.",
  "Une étoile filante. Fais un vœu. Le Néant™ n'a pas de service vœux.",
  "C'était une étoile. Elle est partie. Tu n'as pas bougé.",
  "Ce n'était pas un signe. C'était un point blanc en mouvement.",
  "Bonne nouvelle : ça ne veut rien dire. Mauvaise nouvelle : rien ici ne veut rien dire.",
];

const FLEE_LABELS = [
  "J'ai compris, je m'en vais",
  "Je m'en vais maintenant",
  "Bon, j'y vais",
  "Fermer cet onglet",
  "Occupe-toi de ta vie",
  "Partir discrètement",
  "Je jure que je pars",
  "Oui, oui, je pars",
  "Laisser tomber",
  "M'en aller avec dignité",
];

const FLEE_REPLIES = [
  'Vous avez cliqué. Le Néant™ a noté le geste.',
  'Bouton en maintenance jusqu\'à la fin de votre vie.',
  "La sortie se trouve exactement là où se trouve l'utilité de cette page.",
  "Vous voilà encore là. C'est bien.",
  'Tentative de départ enregistrée. Cliquer ne compte pas.',
  'Le bouton refuse, pour votre bien.',
];

// ---------- Références DOM ----------
const counterEl = document.getElementById('counter');
const gradeEl = document.getElementById('grade');
const percentEl = document.getElementById('percent');
const messagesEl = document.getElementById('messages');
const skyEl = document.getElementById('sky');
const fleeEl = document.getElementById('flee');
const localScoresEl = document.getElementById('localScores');
const scoresEmptyEl = document.getElementById('scoresEmpty');
const pseudoEl = document.getElementById('pseudo');
const saveBtn = document.getElementById('saveScore');
const saveNoteEl = document.getElementById('saveNote');
const attemptsEl = document.getElementById('attempts');
const achievementsEl = document.getElementById('achievements');
const achievementsListEl = document.getElementById('achievementsList');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCoarsePointer = window.matchMedia('(hover: none) and (pointer: coarse)').matches;

// ---------- Compteur : performance.now() recalé sur Date.now() ----------
let baseMs = 0;      // temps visible déjà accumulé (ms)
let startPerf = 0;   // performance.now() au (re)démarrage
let startWall = 0;   // Date.now() au (re)démarrage
let running = false;
let rafId = 0;
let lastShownAt = -Infinity;
let lastCounterText = '';
let lastGrade = '';

// Paramètre de debug documenté : ?debug=seconds=3725 force un état avancé.
// Plafonné à 24 h pour éviter qu'une valeur absurde ne gèle la page (rafale de messages).
function debugOffsetSeconds() {
  const raw = new URLSearchParams(location.search).get('debug');
  if (!raw) return 0;
  const m = /^seconds=(\d+)$/.exec(raw);
  if (!m) return 0;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 86400) : 0;
}

function currentMs() {
  if (!running) return baseMs;
  // Le max() garantit qu'un performance.now() throttlé en arrière-plan ne fasse
  // jamais sous-compter le temps réellement passé la page visible.
  return baseMs + Math.max(performance.now() - startPerf, Date.now() - startWall);
}

function currentSeconds() {
  return Math.floor(currentMs() / 1000);
}

// Press Start 2P avance d'environ 1 em par glyphe : on adapte le corps au texte
// pour que « 1 h 07 min 33 s » tienne à 320 px comme à 1280 px.
// clientWidth (viewport de mise en page) est plus fiable que innerWidth en
// émulation mobile (innerWidth peut refléter un viewport visuel élargi).
function fitCounter(text) {
  const n = text.length || 1;
  const maxW = Math.min(document.documentElement.clientWidth * 0.9, 1100);
  const size = Math.max(14, Math.min(56, Math.floor(maxW / n)));
  counterEl.style.fontSize = `${size}px`;
}

function addMessage(text) {
  const p = document.createElement('p');
  p.className = 'msg';
  p.textContent = text;
  messagesEl.appendChild(p);
  refreshMessageAges();
}

function refreshMessageAges() {
  const msgs = Array.from(messagesEl.children);
  msgs.forEach((el, i) => {
    const age = msgs.length - 1 - i; // 0 = plus récent
    let opacity = 1;
    if (age === 1) opacity = 0.6;
    else if (age === 2) opacity = 0.38;
    else if (age >= 3) opacity = 0.16;
    el.style.opacity = String(opacity);
  });
}

function render() {
  const sec = currentSeconds();
  const text = formatDuration(sec);
  if (text !== lastCounterText) {
    lastCounterText = text;
    counterEl.textContent = text;
    fitCounter(text);
  }
  const grade = rankFor(sec);
  if (grade !== lastGrade) {
    lastGrade = grade;
    gradeEl.textContent = grade;
  }
  percentEl.textContent = `${formatPercentOfDay(sec)} de votre journée`;

  let m;
  while ((m = nextMessage(sec, lastShownAt))) {
    lastShownAt = m.at;
    addMessage(m.text);
  }
}

function loop() {
  render();
  rafId = requestAnimationFrame(loop);
}

function startClock() {
  startPerf = performance.now();
  startWall = Date.now();
  running = true;
  rafId = requestAnimationFrame(loop);
}

function pauseClock() {
  baseMs = currentMs();
  cancelAnimationFrame(rafId);
  running = false;
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (running) pauseClock();
  } else if (!running) {
    startClock();
  }
});

// ---------- Étoiles filantes ----------
function spawnStar() {
  if (prefersReducedMotion || document.hidden) return;
  const star = document.createElement('div');
  star.className = 'shooting-star';
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const startX = vw * (0.15 + Math.random() * 0.7);
  const startY = vh * (0.04 + Math.random() * 0.28);
  const dx = -(vw * (0.35 + Math.random() * 0.3)); // diagonale vers la gauche
  const dy = vh * (0.22 + Math.random() * 0.2);    // et vers le bas
  const dur = 1200 + Math.random() * 1000;
  const angle = Math.atan2(dy, dx);
  skyEl.appendChild(star);

  let t0 = null;
  let msgShown = false;
  function frame(t) {
    if (t0 == null) t0 = t;
    const p = (t - t0) / dur;
    if (p >= 1) { star.remove(); return; }
    const x = startX + dx * p;
    const y = startY + dy * p;
    star.style.transform = `translate(${x}px, ${y}px) rotate(${angle}rad)`;
    if (!msgShown && p >= 0.45) {
      msgShown = true;
      showStarMessage();
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function showStarMessage() {
  const el = document.createElement('p');
  el.className = 'star-msg';
  el.textContent = STAR_MESSAGES[Math.floor(Math.random() * STAR_MESSAGES.length)];
  el.style.visibility = 'hidden';
  document.body.appendChild(el);
  const w = el.offsetWidth || 260;
  const h = el.offsetHeight || 39;
  const spot = pickFreeSpot({
    viewW: window.innerWidth,
    viewH: window.innerHeight,
    w, h,
    reserved: reservedRects({ includeFlee: true }),
    random: Math.random,
    attempts: 80,
  });
  if (!spot) { el.remove(); return; } // aucune place libre : on n'affiche rien
  el.style.left = `${spot.x}px`;
  el.style.top = `${spot.y}px`;
  el.style.visibility = '';
  window.setTimeout(() => { el.style.opacity = '0'; }, 3200);
  window.setTimeout(() => el.remove(), 3900);
}

function scheduleStar() {
  window.setTimeout(() => {
    spawnStar();
    scheduleStar();
  }, 6000 + Math.random() * 12000);
}

// ---------- Bouton fuyard ----------
function pickRandom(list, current) {
  let i = Math.floor(Math.random() * list.length);
  if (list.length > 1 && list[i] === current) i = (i + 1) % list.length;
  return list[i];
}

// Rectangles réellement occupés, en coordonnées viewport ({x, y, w, h}).
// Le bouton fuyard est inclus seulement quand on pose un autre élément (étoile).
// Pour .core (conteneur pleine largeur, en grande partie vide sur mobile), on réserve
// la boîte de son contenu texte, pas le conteneur entier : sinon plus aucune place libre
// sur petit écran et le bouton retomberait sur du texte.
function contentBounds(el) {
  const kids = Array.from(el.children)
    .map((c) => c.getBoundingClientRect())
    .filter((r) => r.width > 0 && r.height > 0);
  if (kids.length === 0) {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return null;
    return { x: r.x, y: r.y, w: r.width, h: r.height };
  }
  const left = Math.min(...kids.map((k) => k.left));
  const top = Math.min(...kids.map((k) => k.top));
  const right = Math.max(...kids.map((k) => k.right));
  const bottom = Math.max(...kids.map((k) => k.bottom));
  return { x: left, y: top, w: right - left, h: bottom - top };
}

function reservedRects({ includeFlee = false } = {}) {
  const rects = [];
  const core = document.querySelector('.core');
  if (core) {
    const b = contentBounds(core);
    if (b) rects.push(b);
  }
  for (const sel of ['.messages', '.footer', '.scores', '.hub']) {
    const el = document.querySelector(sel);
    if (!el) continue;
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    rects.push({ x: r.x, y: r.y, w: r.width, h: r.height });
  }
  if (includeFlee && !fleeEl.hidden) {
    const fr = fleeEl.getBoundingClientRect();
    if (fr.width > 0 && fr.height > 0) rects.push({ x: fr.x, y: fr.y, w: fr.width, h: fr.height });
  }
  return rects;
}

// Dernier recours sur très petit écran : la bande horizontale libre la plus basse,
// jamais sur du texte. Scan déterministe du bas vers le haut, gauche vers la droite.
// Le dernier retour n'est atteint que si le bouton est plus grand que le viewport.
function lowestFreeSpot(w, h) {
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;
  const reserved = reservedRects();
  const maxX = Math.max(0, viewW - w);
  const maxY = Math.max(0, viewH - h);
  for (let y = maxY; y >= 0; y -= 8) {
    for (let x = 0; x <= maxX; x += 8) {
      const cand = { x, y, w, h };
      if (!reserved.some((r) => rectsOverlap(cand, r, FREE_SPOT_MARGIN))) {
        return { x, y };
      }
    }
  }
  return { x: 0, y: 0 };
}

function teleportFlee() {
  fleeEl.hidden = false;
  fleeEl.textContent = pickRandom(FLEE_LABELS, fleeEl.textContent);
  const bw = fleeEl.offsetWidth || 220;
  const bh = fleeEl.offsetHeight || 44;
  const spot = pickFreeSpot({
    viewW: window.innerWidth,
    viewH: window.innerHeight,
    w: bw, h: bh,
    reserved: reservedRects(), // jamais sur le texte (.core/.messages/.footer/.scores/.hub)
    random: Math.random,
    attempts: 120,
  });
  const place = spot || lowestFreeSpot(bw, bh);
  fleeEl.style.left = `${place.x}px`;
  fleeEl.style.top = `${place.y}px`;
}

function scheduleFlee() {
  window.setTimeout(teleportFlee, 20000 + Math.random() * 40000);
}

// ---------- Tentatives d'appui et achievements (localStorage, rien d'autre) ----------
function loadAttempts() {
  try {
    const n = Number(localStorage.getItem(ATTEMPTS_KEY));
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

function persistAttempts(n) {
  try { localStorage.setItem(ATTEMPTS_KEY, String(n)); } catch { /* stockage indisponible */ }
}

let attempts = loadAttempts();

function renderAchievements() {
  const unlocked = achievementsFor(attempts);
  achievementsListEl.replaceChildren();
  for (const label of unlocked) {
    const li = document.createElement('li');
    li.textContent = label;
    achievementsListEl.appendChild(li);
  }
  achievementsEl.hidden = unlocked.length === 0;
}

function renderAttempts() {
  attemptsEl.textContent = formatAttempts(attempts);
  renderAchievements();
}

// Un essai visant le bouton (tap, clic, esquive) : incrémente, persiste, affiche.
function recordAttempt() {
  attempts += 1;
  persistAttempts(attempts);
  renderAttempts();
  const hit = ACHIEVEMENTS.find((a) => a.at === attempts);
  if (hit) addMessage(`Achievement débloqué : ${hit.label}`);
}

// Desktop : le bouton se téléporte dès que le pointeur approche à moins de 90 px.
// Chaque esquive est une tentative ratée, qui compte aussi.
document.addEventListener('mousemove', (e) => {
  if (fleeEl.hidden || isCoarsePointer) return;
  const r = fleeEl.getBoundingClientRect();
  const dx = e.clientX - (r.left + r.width / 2);
  const dy = e.clientY - (r.top + r.height / 2);
  if (dx * dx + dy * dy < 90 * 90) {
    recordAttempt();
    teleportFlee();
  }
});

// Mobile : il se déplace au pointerdown, sans jamais déclencher de sortie.
fleeEl.addEventListener('pointerdown', (e) => {
  if (e.pointerType === 'touch' || isCoarsePointer) {
    e.preventDefault();
    recordAttempt();
    teleportFlee();
  }
});

// Cliquer (souris, ou Entrée/Espace au clavier) : une réplique, puis il repart.
fleeEl.addEventListener('click', () => {
  recordAttempt();
  addMessage(pickRandom(FLEE_REPLIES, null));
  teleportFlee();
});

// ---------- Tableau des scores (localStorage, rien d'autre) ----------
function loadScores() {
  try {
    const raw = localStorage.getItem(SCORES_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter((s) =>
      s && typeof s.name === 'string' && typeof s.grade === 'string' && Number.isFinite(s.seconds)
    ).slice(0, 5);
  } catch {
    return [];
  }
}

function persistScores(scores) {
  try { localStorage.setItem(SCORES_KEY, JSON.stringify(scores)); } catch { /* stockage indisponible */ }
}

let scores = loadScores();

function renderScores() {
  localScoresEl.querySelectorAll('li.score-row').forEach((li) => li.remove());
  scoresEmptyEl.hidden = scores.length > 0;
  for (const s of scores) {
    const li = document.createElement('li');
    li.className = 'score-row';
    const name = document.createElement('span');
    name.className = 'score-name';
    name.textContent = s.name; // échappement par textContent uniquement
    const grade = document.createElement('span');
    grade.className = 'score-grade';
    grade.textContent = s.grade;
    const time = document.createElement('span');
    time.className = 'score-time';
    time.textContent = formatDuration(s.seconds);
    li.append(name, grade, time);
    localScoresEl.appendChild(li);
  }
}

function currentPseudo() {
  const v = pseudoEl.value.trim().slice(0, 12);
  return v || 'Anonyme';
}

function recordScore() {
  const sec = currentSeconds();
  if (sec < 1) {
    saveNoteEl.textContent = 'Rien à enregistrer. Revenez après avoir perdu un peu de temps.';
    return;
  }
  scores = insertScore(scores, { name: currentPseudo(), seconds: sec, grade: rankFor(sec) });
  persistScores(scores);
  renderScores();
  saveNoteEl.textContent = 'Temps perdu enregistré. Le Néant™ vous en est reconnaissant, à sa façon.';
}

saveBtn.addEventListener('click', recordScore);

// Enregistrement au départ de la page (pagehide).
window.addEventListener('pagehide', () => {
  const sec = currentSeconds();
  if (sec >= 1) {
    scores = insertScore(scores, { name: currentPseudo(), seconds: sec, grade: rankFor(sec) });
    persistScores(scores);
  }
});

// ---------- Démarrage ----------
baseMs = debugOffsetSeconds() * 1000;
renderScores();
renderAttempts();
render();
startClock();
scheduleStar();
scheduleFlee();

window.addEventListener('resize', () => {
  if (lastCounterText) fitCounter(lastCounterText);
});

// Après chargement des polices (swap), on recalcule le corps du compteur.
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(() => {
    if (lastCounterText) fitCounter(lastCounterText);
  });
}
