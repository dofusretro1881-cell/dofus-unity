# Dofus Survivor

Prototype navigateur d’un fan game non officiel : un Sram survit au zaap d’Astrub face aux Pious, Bouftous, larves et tournesols. Le décor du zaap [4, −19] et les sprites animés sont extraits du client Dofus 1.29.1 archivé par Dofedex. Les sources et détails de conversion sont documentés dans [docs/retro-assets.md](docs/retro-assets.md).

## Jouer sans installation

Sur GitHub, sélectionner la branche `codex/dofus-survivor`, puis **Code → Download ZIP**. Extraire le ZIP et double-cliquer sur **JOUER.html** dans le dossier extrait. Cliquer ensuite sur **Entrer dans les champs**. Aucun terminal, aucune installation et aucune connexion Internet ne sont nécessaires pour cette version autonome.

Pour régénérer la version autonome et l’archive après une modification du code : `python3 scripts/package.py` (Python 3).

## Jouer en local

Node.js 20 ou supérieur. Aucune dépendance à installer.

```sh
npm start
```

Ouvrir le port 3000 dans un navigateur. `PORT=8080 npm start` permet de changer le port.

- ZQSD, WASD ou flèches : déplacement. Les dagues ciblent automatiquement les ennemis à portée.
- Ramasser les cristaux pour gagner de l’XP. Choisir une amélioration avec la souris ou les touches 1, 2, 3.
- Espace ou Échap : pause. Quitter la fenêtre met aussi la partie en pause.
- Survivre 10 minutes pour faire apparaître le Bouftou Royal, puis le vaincre pour gagner.
- Les records sont conservés dans le stockage local du navigateur lorsqu’il est disponible.

`npm run check` vérifie la syntaxe JavaScript. Le jeu ne nécessite ni compte, ni serveur de données, ni clé API. Les polices distantes sont facultatives : des polices système prennent le relais hors ligne.

Les améliorations et équipements durent une seule partie. Le prototype cible les ordinateurs et ne propose pas encore de commandes tactiles ni de sons.
