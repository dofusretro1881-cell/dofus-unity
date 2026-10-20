"""Build a self-contained, offline browser version and a source ZIP (Python 3)."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import re

root = Path(__file__).resolve().parent.parent
output = root.parent / 'dofus-survivor.zip'
html = (root / 'index.html').read_text(encoding='utf-8')
css = (root / 'src/style.css').read_text(encoding='utf-8')
css = re.sub(r"@import\s+url\([^;]+;\s*", '', css)
js = (root / 'src/game.js').read_text(encoding='utf-8')
html = html.replace('<link rel="stylesheet" href="/src/style.css">', '<style>\n' + css + '\n</style>')
html = html.replace('<script type="module" src="/src/game.js"></script>', '<script>\n' + js + '\n</script>')
html = html.replace('href="/"', 'href="./JOUER.html"')
(root / 'JOUER.html').write_text(html, encoding='utf-8')
instructions = '''DOFUS SURVIVOR — MODE D'EMPLOI

1. Extraire complètement le ZIP (sur Windows : clic droit > Extraire tout).
2. Ouvrir le dossier extrait « dofus-survivor ».
3. Double-cliquer sur JOUER.html pour l'ouvrir dans Chrome, Edge ou Firefox.
4. Cliquer sur « Entrer dans les champs ».

Aucune installation, aucun compte, aucune connexion Internet nécessaire.
Ne pas lancer le fichier directement depuis l'aperçu du ZIP : extraire d'abord.

COMMANDES
- ZQSD, WASD ou flèches : se déplacer.
- Les attaques sont automatiques lorsqu'un ennemi est à portée.
- Ramasser les cristaux pour gagner de l'expérience.
- Souris ou touches 1, 2, 3 : choisir une amélioration.
- Espace ou Échap : mettre en pause / reprendre.
- Survivre 10 minutes puis vaincre le Bouftou Royal pour gagner.

Les records sont conservés si le navigateur autorise le stockage local pour
les fichiers ouverts sur votre ordinateur. Sinon, le jeu reste jouable.

Prototype pour ordinateur : visuels originaux temporaires, sans sons ni
commandes tactiles. Fan game non officiel.

DÉVELOPPEMENT (FACULTATIF)
Le dossier « sources » contient le code modifiable.
Avec Node.js 20 ou supérieur, ouvrir un terminal dans « sources »,
puis lancer npm start. Aucune dépendance npm à installer.
'''
with ZipFile(output, 'w', ZIP_DEFLATED) as archive:
    archive.writestr('dofus-survivor/JOUER.html', html)
    archive.writestr('dofus-survivor/LIRE-MOI.txt', instructions)
    for name in ['index.html', 'package.json', 'server.mjs', 'README.md', 'src/game.js', 'src/style.css', 'scripts/package.py']:
        archive.write(root / name, 'dofus-survivor/sources/' + name)
print(output)
print(f'{output.stat().st_size} octets')
