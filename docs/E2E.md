# Tests e2e TEMPO — tester-army

Node >=22.12.0. Paquets épinglés : `e2e@0.17.0`, `@e2e-dev/web@0.12.0`.

```sh
npm ci
npm ci --prefix server
npx @e2e-dev/web install chromium
npm run test:e2e
npm run build && npm test && npm run build:single
npm run typecheck --prefix server
```

Le runner lance Vite uniquement sur `127.0.0.1:4315`, strictPort. Les tests `rooms` lancent Wrangler **local** sur `127.0.0.1:4415`, stockage temporaire propre sous `.e2e/worker/`, supprimé en teardown. `.e2e/` contient les rapports/traces/PDF et est ignoré. Aucun modèle ni clé fournisseur : tests déterministes via fixtures `@e2e-dev/web`, pas de `agent.*`, télémétrie désactivée par la commande. `-- --grep 'titre'` sélectionne une famille.

## Inventaire des familles

| Famille et source | Oracle réellement exercé | Limite |
|---|---|---|
| RoleGate/RoleSwitcher, uiStore | 4 rôles ; 3 pistes ; en-tête intervenant réservé à sa piste, nom de code/global reset/démo aux éditeurs ; chaque éditeur carte propriétaire écrit/efface localStorage ; cartes étrangères désactivées | rôles de prévention UI, pas authentification serveur |
| ActionDetailPanel + actions.ts | Tous les sous-champs configurés, checklist/timestamp/nombre/texte/select/jauge ; propriétaire autorisé, observateur désactivé | aucune validation médicale du contenu |
| rules.ts / engine | Vittel calculé ; grade → pré-alerte → équipe ; Wallace 22.5 → remplissage puis reverrouillage | les autres branches/bornes cliniques relèvent des tests unitaires existants, pas chacune d'un scénario navigateur |
| CaseHeader/persistence/urlState | champs fictifs ; rechargement ; snapshot partagé prioritaire ; hash conservé et actualisé après édition ; reset immédiat répétable et redémarrage ; JSON/hash corrompus | quota stockage privé non simulé |
| DemoCaseButton/GuidedPlayer | scénario prérempli, navigation/Pause/Reprendre/vitesse/quitter sans restauration, garde de rôle courante | narration acoustique et visite complète chronométrée non vérifiées |
| EvolutionLog/BurnBodyMap/Stopwatch | note vide/add/delete ; zones sélectionnées/effacées ; chrono intra uniquement arrêt/reprise persistés | aucune donnée réelle |
| Recap/ShareBar | lignes calculées exactes du scénario ; fichier téléchargé `%PDF-` >1000 octets ; WhatsApp URL interceptée ; popup impression refusé | pas d'envoi WhatsApp ni impression physique ; contenu PDF non analysé texte par texte |
| useBroadcastSync/merge | vrai BroadcastChannel local synthétique ; fusion visible/persistée ; message invalide ignoré | second product UI simultané non piloté ; tests unitaires LWW existants |
| useRoomSync | mock HTTP explicite : publish, état distant, 503, reprise, arrêt | panne réseau réelle/timeouts longs non reproduits |
| server/index.ts + room.ts | vrai Worker/Durable Object local : vide/write/read/version/tombstone ; 400/403/404/405/413 (ASCII et UTF-8 multioctets) ; état inchangé après refus | alarme 12h, rate-limit, juridiction UE/Cloudflare distant non exercés |
| client + vrai Worker | synchro navigateur jusqu'au stockage Worker et retour distant/tombstone ; observateur consulte sans POST ; en-tête refusé persistant ; bascule en vol bloque publication tardive ; édition légitime reprend | adaptateur test CORS : route navigateur relayée par Node au vrai Worker ; allowlist production intacte |
| VoiceControl/useVoiceDictation/parser | Web Speech mock explicite ; dictée, correction, synthèse, validation, changement de rôle tardif, refus micro ; API absente | micro, reconnaissance fournisseur et qualité acoustique réels non vérifiés |
| LayoutToggle/Sources | mobile390px, Pupitre/Portée, réduire/développer, références ouvertes | Safari/Firefox, audits visuels/accessibilité complets non exécutés |

## Régressions corrigées

1. **Détail : observateur modifiait les critères**, bien que les cartes soient en lecture seule. `permissions.e2e.ts` échouait sur `toBeDisabled` pour « Glasgow <13 ». Un fieldset désactivé et une garde de callback appliquent le rôle aux sous-champs ; le test est vert. Toutes les familles de sous-champs sont ensuite exercées par propriétaire/observateur.
2. **Dictée après changement de rôle : une transcription tardive écrivait encore en lecture seule.** Le test injecte tension95 au SMUR, passe Observateur, injecte tension70 : avant correction valeur70 observée, après correction95 conservée. `applyFills` relit le rôle courant au moment de l'événement. Aucun seuil/contenu clinique modifié.

3. **En-tête/reset/scénarios en lecture seule** : l'observateur pouvait écrire les noms et les publier en salle, ou vider/remplacer le cas. `setHeader` filtre maintenant selon le rôle courant, les champs sont désactivés, et reset/démos relisent le rôle. Le player interrompt la lecture sans restaurer le cas (comportement main) lors d'une bascule observateur. L'observateur peut toujours rejoindre via le lien partagé et recevoir les changements, mais le polling ne publie jamais sous ce rôle. Une régression sur vrai Worker relit état/version inchangés après tentative, reçoit un changement distant, puis vérifie reprise des writes légitimes. Le reset immédiat et les événements guidés tardifs sont aussi exercés.
4. **Plafond Worker UTF-8** : le serveur comparait `String.length` aux 300000 octets annoncés. La mémoire retenue est bornée par `Uint8Array.byteLength` pendant le stream avant décodage. Après dépassement, le reste est consommé sans accumulation avant la réponse413 : aucun `reader.cancel()` asynchrone ne reste actif après la réponse. Cette vidange évite le défaut de cycle de vie workerd observé localement ; elle attend toutefois la fin de l’envoi et ne borne pas le temps de traitement d’un émetteur arbitrairement lent. Un cas à110000 caractères `界` reçoit413 sans changer le stockage ; une petite charge Unicode valide réussit.

## Cartes protocolaires (source : actions.ts)

Le test est piloté par l'inventaire importé depuis la configuration : tout ajout de carte éditable ou de sous-champ entre automatiquement dans la boucle correspondante. 65 cartes issues du main courant. Les constantes horodatées sont ajoutées deux fois (bouton/Entrée), persistées et leurs historiques détaillés relus ; main ne fournit pas de suppression des entrées. « calculée » indique un rendu calculé et/ou critères détaillés : les formules complètes ne sont pas toutes réassertées au navigateur.

| Identifiant | Type | Couverture navigateur |
|---|---|---|
| `regul.appel.vittel` | computed | calculée / critères si présents |
| `regul.moyens.vsav` | checkbox | écriture + effacement + persistance |
| `regul.moyens.smur` | checkbox | écriture + effacement + persistance |
| `regul.moyens.heli` | checkbox | écriture + effacement + persistance |
| `regul.tc.niveau1` | checkbox | écriture + effacement + persistance |
| `regul.tc.niveau2` | checkbox | écriture + effacement + persistance |
| `regul.tc.niveau3` | checkbox | écriture + effacement + persistance |
| `regul.tc.ctb` | checkbox | écriture + effacement + persistance |
| `regul.tc.pediatrie` | checkbox | écriture + effacement + persistance |
| `regul.orientation.destination` | select | écriture + effacement + persistance |
| `regul.prealerte.centre` | checkbox | écriture + effacement + persistance |
| `regul.prealerte.rea` | checkbox | écriture + effacement + persistance |
| `regul.bloc.anticip` | checkbox | écriture + effacement + persistance |
| `prehosp.x.hemostase` | select | écriture + effacement + persistance |
| `prehosp.a.vas` | select | écriture + effacement + persistance |
| `prehosp.b.spo2` | number | ajouts historiques + persistance |
| `prehosp.b.fr` | number | ajouts historiques + persistance |
| `prehosp.b.pneumothorax` | select | écriture + effacement + persistance |
| `prehosp.c.pas` | number | ajouts historiques + persistance |
| `prehosp.c.fc` | number | ajouts historiques + persistance |
| `prehosp.c.hemocue` | number | ajouts historiques + persistance |
| `prehosp.c.traumabassin` | select | écriture + effacement + persistance |
| `prehosp.c.fast` | select | écriture + effacement + persistance |
| `prehosp.d.gcs` | number | ajouts historiques + persistance |
| `prehosp.d.anisocorie` | checkbox | écriture + effacement + persistance |
| `prehosp.d.glycemie` | number | ajouts historiques + persistance |
| `prehosp.d.deficit_neurologique` | select | écriture + effacement + persistance |
| `prehosp.d.otorragie` | select | écriture + effacement + persistance |
| `prehosp.e.hypothermie` | checkbox | écriture + effacement + persistance |
| `prehosp.e.temperature` | number | écriture + effacement + persistance |
| `prehosp.g.noradrenaline` | checkbox | écriture + effacement + persistance |
| `prehosp.g.garrot` | checkbox | écriture + effacement + persistance |
| `prehosp.g.vvp` | checkbox | écriture + effacement + persistance |
| `prehosp.g.isr` | checkbox | écriture + effacement + persistance |
| `prehosp.g.exsufflation` | checkbox | écriture + effacement + persistance |
| `prehosp.g.pelvien` | checkbox | écriture + effacement + persistance |
| `prehosp.acsos` | checkbox | écriture + effacement + persistance |
| `pam-tc` | number | ajouts historiques + persistance |
| `pam-hemo` | number | ajouts historiques + persistance |
| `capnie` | number | ajouts historiques + persistance |
| `spo2` | number | écriture + effacement + persistance |
| `hcue` | number | écriture + effacement + persistance |
| `temperature` | number | écriture + effacement + persistance |
| `glycemie` | number | écriture + effacement + persistance |
| `prehosp.acr` | checkbox | écriture + effacement + persistance |
| `regul.acr` | checkbox | écriture + effacement + persistance |
| `prehosp.transport.evolution` | text | écriture + effacement + persistance |
| `prehosp.g.expansion` | checkbox | écriture + effacement + persistance |
| `prehosp.g.antibioprophylaxie` | checkbox | écriture + effacement + persistance |
| `prehosp.g.octaplas` | checkbox | écriture + effacement + persistance |
| `prehosp.g.osmotherapie` | checkbox | écriture + effacement + persistance |
| `prehosp.g.txa` | checkbox | écriture + effacement + persistance |
| `prehosp.g.nad` | checkbox | écriture + effacement + persistance |
| `prehosp.brulures.remplissage` | checkbox | écriture + effacement + persistance |
| `prehosp.scores.shockindex` | computed | calculée / critères si présents |
| `prehosp.scores.abc` | computed | calculée / critères si présents |
| `prehosp.scores.batt` | computed | calculée / critères si présents |
| `prehosp.scores.hemodynamique` | select | écriture + effacement + persistance |
| `prehosp.scores.grade` | select | écriture + effacement + persistance |
| `prehosp.transmission.bilan` | checkbox | écriture + effacement + persistance |
| `intra.activation.equipe` | checkbox | écriture + effacement + persistance |
| `intra.imagerie.efast` | checkbox | écriture + effacement + persistance |
| `intra.imagerie.rt` | checkbox | écriture + effacement + persistance |
| `intra.imagerie.bassin` | checkbox | écriture + effacement + persistance |
| `intra.imagerie.bio` | checkbox | écriture + effacement + persistance |
| `intra.imagerie.bodyct` | checkbox | écriture + effacement + persistance |
| `intra.transfusion.ptm` | checkbox | écriture + effacement + persistance |
| `intra.transfusion.octaplas` | checkbox | écriture + effacement + persistance |
| `intra.bloc.damagecontrol` | checkbox | écriture + effacement + persistance |
| `intra.bloc.arterio` | checkbox | écriture + effacement + persistance |
| `intra.ctb.avis` | checkbox | écriture + effacement + persistance |

## Réconciliation main 6bb1239

23 tests navigateur, 5 fichiers. `current-main.e2e.ts` vérifie les historiques PAS 86→95→100, rechargement, prompt terminé après passage observateur (70 refusé), et six zones eFAST présent→absent→effacé puis lecture seule. Le test permanent legacy enregistre une PAS numérique86 dans localStorage, recharge puis ouvre le détail :86 et1valeur doivent être visibles, et la valeur persistée doit rester le nombre86 (pas une chaîne). La suppression de la garde numérique fait échouer ce test dans une copie isolée.

Les tests unitaires upstream supprimés ne sont pas restaurés (39 tests actuels contre59 auparavant). Les règles ACSOS générées sont testées isolément : main a retiré leur installation dans le protocole. Aucun seuil ni règle clinique ajouté. Le parseur conserve les protections de mots entiers, décimales, nombres non tronqués et fenêtre entre champs ; une expression numérique plus spécifique (PAM) prime sur son préfixe générique (PAS).

Les snapshots avec hash restent partageables ; les modifications actualisent le hash, ce qui évite qu’un reload restaure le snapshot précédent. Le reset est immédiat conformément à main. Dépendances produit React18/Vite5 et nouveaux composants conservés. `VITE_TEMPO_SYNC_URL` est la variable courante.
