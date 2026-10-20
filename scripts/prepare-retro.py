"""Export the selected original artwork with FFDec, then rebuild embedded browser data.
Usage: python3 scripts/prepare-retro.py --client /path/dofus-1.29.1 --ffdec /path/ffdec
Requires Python 3 and Java 21. No Flash executable or client code is executed.
"""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import argparse, base64, hashlib, json, os, shutil, subprocess, tempfile

args = argparse.ArgumentParser(description=__doc__)
args.add_argument('--client', type=Path, required=True)
args.add_argument('--ffdec', type=Path, required=True)
opt = args.parse_args()
root = Path(__file__).resolve().parent.parent
asset_root = root / 'assets/retro'
map_data = json.loads((asset_root / 'map7411.json').read_text())
catalog = json.loads((asset_root / 'catalog.json').read_text())
expected = {item['file']: item['sha256'] for item in catalog['files']}
map_file = opt.client / 'data/maps/7411_0711291819X.swf'
if hashlib.sha256(map_file.read_bytes()).hexdigest() != map_data['sourceSha256']:
    raise SystemExit('Le fichier de map ne correspond pas à la source 1.29.1 vérifiée.')
needed = {'g': {map_data['background']}, 'o': set()}
for cell in map_data['cells']:
    if cell['active']:
        if cell['ground']:
            needed['g'].add(cell['ground'])
        needed['o'].update(n for n in [cell['o1'], cell['o2']] if n)

classpath = str(opt.ffdec / 'ffdec.jar') + os.pathsep + str(opt.ffdec / 'lib/*')
jobs = [(p, [str(n) for n in sorted(needed[p.stem[0]])])
        for p in sorted((opt.client / 'clips/gfx').glob('*.swf')) if p.stem[0] in 'go']
for sprite in [40, 41, 1212, 1016, 1024, 1011, 1090]:
    jobs.append((opt.client / f'clips/sprites/{sprite}.swf',
                 ['static' + d for d in 'RLFB'] + [action + d + ':12' for action in ['run', 'walk'] for d in 'RLFB']))
for file, _ in jobs:
    key = file.relative_to(opt.client).as_posix()
    if hashlib.sha256(file.read_bytes()).hexdigest() != expected.get(key):
        raise SystemExit('Source différente du catalogue vérifié : ' + key)

def export(job, temporary):
    file, names = job
    target = temporary / file.stem
    target.mkdir()
    command = ['java', '-Xmx384m', '-Djava.awt.headless=true', '--class-path', classpath,
               str(root / 'scripts/ExportRetro.java'), str(file), str(target), ','.join(names)]
    result = subprocess.run(command, check=True, text=True, capture_output=True)
    (target / 'symbols.tsv').write_text(result.stdout)
    return target

with tempfile.TemporaryDirectory(prefix='astrub-assets-') as temp:
    temporary = Path(temp)
    with ThreadPoolExecutor(max_workers=3) as executor:
        directories = list(executor.map(lambda job: export(job, temporary), jobs))
    tiles, sprites = {}, {}
    for directory in directories:
        tile = directory.stem[0] in 'go'
        output = asset_root / ('tiles' if tile else 'sprites') / directory.stem
        output.mkdir(parents=True, exist_ok=True)
        for line in (directory / 'symbols.tsv').read_text().splitlines():
            name, symbol, x0, y0, x1, y1, count = line.split('\t')
            meta = {'x': float(x0), 'y': float(y0), 'w': float(x1)-float(x0), 'h': float(y1)-float(y0), 'frames': []}
            for image in sorted(directory.glob(name + '-*.png'), key=lambda p: int(p.stem.rsplit('-', 1)[1])):
                shutil.copy2(image, output / image.name)
                meta['frames'].append('data:image/png;base64,' + base64.b64encode(image.read_bytes()).decode())
            if tile:
                tiles[directory.stem[0] + name] = meta
            else:
                sprites.setdefault(directory.stem, {})[name] = meta
    required = {'g'+str(n) for n in needed['g']} | {'o'+str(n) for n in needed['o']}
    if required - tiles.keys():
        raise SystemExit('Tuiles absentes : ' + str(required - tiles.keys()))
    if any(not sprites.get(str(i), {}).get('staticR') for i in [40, 41, 1212, 1016, 1024, 1011, 1090]):
        raise SystemExit('Un sprite requis est absent.')
    map_data.update(tiles=tiles, sprites=sprites)
    (root / 'src/retro-data.js').write_text(
        '// Extracted from the archived Dofus 1.29.1 client; provenance: docs/retro-assets.md\nwindow.RETRO_DATA='
        + json.dumps(map_data, separators=(',', ':')) + ';\n')
    print(f'{len(tiles)} décors et {len(sprites)} personnages/monstres exportés.')
