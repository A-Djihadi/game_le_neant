import test from 'node:test';
import assert from 'node:assert/strict';
import {
  rankFor,
  formatDuration,
  formatPercentOfDay,
  messagesUpTo,
  nextMessage,
  insertScore,
  BASE_MESSAGES,
  ROTATION_MESSAGES,
  ROTATION_STEP,
  ROTATION_START,
  ACHIEVEMENTS,
  achievementsFor,
  nextAchievement,
  formatAttempts,
  pickFreeSpot,
  FREE_SPOT_MARGIN,
} from '../public/logic.js';

// ---------- Grades : chaque borne (29/30, 119/120, … 14399/14400) ----------
const GRADE_BOUNDS = [
  [30, 'VISITEUR INNOCENT', 'APPRENTI DU VIDE'],
  [120, 'APPRENTI DU VIDE', 'CONTEMPLATEUR DU NÉANT'],
  [300, 'CONTEMPLATEUR DU NÉANT', 'MAÎTRE DU TEMPS PERDU'],
  [600, 'MAÎTRE DU TEMPS PERDU', 'SEIGNEUR DU SCROLL INUTILE'],
  [1200, 'SEIGNEUR DU SCROLL INUTILE', 'LÉGENDE VIVANTE DU NÉANT ABSOLU'],
  [1800, 'LÉGENDE VIVANTE DU NÉANT ABSOLU', "ARCHIVISTE DE L'INUTILE"],
  [2700, "ARCHIVISTE DE L'INUTILE", 'DOCTEUR ÈS RIEN'],
  [3600, 'DOCTEUR ÈS RIEN', 'GARDIEN CERTIFIÉ DU VIDE'],
  [5400, 'GARDIEN CERTIFIÉ DU VIDE', 'TROU NOIR AMATEUR'],
  [7200, 'TROU NOIR AMATEUR', 'ENTITÉ INEXPLICABLE'],
  [9000, 'ENTITÉ INEXPLICABLE', "MONUMENT À L'ENNUI"],
  [10800, "MONUMENT À L'ENNUI", 'LE PROBLÈME (surnom donné par vos proches)'],
  [12600, 'LE PROBLÈME (surnom donné par vos proches)', 'AU-DELÀ DU NÉANT'],
  [14400, 'AU-DELÀ DU NÉANT', 'RÉFÉRENCE OFFICIELLE DU RIEN'],
];

for (const [at, before, after] of GRADE_BOUNDS) {
  test(`grade ${at - 1} → ${before}`, () => {
    assert.equal(rankFor(at - 1), before);
  });
  test(`grade ${at} → ${after}`, () => {
    assert.equal(rankFor(at), after);
  });
}

// ---------- Cycle au-delà de 4 h (30 min parmi 5 grades) ----------
const FINAL_GRADES = [
  'RÉFÉRENCE OFFICIELLE DU RIEN',
  'ACTIONNAIRE DU NÉANT™',
  'PERSONNE NE VOUS CROIRA',
  'STATUT NON DOCUMENTÉ',
  'HORS CATÉGORIE',
];
test('cycle des grades au-delà de 4 h', () => {
  for (let k = 0; k < 12; k++) {
    assert.equal(rankFor(14400 + 1800 * k), FINAL_GRADES[k % 5], `à 14400 + ${1800 * k} s`);
  }
  // juste avant chaque bascule du cycle, on reste sur le grade précédent
  assert.equal(rankFor(16199), 'RÉFÉRENCE OFFICIELLE DU RIEN');
  assert.equal(rankFor(17999), 'ACTIONNAIRE DU NÉANT™');
});

// ---------- Formatage de la durée ----------
test('formatDuration', () => {
  assert.equal(formatDuration(0), '0 s');
  assert.equal(formatDuration(59), '59 s');
  assert.equal(formatDuration(60), '1 min 0 s');
  assert.equal(formatDuration(252), '4 min 12 s');
  assert.equal(formatDuration(3600), '1 h 00 min 00 s');
  assert.equal(formatDuration(4053), '1 h 07 min 33 s');
  assert.equal(formatDuration(7325), '2 h 02 min 05 s');
});

// ---------- Pourcentage de la journée ----------
test('formatPercentOfDay', () => {
  assert.equal(formatPercentOfDay(0), '0,00 %');
  assert.equal(formatPercentOfDay(3725), '4,31 %');
  assert.equal(formatPercentOfDay(86400), '100,0 %');
});

// ---------- Messages : ordre, unicité, aucun seuil manquant ----------
const EXPECTED_BASE_ATS = [
  8, 20, 45, 90, 180, 300, 480, 600, 900, 1200,
  1800, 2700, 3600, 5400, 7200, 9000, 10800, 12600, 14400,
];

test('aucun seuil de base ne manque et les seuils sont dans l\'ordre', () => {
  assert.deepEqual(BASE_MESSAGES.map((m) => m.at), EXPECTED_BASE_ATS);
});

test('messagesUpTo : vide avant 8 s, premier seuil à 8 s', () => {
  assert.deepEqual(messagesUpTo(0), []);
  assert.deepEqual(messagesUpTo(7), []);
  assert.deepEqual(messagesUpTo(8).map((m) => m.at), [8]);
});

test('messagesUpTo : ordre chronologique et unicité des seuils', () => {
  const msgs = messagesUpTo(14400);
  const ats = msgs.map((m) => m.at);
  assert.deepEqual(ats, EXPECTED_BASE_ATS);
  assert.equal(new Set(ats).size, ats.length);
});

test('messagesUpTo : rotation au-delà de 4 h toutes les 30 min', () => {
  const msgs = messagesUpTo(23400);
  const ats = msgs.map((m) => m.at);
  assert.equal(ats.length, 24); // 19 + 5 rotations (16200 … 23400)
  // les 5 messages de rotation cyclent dans l'ordre
  const rot = msgs.slice(19).map((m) => m.text);
  assert.deepEqual(rot, ROTATION_MESSAGES);
  assert.deepEqual(ats.slice(19), [16200, 18000, 19800, 21600, 23400]);
});

test('messagesUpTo : la rotation boucle après 5 passages', () => {
  const msgs = messagesUpTo(25200);
  const rot = msgs.slice(19).map((m) => m.text);
  assert.equal(rot.length, 6);
  assert.equal(rot[5], ROTATION_MESSAGES[0]);
});

test('constantes de rotation cohérentes', () => {
  assert.equal(ROTATION_START, 14400);
  assert.equal(ROTATION_STEP, 1800);
  assert.equal(ROTATION_MESSAGES.length, 5);
});

// ---------- nextMessage ----------
test('nextMessage retourne le premier seuil non encore affiché', () => {
  assert.equal(nextMessage(0), null);
  assert.deepEqual(nextMessage(8), { at: 8, text: BASE_MESSAGES[0].text });
  assert.equal(nextMessage(8, 8), null);
  assert.equal(nextMessage(20, 8).at, 20);
  assert.equal(nextMessage(14400, 12600).at, 14400);
  const next = nextMessage(16200, 14400);
  assert.equal(next.at, 16200);
  assert.equal(next.text, ROTATION_MESSAGES[0]);
});

// ---------- Tableau des scores : les 5 meilleurs, triés ----------
test('insertScore trie et garde les 5 meilleurs temps', () => {
  const e = (name, seconds, grade) => ({ name, seconds, grade });
  let scores = [];
  scores = insertScore(scores, e('A', 10, 'VISITEUR INNOCENT'));
  scores = insertScore(scores, e('B', 30, 'APPRENTI DU VIDE'));
  scores = insertScore(scores, e('C', 5, 'VISITEUR INNOCENT'));
  scores = insertScore(scores, e('D', 60, 'APPRENTI DU VIDE'));
  scores = insertScore(scores, e('E', 90, 'APPRENTI DU VIDE'));
  scores = insertScore(scores, e('F', 20, 'VISITEUR INNOCENT'));
  assert.deepEqual(scores.map((s) => s.seconds), [90, 60, 30, 20, 10]);
  assert.deepEqual(scores.map((s) => s.name), ['E', 'D', 'B', 'F', 'A']);
});

test('insertScore ne mute pas le tableau d\'origine', () => {
  const original = [{ name: 'A', seconds: 10, grade: 'X' }];
  const out = insertScore(original, { name: 'B', seconds: 20, grade: 'Y' });
  assert.equal(original.length, 1);
  assert.equal(out.length, 2);
});

// ---------- Achievements ----------
test('ACHIEVEMENTS : 9 paliers, seuils croissants, libellés uniques', () => {
  assert.equal(ACHIEVEMENTS.length, 9);
  const ats = ACHIEVEMENTS.map((a) => a.at);
  assert.deepEqual(ats, [1, 3, 5, 10, 25, 50, 100, 250, 500]);
  assert.equal(new Set(ACHIEVEMENTS.map((a) => a.label)).size, ACHIEVEMENTS.length);
});

// Bornes : chaque seuil se débloque exactement à `at`, jamais avant.
for (const { at, label } of ACHIEVEMENTS) {
  test(`achievement « ${label} » se débloque à ${at}, pas à ${at - 1}`, () => {
    assert.ok(!achievementsFor(at - 1).includes(label));
    assert.ok(achievementsFor(at).includes(label));
  });
}

test('achievementsFor : aucun avant 1, tout débloqué à 500', () => {
  assert.deepEqual(achievementsFor(0), []);
  assert.deepEqual(achievementsFor(500), ACHIEVEMENTS.map((a) => a.label));
});

test('nextAchievement : premier palier non atteint, null après 500', () => {
  assert.deepEqual(nextAchievement(0), { at: 1, label: 'PREMIER REFUS' });
  assert.deepEqual(nextAchievement(1), { at: 3, label: 'DOIGT PERSÉVÉRANT' });
  assert.deepEqual(nextAchievement(4), { at: 5, label: 'INSISTANCE NOTÉE' });
  assert.deepEqual(nextAchievement(499), { at: 500, label: 'INTÉGRITÉ DU BOUTON COMPROMISE' });
  assert.equal(nextAchievement(500), null);
  assert.equal(nextAchievement(501), null);
});

test('formatAttempts : singulier pour 0 et 1, pluriel ensuite', () => {
  assert.equal(formatAttempts(0), '0 TENTATIVE');
  assert.equal(formatAttempts(1), '1 TENTATIVE');
  assert.equal(formatAttempts(2), '2 TENTATIVES');
  assert.equal(formatAttempts(499), '499 TENTATIVES');
  assert.equal(formatAttempts(500), '500 TENTATIVES');
});

// ---------- pickFreeSpot (placement sans chevauchement) ----------
// Générateur pseudo-aléatoire déterministe (LCG), aucune dépendance à Math.random.
function lcg(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Distance (signée) minimale entre deux rectangles sur chaque axe, calculée
// indépendamment de l'implémentation : positive quand ils sont séparés.
function axisClearance(a, b) {
  const x = Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w);
  const y = Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h);
  return Math.max(x, y);
}

test('pickFreeSpot : hors de tout rectangle réservé (marge respectée)', () => {
  const reserved = [
    { x: 0, y: 0, w: 400, h: 300 },
    { x: 700, y: 500, w: 300, h: 300 },
  ];
  const spot = pickFreeSpot({
    viewW: 1000, viewH: 800, w: 120, h: 40,
    reserved, random: lcg(12345), attempts: 2000,
  });
  assert.ok(spot, 'un emplacement libre doit exister');
  const cand = { ...spot, w: 120, h: 40 };
  for (const r of reserved) {
    assert.ok(axisClearance(cand, r) >= FREE_SPOT_MARGIN, `candidat ${JSON.stringify(spot)} trop proche de ${JSON.stringify(r)}`);
  }
});

test('pickFreeSpot : respecte les bords du viewport', () => {
  const random = lcg(999);
  for (let i = 0; i < 20; i++) {
    const spot = pickFreeSpot({
      viewW: 390, viewH: 844, w: 220, h: 44,
      reserved: [], random, attempts: 50,
    });
    assert.ok(spot, 'emplacement trouvé');
    assert.ok(spot.x >= 0 && spot.y >= 0);
    assert.ok(spot.x + 220 <= 390 && spot.y + 44 <= 844);
  }
});

test('pickFreeSpot : null quand la zone est entièrement occupée', () => {
  const reserved = [{ x: 0, y: 0, w: 100, h: 100 }];
  const spot = pickFreeSpot({
    viewW: 100, viewH: 100, w: 20, h: 10,
    reserved, random: () => 0.5, attempts: 50,
  });
  assert.equal(spot, null);
});

test('pickFreeSpot : déterministe avec un générateur injecté', () => {
  const random = () => 0.25;
  const args = { viewW: 100, viewH: 100, w: 20, h: 10, reserved: [], random, attempts: 5 };
  const a = pickFreeSpot(args);
  const b = pickFreeSpot(args);
  assert.deepEqual(a, b);
  assert.deepEqual(a, { x: 20, y: 22.5 });
});

test('pickFreeSpot : null quand le candidat dépasse le viewport', () => {
  assert.equal(pickFreeSpot({ viewW: 100, viewH: 100, w: 120, h: 10, reserved: [], random: () => 0, attempts: 5 }), null);
  assert.equal(pickFreeSpot({ viewW: 100, viewH: 100, w: 10, h: 120, reserved: [], random: () => 0, attempts: 5 }), null);
});
