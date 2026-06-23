# Compteur blackjack Hi-Lo

Petite app web autonome pour compter les cartes au blackjack.

## Lancer

Ouvre `index.html` dans ton navigateur.

Tu peux aussi utiliser un serveur local si tu preferes :

```bash
python3 -m http.server 8080
```

Puis va sur `http://localhost:8080`.

## Fonctions

- Comptage Hi-Lo : `2-6 = +1`, `7-9 = 0`, `10/J/Q/K/A = -1`.
- Running count, true count, cartes vues et decks restants.
- Bloc `Resultat maintenant` avec action de mise, action de jeu et raison.
- Deroulement complet d'une manche : croupier, nombre de joueurs, mains et cartes.
- Phase de mise avec `Distribuer`, `Doubler mises`, `Retirer mises` et `Retour mise`.
- Memoire persistante des parties : les manches terminees sont archivees avec les cartes passees.
- Resume des cartes deja vues par rang et Hi-Lo cumule sur la memoire.
- Recommandation par main : tirer, rester, doubler, split, abandon ou assurance.
- Boutons d'action pour jouer la main active sans simuler de fausses cartes.
- Comptage des cartes visibles de la table sans recompter les cartes deja ajoutees.
- Regles configurables : croupier S17/H17, abandon, double apres split, assurance, As splittes.
- Decision du croupier : tirer jusqu'a 16, rester sur 17 dur, et appliquer S17/H17 sur soft 17.
- Resultat de fin de manche : gagne, perdu, push, blackjack ou abandon.
- Reglage du nombre de decks et de la mise de base.
- Selecteur VPN avec activation pour Argentine, Azerbaidjan, Bresil, Hongrie, Philippines, Pologne, Roumanie, Afrique du Sud et Tanzanie.
- Historique avec annulation.
- Import photo avec detection des cartes visibles.
- Lecture des rangs dans les coins des cartes, meme quand plusieurs cartes se touchent.
- Suggestion automatique de valeur avec validation avant ajout.
- Validation manuelle avant ajout au compteur.
- Bouton `Carte manquante` si une carte n'est pas detectee automatiquement.

La reconnaissance photo est volontairement locale et sans dependance externe. Elle marche mieux avec des cartes bien separees, contrastees, et prises assez droites.
