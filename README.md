# Le Néant™ · OhDjiGames

Un site volontairement inutile, extrêmement soigné : il mesure le temps que vous perdez sur la page.
Plus vous restez, plus le compteur monte, plus les messages absurdes et les grades ridicules s'accumulent.
Rien ne se produit. C'est le but.

100 % statique (HTML, CSS, JS vanilla sans dépendance ni build), polices auto-hébergées, aucun appel réseau,
aucun traceur, aucun cookie. Le tableau des scores vit uniquement dans `localStorage` (clé `odg.le-neant.scores`).

```
public/
  index.html   page + lien de retour vers ohdji.dev
  style.css    direction artistique du hub (fond spatial, Rajdhani + Press Start 2P, jaune/cyan)
  logic.js     règles sans DOM (grades, formatage, messages, tri des scores)
  main.js      compteur, DOM, étoiles filantes, bouton fuyard, scores
tests/         tests des règles (node --test)
nginx.conf     en-têtes de sécurité (CSP stricte), cache, /healthz
Dockerfile     nginx-unprivileged, port 8080
```

## Les grades

Le grade évolue avec le temps passé : `VISITEUR INNOCENT` (0 s), `APPRENTI DU VIDE` (30 s),
`CONTEMPLATEUR DU NÉANT` (2 min), `MAÎTRE DU TEMPS PERDU` (5 min), `SEIGNEUR DU SCROLL INUTILE` (10 min),
`LÉGENDE VIVANTE DU NÉANT ABSOLU` (20 min), `ARCHIVISTE DE L'INUTILE` (30 min), `DOCTEUR ÈS RIEN` (45 min),
`GARDIEN CERTIFIÉ DU VIDE` (1 h), `TROU NOIR AMATEUR` (1 h 30), `ENTITÉ INEXPLICABLE` (2 h),
`MONUMENT À L'ENNUI` (2 h 30), `LE PROBLÈME` (3 h), `AU-DELÀ DU NÉANT` (3 h 30). Au-delà de 4 h, un cycle
de 30 minutes parmi `RÉFÉRENCE OFFICIELLE DU RIEN`, `ACTIONNAIRE DU NÉANT™`, `PERSONNE NE VOUS CROIRA`,
`STATUT NON DOCUMENTÉ`, `HORS CATÉGORIE`.

## Développer

```bash
npm test                                      # règles du jeu
cd public && python3 -m http.server 8000      # http://localhost:8000
docker build -t game-le-neant . && docker run --rm -p 8080:8080 game-le-neant
```

Paramètre de debug (sans effet en production) : `?debug=seconds=3725` force le compteur à un état avancé
pour tester les grades et les messages.

## Déploiement Dokploy

Application, build Dockerfile, port 8080, HTTPS Let's Encrypt, domaine `https://neant.ohdji.dev`.
Ensuite, dans le hub : ajouter le `<a class="slot slot-on">` dans `index.html` et retirer son angle de
`LOCKED_ANGLES` dans `hub.js`.

Aucune donnée n'est stockée ailleurs que dans votre navigateur, aucune utilité réelle n'est fournie.
