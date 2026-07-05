# Partition d'urgence — prototype

Prototype cliquable (preuve de concept) : le parcours d'un **traumatisé sévère** visualisé
comme une **partition à 3 pistes** sur une **timeline temporelle commune**, façon Songsterr.

- **Régulation** (SAMU / Centre 15)
- **Pré-hospitalier** (SMUR / VSAV)
- **Intra-hospitalier** (SAUV / déchocage, réa, bloc)

Une action renseignée par une équipe devient visible des autres pistes et **débloque /
fait clignoter** des actions ailleurs (ex. FAST+ et instable → l'onglet BLOC clignote sur la
régul et l'intra-hosp ; score ABC ≥ 2 → transfusion massive ; grade → niveau de trauma center).

> ⚠️ Démonstration à **données fictives**. Aucun champ patient. Le contenu clinique
> (actions, seuils, mappings) est à **valider** par le médecin référent — voir le plan.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173
```

À l'ouverture, **choix du rôle** (Régulateur / SMUR-VSAV / Hôpital / Observateur) : on **édite
seulement sa ligne** et on **lit** les deux autres (modifiable à tout moment via « Je suis… »).
Un **chrono géant** démarre à l'ouverture et n'est **arrêtable que par l'équipe Hôpital**.

Dans l'app :
- **« Démo guidée (pas à pas) »** : rejoue le cas action par action (on « voit » chaque clic et
  les cascades se déclencher) — lecture / pause / vitesse 0,5–2× / recommencer. Idéal en présentation.
- **« Scénario démo »** : charge instantanément le même cas (instable, grade A) entièrement pré-rempli.
- **« Copier le lien »** / **« WhatsApp »** : partage l'état via une URL (sans backend ; le lien
  n'est utile à un destinataire distant que si l'app est hébergée à une URL publique).
- **« Exporter PDF »** : télécharge un récap chronologique horodaté des actions réalisées.
- **« Tout réduire »** : condense chaque piste en une rangée de **mini-icônes** (détail au survol) ;
  un chevron par piste permet de réduire/développer individuellement.
- **« 2ᵉ fenêtre »** : ouvre une fenêtre synchronisée en temps réel (même machine).

Le **score de Vittel** est une checklist structurée (5 catégories dont la cinétique) ouverte via
l'icône ⓘ de sa pastille ; ≥ 1 critère coché → « traumatisé sévère » (met en avant le grade).

## Faire tester par quelqu'un (autre ordinateur / réseau)

Génère un **fichier HTML unique, autonome**, à envoyer par e-mail / Drive / WhatsApp :

```bash
npm run build:single
```

→ produit **`partition-urgence.html`** à la racine. La personne le **double-clique** : l'app
s'ouvre dans son navigateur, sans rien installer, hors-ligne, sur n'importe quel réseau.
Chaque destinataire a sa propre session (pas de synchro live entre machines).

## Synchro multi-fenêtres (même machine)

Bouton **« 2ᵉ fenêtre »** : ouvre une seconde fenêtre. Toute action cochée dans l'une se
propage **en temps réel** à l'autre (via `BroadcastChannel`, sans serveur). Idéal pour une démo
« côte à côte » (ex. un écran « SMUR », un écran « Régul »). Limité aux fenêtres d'un même
navigateur sur une même machine.

## Scripts

```bash
npm run build              # build statique (dossier dist/) → déployable Vercel/Netlify
npm run build:single       # → partition-urgence.html (fichier unique autonome, à envoyer)
npm test                   # tests unitaires (moteur de règles + partage par lien)
```

## Architecture (data-driven)

Le contenu clinique est **séparé du code** : on fait évoluer la filière sans toucher au moteur.

```
src/
  types/model.ts                       modèle (actions, règles, conditions, effets, état)
  config/protocols/polytrauma/         ← CONTENU éditable (tracks, actions, rules, clinical)
  engine/                              moteur pur : evaluate(rules, état) → effets visuels
  store/                               état du cas (Zustand) + sélecteurs dérivés
  share/                               partage par lien (lz-string) + localStorage
  components/                          UI « Songsterr » (timeline + 3 pistes + détails)
```

Ajouter un déclencheur = ajouter un objet dans `config/protocols/polytrauma/rules.ts`.
Ajouter une action = un objet dans `actions.ts`. Le validateur (`config/validate.ts`)
signale en dev toute cible orpheline.
