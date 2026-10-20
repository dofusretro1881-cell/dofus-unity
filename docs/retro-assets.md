# Sources graphiques Dofus 1.29.1

## Dépôts examinés

| Dépôt | Contenu vérifié | Utilité |
| --- | --- | --- |
| [dofera/dofedex](https://github.com/dofera/dofedex) | Archives de clients, lang et maps historiques. La release 1.29.1 a été téléchargée et inspectée. | Source retenue des graphismes. |
| [vincent4vx/JMapEditor](https://github.com/vincent4vx/JMapEditor) | Plus de 5 000 ressources PNG/SWF, notamment des tuiles. | Éditeur et référence de format ; ne fournit pas un inventaire complet de personnages 1.29 attesté. |
| [Arakne/php-map-parser](https://github.com/Arakne/php-map-parser) | Parseur et moteur de rendu, qui nécessitent un client fourni séparément. | Documentation des cellules et de la lecture des maps. |
| [Daweyy/MapRenderer-DR](https://github.com/Daweyy/MapRenderer-DR) | Moteur utilisant l’API dofusretro.fr ; ne livre pas les images. | Référence de structure, pas un pack de sprites. |
| [loonaire/dofus1clientscollection](https://github.com/loonaire/dofus1clientscollection) | Index de clients historiques ; le README indique des liens de partage fermés. | Source alternative à vérifier, non utilisée. |
| [Skrys33/Dofus-Sprites](https://github.com/Skrys33/Dofus-Sprites) | Fichiers Bones/SWF. Version Rétro 1.29 non établie. | Non utilisé pour éviter de mélanger les versions. |

## Archive utilisée

- Source : <https://github.com/dofera/dofedex/releases/tag/1.29.1>
- Fichier : <https://github.com/dofera/dofedex/releases/download/1.29.1/dofus-1.29.1.zip>
- Taille : 166 858 808 octets.
- SHA256 constaté à la récupération : `e16674649b6604833b4c281be681bf7427c405d03c3b9a6d8a79dc0eede55c3c`.
- Transfert HTTPS avec vérification TLS ; toutes les entrées ZIP ont passé le contrôle CRC. Cette empreinte identifie l’archive communautaire inspectée, ce n’est pas une signature publiée par Ankama.
- Inventaire : 939 SWF directement dans `clips/sprites`, 5 SWF d’accessoires, 4 373 SWF d’objets dans `clips/items`, 14 bibliothèques dans `clips/gfx`.
- L’inventaire avec les empreintes de chaque fichier est enregistré dans `assets/retro/catalog.json`. Il permet de retrouver tous les sprites du client archivé, sans copier les 50 Mo de SWF dans le jeu navigateur.

## Map du zaap d’Astrub

`lang/fr/maps/maps_fr_125.swf` référence `MA.m[7411] = {x:4,y:-19,sa:95}`. Le décor est issu de `data/maps/7411_0711291819X.swf` présent dans le client 1.29.1. Il possède 479 cellules, un fond 71 et une grille de largeur 15 et hauteur 17.

La clé de lecture a été trouvée dans la ligne publique de la map 7411 de <https://github.com/StarLoco/StarLoco/blob/master/docker/db-init/04-game.sql>. Les données déchiffrées du fichier d’origine ont été comparées intégralement aux 4 790 caractères de cette ligne : identiques. Les graphismes proviennent exclusivement de l’archive 1.29.1, pas du client StarLoco plus récent. Empreintes du fichier de map et des données décodées dans `assets/retro/map7411.json`.

Le rendu conserve les positions de cellules, les origines des symboles Flash, les retournements, les rotations et l’ordre des couches. Les collisions et l’accès des monstres utilisent les cellules praticables. Il ne s’agit pas d’une map redessinée ou générée. Une comparaison pixel par pixel avec une capture du client Flash d’origine n’a pas été réalisée ; les différences de rastérisation Canvas/Flash et d’anticrénelage restent possibles. Les effets pilotés par ActionScript, notamment l’animation du portail, ne sont pas rejoués : le décor est rendu avec sa première image.

## Personnages et monstres intégrés

| Sprite SWF | Ressource |
| --- | --- |
| `40.swf` | Sram masculin (classe 4, sexe 0) |
| `41.swf` | Sram féminin, extrait et disponible pour une évolution du jeu |
| `1212.swf` | Piou |
| `1016.swf` | Bouftou |
| `1024.swf` | Larve Orange |
| `1011.swf` | Tournesol Sauvage |
| `1090.swf` | Bouftou Royal |

Les noms et identifiants des monstres ont été vérifiés dans `lang/fr/monsters/monsters_fr_178.swf`. Le client construit le nom des sprites de classes par concaténation classe/sexe : 4 + 0 donne 40. Les couleurs sont celles par défaut des symboles, sans application des scripts de personnalisation du client. Les animations de marche/course sont échantillonnées sur 12 images, avec repli sur les directions effectivement présentes dans chaque SWF.

Les PNG sont dans `assets/retro/`. `src/retro-data.js` embarque ces images afin que `JOUER.html` fonctionne sans serveur ni Internet.

## Régénération

Outil d’extraction : [JPEXS Free Flash Decompiler 26.4.0](https://github.com/jindrapetrik/jpexs-decompiler/releases/tag/version26.4.0), utilisé comme bibliothèque de rastérisation, sans exécuter le client Flash.

Avec Python 3, Java 21, le client extrait et FFDec décompressé :

```sh
python3 scripts/prepare-retro.py --client /chemin/dofus-1.29.1 --ffdec /chemin/ffdec
python3 scripts/package.py
```

Les empreintes des sources sont vérifiées avant conversion. `scripts/ExportRetro.java` extrait les symboles et leurs origines. Aucun téléchargement externe n’est nécessaire pour jouer ; seuls les outils de régénération nécessitent les archives sources.

Graphismes et univers : Ankama. Archive communautaire : contributeurs de Dofedex. Ce prototype est un fan game non officiel.

## Validation de cette intégration

- Syntaxe JavaScript vérifiée par `npm run check`.
- Chromium : chargement du jeu et de toutes les images sans erreur JavaScript.
- Les 479 cellules ont été contrôlées ; 369 cases praticables appartiennent à la zone accessible et aucune case bloquée n’est acceptée par les collisions.
- 25 poursuivants répartis sur la map rejoignent le joueur en respectant les obstacles ; essais de déplacements depuis toutes les cases accessibles sans sortir de la zone praticable.
- Simulation accélérée de 10 minutes avec santé restaurée pour contrôler les vagues, les positions des monstres et le déclenchement du boss. Cette simulation ne mesure pas la difficulté d’une partie humaine.
- Fichier autonome extrait du ZIP : tests Chromium avec réseau désactivé, chargement des ressources embarquées, déplacement, pause/reprise, choix d’amélioration, attaque, boss, victoire, défaite et stockage du record.
- Régénération complète des 28 éléments de décor et des 7 ensembles de sprites exécutée avec `prepare-retro.py`, puis archive reconstruite et contrôlée par CRC.
