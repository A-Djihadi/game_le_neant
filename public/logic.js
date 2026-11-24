// Le Néant™ : logique pure, sans DOM (testée dans tests/logic.test.js).
// Tout le temps est exprimé en secondes entières.

// ---------- Grades ----------
// [borne supérieure, libellé] : le libellé s'applique tant que seconds < borne.
const GRADES = [
  [30, 'VISITEUR INNOCENT'],
  [120, 'APPRENTI DU VIDE'],
  [300, 'CONTEMPLATEUR DU NÉANT'],
  [600, 'MAÎTRE DU TEMPS PERDU'],
  [1200, 'SEIGNEUR DU SCROLL INUTILE'],
  [1800, 'LÉGENDE VIVANTE DU NÉANT ABSOLU'],
  [2700, "ARCHIVISTE DE L'INUTILE"],
  [3600, 'DOCTEUR ÈS RIEN'],
  [5400, 'GARDIEN CERTIFIÉ DU VIDE'],
  [7200, 'TROU NOIR AMATEUR'],
  [9000, 'ENTITÉ INEXPLICABLE'],
  [10800, "MONUMENT À L'ENNUI"],
  [12600, 'LE PROBLÈME (surnom donné par vos proches)'],
  [14400, 'AU-DELÀ DU NÉANT'],
];

// Au-delà de 4 h, un cycle de 30 min parmi ces cinq grades.
const FINAL_GRADES = [
  'RÉFÉRENCE OFFICIELLE DU RIEN',
  'ACTIONNAIRE DU NÉANT™',
  'PERSONNE NE VOUS CROIRA',
  'STATUT NON DOCUMENTÉ',
  'HORS CATÉGORIE',
];
const FINAL_START = 14400;
const FINAL_STEP = 1800;

export function rankFor(seconds) {
  if (seconds < FINAL_START) {
    for (const [at, grade] of GRADES) {
      if (seconds < at) return grade;
    }
  }
  const idx = Math.floor((seconds - FINAL_START) / FINAL_STEP) % FINAL_GRADES.length;
  return FINAL_GRADES[idx];
}

// ---------- Formatage de la durée ----------
// « 0 s », « 4 min 12 s », « 1 h 07 min 33 s ».
export function formatDuration(seconds) {
  if (seconds < 60) return `${seconds} s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return `${h} h ${mm} min ${ss} s`;
  }
  return `${m} min ${s} s`;
}

// ---------- Part de la journée perdue ----------
export function formatPercentOfDay(seconds) {
  const pct = (seconds / 86400) * 100;
  let decimals = 2;
  if (pct > 0 && pct < 0.01) decimals = 3;
  else if (pct >= 10) decimals = 1;
  return `${pct.toFixed(decimals).replace('.', ',')} %`;
}

// ---------- Messages progressifs ----------
export const BASE_MESSAGES = [
  { at: 8, text: 'Vous êtes là depuis huit secondes. Rien ne va se produire. Restez, vous verrez.' },
  { at: 20, text: "Le Néant™ vous remercie de votre patience. Il n'en avait pas besoin." },
  { at: 45, text: 'Vous pourriez faire quelque chose de votre vie. Ce compteur ne vous en empêche pas. Vous, si.' },
  { at: 90, text: 'Une minute trente. À ce rythme, vous battrez votre record personnel de rien du tout.' },
  { at: 180, text: "Trois minutes. Un appel à votre mère durerait moins longtemps et serait plus utile." },
  { at: 300, text: "Cinq minutes. Le Néant™ commence à s'attacher à vous, ce qui est un peu gênant pour lui." },
  { at: 480, text: "Huit minutes. Personne ne vous attend. C'est presque reposant, non ?" },
  { at: 600, text: "Dix minutes. Vous avez perdu plus de temps ici qu'à préparer votre dernier entretien annuel." },
  { at: 900, text: "Quinze minutes. Votre navigateur a proposé de fermer cet onglet. Il a de bonnes idées." },
  { at: 1200, text: "Vingt minutes. À ce stade, ce n'est plus de la curiosité, c'est un mode de vie." },
  { at: 1800, text: 'Trente minutes. Votre journée est entamée au tiers. En rien.' },
  { at: 2700, text: 'Quarante-cinq minutes. Vos proches tiennent une réunion. Le sujet : vous.' },
  { at: 3600, text: "Une heure. Le mot fénéant revient souvent quand on parle de vous. Ce n'est pas une insulte, c'est un diagnostic." },
  { at: 5400, text: "Une heure trente. Cinquante mots d'une langue étrangère, c'était possible. Vous avez regardé une page immobile." },
  { at: 7200, text: "Deux heures. Le Néant™ a demandé une subvention pour vous garder. Dossier accepté." },
  { at: 9000, text: "Deux heures trente. Des gens ont traversé la France, écrit un livre, changé de carrière. Vous, vous êtes là." },
  { at: 10800, text: 'Trois heures. Un ordinateur posé sur un bureau aurait fait la même chose. Lui, au moins, il ne respire pas.' },
  { at: 12600, text: "Trois heures trente. Il faudra bien expliquer ça à quelqu'un un jour. Préparez une phrase." },
  { at: 14400, text: 'Quatre heures. Le Néant™ ne délivre pas de certificat. Votre temps perdu suffit comme preuve.' },
];

export const ROTATION_MESSAGES = [
  "Le Néant™ vous attribue une prime d'assiduité. Elle ne se convertit pas en euros.",
  "Votre onglet a dépassé la durée de vie moyenne d'une plante de bureau.",
  "Le Néant™ réfléchit à vous nommer salarié. Vous refusez, vous avez déjà un travail.",
  'Statistiquement, vous êtes la personne la mieux informée sur le rien.',
  'Vous auriez reçu un diplôme si cet endroit délivrait quelque chose.',
];

export const ROTATION_START = 14400;
export const ROTATION_STEP = 1800;

function rotationTextAt(threshold) {
  const k = Math.floor((threshold - ROTATION_START) / ROTATION_STEP); // 1, 2, 3…
  return ROTATION_MESSAGES[(k - 1) % ROTATION_MESSAGES.length];
}

// Tous les messages dont le seuil est ≤ seconds, dans l'ordre chronologique.
export function messagesUpTo(seconds) {
  const out = [];
  for (const m of BASE_MESSAGES) {
    if (m.at <= seconds) out.push(m);
  }
  for (let t = ROTATION_START + ROTATION_STEP; t <= seconds; t += ROTATION_STEP) {
    out.push({ at: t, text: rotationTextAt(t) });
  }
  return out;
}

// Premier message dont le seuil est > lastShownAt et ≤ seconds, ou null.
export function nextMessage(seconds, lastShownAt = -Infinity) {
  for (const m of BASE_MESSAGES) {
    if (m.at <= seconds && m.at > lastShownAt) return m;
  }
  for (let t = ROTATION_START + ROTATION_STEP; t <= seconds; t += ROTATION_STEP) {
    if (t > lastShownAt) return { at: t, text: rotationTextAt(t) };
  }
  return null;
}

// ---------- Tableau des scores (5 meilleurs temps) ----------
export function insertScore(scores, entry) {
  const next = [...scores, entry];
  next.sort((a, b) => b.seconds - a.seconds);
  return next.slice(0, 5);
}
