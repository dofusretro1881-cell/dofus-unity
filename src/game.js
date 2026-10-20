const $ = (id) => document.getElementById(id),
  canvas = $("game"),
  ctx = canvas.getContext("2d");
let W = innerWidth,
  H = innerHeight,
  dpr = 1;
function resize() {
  W = innerWidth;
  H = innerHeight;
  dpr = Math.min(devicePixelRatio || 1, 2);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
addEventListener("resize", resize);
resize();
const world = window.RetroWorld;
let assetsReady = false;
const playLabel = $("play").innerHTML;
$("play").disabled = true;
$("play").textContent = "Chargement des graphismes 1.29…";
world.loaded
  .then(() => {
    assetsReady = true;
    const portrait = new Image();
    portrait.src = window.RETRO_DATA.sprites["40"].staticR.frames[0];
    portrait.alt = "Sram";
    document.querySelector(".portrait").replaceChildren(portrait);
    $("play").disabled = false;
    $("play").innerHTML = playLabel;
  })
  .catch(() => {
    $("play").textContent = "Chargement impossible : réouvrez le jeu.";
  });
const keys = new Set();
let state = "menu",
  g,
  last = 0,
  ambient = 0;
let best = {};
try {
  best = JSON.parse(localStorage.getItem("astrub-record") || "{}") || {};
} catch {}
function record() {
  $("record").textContent =
    best.kills !== undefined
      ? `MEILLEURE EXPÉDITION · ${best.kills} monstres · ${clock(best.time)}${best.win ? " · Boss vaincu" : ""}`
      : "";
}
record();
function clock(t) {
  return `${Math.floor(t / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(t % 60)
    .toString()
    .padStart(2, "0")}`;
}
function start() {
  if (!assetsReady) return;
  g = {
    x: world.spawn.x,
    y: world.spawn.y,
    hp: 100,
    maxHp: 100,
    time: 0,
    kills: 0,
    level: 1,
    xp: 0,
    need: 8,
    damage: 24,
    rate: 0.7,
    speed: 105,
    range: 190,
    armor: 0,
    regen: 0,
    poison: 0,
    trap: 0,
    daggers: 1,
    enemies: [],
    shots: [],
    gems: [],
    traps: [],
    effects: [],
    attack: 0,
    spawn: 0,
    trapTimer: 0,
    inv: 0,
    bossSpawned: false,
    facing: "R",
    moving: false,
  };
  keys.clear();
  state = "playing";
  $("menu").hidden = true;
  $("modal").hidden = true;
  $("hud").hidden = false;
  updateHUD();
}
$("play").onclick = start;
function showModal(html) {
  $("modalContent").innerHTML = html;
  $("modal").hidden = false;
}
function pause() {
  if (state === "playing") {
    state = "paused";
    showModal(
      '<div class="eyebrow">REPRENDRE SON SOUFFLE</div><h2>Les ombres attendront.</h2><p>Votre expédition est en pause.</p><button id="resume" class="primary">Reprendre l’expédition →</button>',
    );
    $("resume").onclick = resume;
  } else if (state === "paused") resume();
}
function resume() {
  state = "playing";
  $("modal").hidden = true;
  keys.clear();
}
$("pause").onclick = pause;
addEventListener("keydown", (e) => {
  if (
    ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(
      e.code,
    )
  )
    e.preventDefault();
  if (e.code === "Space" || e.code === "Escape") {
    if (!e.repeat) pause();
    return;
  }
  keys.add(e.key.toLowerCase());
  if (state === "upgrade" && ["1", "2", "3"].includes(e.key))
    document.querySelectorAll(".choice")[Number(e.key) - 1]?.click();
});
addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));
addEventListener("blur", () => {
  keys.clear();
  if (state === "playing") pause();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && state === "playing") pause();
});
const upgrades = [
  [
    "Dagues aiguisées",
    "SORT",
    "Les dagues infligent 9 dégâts supplémentaires.",
    () => (g.damage += 9),
  ],
  [
    "Réflexes du Sram",
    "SORT",
    "Les attaques automatiques sont 15 % plus rapides.",
    () => (g.rate = Math.max(0.12, g.rate * 0.85)),
  ],
  [
    "Double jeu",
    "SORT",
    "Une dague supplémentaire à chaque attaque.",
    () => (g.daggers = Math.min(8, g.daggers + 1)),
    () => g.daggers < 8,
  ],
  [
    "Piège mortel",
    "SORT",
    "Pose un piège autour de vous toutes les 3 secondes. +24 dégâts par rang.",
    () => (g.trap += 24),
  ],
  [
    "Poison insidieux",
    "SORT",
    "Les dagues empoisonnent : +7 dégâts par seconde pendant 3 secondes.",
    () => (g.poison += 7),
  ],
  [
    "Bottes du Bouftou",
    "ÉQUIPEMENT",
    "Vitesse de déplacement augmentée de 12 %.",
    () => (g.speed *= 1.12),
  ],
  [
    "Coiffe du Bouftou",
    "ÉQUIPEMENT",
    "+25 points de vie maximum et soigne 35 points de vie.",
    () => {
      g.maxHp += 25;
      g.hp = Math.min(g.maxHp, g.hp + 35);
    },
  ],
  [
    "Cape du Piou",
    "ÉQUIPEMENT",
    "Réduit les dégâts subis de 2 points (minimum : 1).",
    () => (g.armor += 2),
  ],
  [
    "Anneau des champs",
    "ÉQUIPEMENT",
    "Régénère 0,7 point de vie par seconde supplémentaire.",
    () => (g.regen += 0.7),
  ],
  [
    "Œil de la nuit",
    "SORT",
    "Portée des dagues augmentée de 40 et rayon de collecte accru.",
    () => (g.range += 40),
  ],
];
function levelUp() {
  state = "upgrade";
  const choices = upgrades
    .filter((u) => !u[4] || u[4]())
    .map((u) => ({ u, r: Math.random() }))
    .sort((a, b) => a.r - b.r)
    .slice(0, 3)
    .map((v) => v.u);
  showModal(
    `<div class="eyebrow">NIVEAU ${g.level} · CHOISISSEZ VOTRE VOIE</div><h2>Un peu plus mortel.</h2><p>Choisissez un sort ou un équipement pour cette expédition.</p><div class="choices">${choices.map((u, i) => `<button class="choice" data-choice="${i}"><small>${u[1]} · ${i + 1}</small><strong>${u[0]}</strong><p>${u[2]}</p></button>`).join("")}</div>`,
  );
  document.querySelectorAll(".choice").forEach(
    (b, i) =>
      (b.onclick = () => {
        choices[i][3]();
        resume();
        updateHUD();
      }),
  );
}
function finish(win) {
  state = "ended";
  if (!best.kills || g.kills > best.kills || (win && !best.win)) {
    best = { kills: g.kills, time: g.time, win };
    try {
      localStorage.setItem("astrub-record", JSON.stringify(best));
    } catch {}
  }
  record();
  showModal(
    `<div class="eyebrow">${win ? "ASTRUB VOUS DOIT UNE FIÈRE CHANDELLE" : "LES CHAMPS GARDENT VOTRE SOUVENIR"}</div><h2>${win ? "L’aube est à vous." : "Les ombres vous emportent."}</h2><p>${win ? "Le Bouftou Royal est vaincu. Votre expédition est une réussite." : "Chaque expédition est une nouvelle chance."}</p><div class="results"><div><b>${clock(g.time)}</b><span>TEMPS</span></div><div><b>${g.kills}</b><span>MONSTRES</span></div><div><b>${g.level}</b><span>NIVEAU</span></div></div><button class="primary" id="retry">Nouvelle expédition ↗</button>`,
  );
  $("retry").onclick = start;
}
function updateHUD() {
  $("level").textContent = `NIV. ${g.level}`;
  $("hp").style.width = `${Math.max(0, (g.hp / g.maxHp) * 100)}%`;
  $("hpText").textContent = `${Math.ceil(Math.max(0, g.hp))} / ${g.maxHp} PV`;
  $("time").textContent = clock(g.time);
  $("kills").textContent = g.kills;
  $("xp").style.width = `${(g.xp / g.need) * 100}%`;
  $("loadout").innerHTML =
    `<div class="slot">⚔ Dagues ×${g.daggers}</div>${g.trap ? '<div class="slot">◇ Piège mortel</div>' : ""}${g.poison ? '<div class="slot">✧ Poison</div>' : ""}`;
}
function spawn(boss = false) {
  const pos = world.spawnPoint(g.x, g.y);
  const type = boss
    ? 4
    : Math.floor(Math.random() * Math.min(4, 2 + g.time / 70));
  const stats = [
    { hp: 24, s: 40, r: 6, art: "1212", name: "Piou" },
    { hp: 70, s: 28, r: 10, art: "1016", name: "Bouftou" },
    { hp: 44, s: 48, r: 8, art: "1024", name: "Larve Orange" },
    { hp: 100, s: 31, r: 9, art: "1011", name: "Tournesol Sauvage" },
    { hp: 6500, s: 24, r: 23, art: "1090", name: "Bouftou Royal" },
  ][type];
  g.enemies.push({
    ...stats,
    type,
    x: pos.x,
    y: pos.y,
    cell: pos.id,
    facing: "R",
    hp: stats.hp * (boss ? 1 : 1 + g.time / 250),
    max: stats.hp * (boss ? 1 : 1 + g.time / 250),
    poison: 0,
    dot: 0,
    flash: 0,
  });
}
function damage(e, n) {
  e.hp -= n;
  e.flash = 0.1;
  if (e.hp <= 0 && !e.dead) {
    e.dead = true;
    g.kills++;
    g.gems.push({
      x: e.x,
      y: e.y,
      v: e.type === 4 ? 50 : e.type === 1 ? 3 : 1,
    });
    g.effects.push({ x: e.x, y: e.y, t: 0.4, r: e.r, color: "#d6dda4" });
    if (e.type === 4) finish(true);
  }
}
function update(dt) {
  g.time += dt;
  g.inv -= dt;
  g.hp = Math.min(g.maxHp, g.hp + g.regen * dt);
  let dx =
      Number(keys.has("d") || keys.has("arrowright")) -
      Number(keys.has("q") || keys.has("a") || keys.has("arrowleft")),
    dy =
      Number(keys.has("s") || keys.has("arrowdown")) -
      Number(keys.has("z") || keys.has("w") || keys.has("arrowup"));
  let len = Math.hypot(dx, dy) || 1;
  g.moving = !!(dx || dy);
  if (g.moving)
    g.facing =
      Math.abs(dy) > Math.abs(dx) ? (dy > 0 ? "F" : "B") : dx < 0 ? "L" : "R";
  world.move(g, (dx / len) * g.speed * dt, (dy / len) * g.speed * dt);
  world.field(g.x, g.y, dt);
  if (g.time >= 600 && !g.bossSpawned) {
    g.bossSpawned = true;
    spawn(true);
  }
  g.spawn -= dt;
  if (g.spawn <= 0) {
    g.spawn = Math.max(0.28, 1.2 - g.time / 650);
    for (let i = 0; i < 1 + Math.floor(g.time / 150); i++)
      if (g.enemies.length < 160) spawn();
  }
  const targets = g.enemies
    .filter((e) => !e.dead && Math.hypot(e.x - g.x, e.y - g.y) < g.range)
    .sort(
      (a, b) =>
        Math.hypot(a.x - g.x, a.y - g.y) - Math.hypot(b.x - g.x, b.y - g.y),
    );
  g.attack -= dt;
  if (g.attack <= 0 && targets.length) {
    g.attack = g.rate;
    for (let i = 0; i < g.daggers; i++) {
      const e = targets[i % targets.length],
        a = Math.atan2(e.y - g.y, e.x - g.x);
      g.shots.push({
        x: g.x,
        y: g.y,
        vx: Math.cos(a) * 350,
        vy: Math.sin(a) * 350,
        t: 0.8,
        damage: g.damage,
      });
    }
  }
  g.trapTimer -= dt;
  if (g.trap && g.trapTimer <= 0) {
    g.trapTimer = 3;
    g.traps.push({ x: g.x, y: g.y, t: 12 });
  }
  for (const e of g.enemies) {
    if (e.dead) continue;
    e.flash -= dt;
    const d = Math.hypot(g.x - e.x, g.y - e.y) || 1;
    world.chase(e, g.x, g.y, dt);
    if (e.poison > 0) {
      e.poison -= dt;
      damage(e, e.dot * dt);
    }
    if (d < e.r + 7 && g.inv <= 0) {
      g.hp -= Math.max(1, (e.type === 4 ? 32 : 10) - g.armor);
      g.inv = 0.65;
      g.effects.push({ x: g.x, y: g.y, t: 0.25, r: 15, color: "#df7b64" });
    }
  }
  // Separate the horde so enemies remain visible instead of merging into one sprite.
  for (let i = 0; i < g.enemies.length; i++)
    for (let j = i + 1; j < g.enemies.length; j++) {
      const a = g.enemies[i],
        b = g.enemies[j];
      if (a.dead || b.dead) continue;
      let dx = a.x - b.x,
        dy = a.y - b.y,
        d = Math.hypot(dx, dy),
        space = (a.r + b.r) * 0.8;
      if (d < space) {
        if (d < 0.01) {
          const angle = (i * 2.4 + j) * 1.7;
          dx = Math.cos(angle);
          dy = Math.sin(angle);
          d = 1;
        }
        const push = Math.min(2, (space - d) * dt * 2);
        world.move(a, (dx / d) * push, (dy / d) * push);
        world.move(b, (-dx / d) * push, (-dy / d) * push);
      }
    }
  for (const s of g.shots) {
    const fromX = s.x,
      fromY = s.y;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.t -= dt;
    const vx = s.x - fromX,
      vy = s.y - fromY,
      l2 = vx * vx + vy * vy;
    for (const e of g.enemies) {
      const t = l2
        ? Math.max(
            0,
            Math.min(1, ((e.x - fromX) * vx + (e.y - fromY) * vy) / l2),
          )
        : 0;
      if (
        !e.dead &&
        Math.hypot(e.x - fromX - t * vx, e.y - fromY - t * vy) < e.r + 4
      ) {
        damage(e, s.damage);
        if (g.poison) {
          e.poison = 3;
          e.dot = g.poison;
        }
        s.t = -1;
        break;
      }
    }
  }
  for (const t of g.traps) {
    t.t -= dt;
    if (
      g.enemies.some(
        (e) => !e.dead && Math.hypot(e.x - t.x, e.y - t.y) < e.r + 20,
      )
    ) {
      for (const e of g.enemies)
        if (!e.dead && Math.hypot(e.x - t.x, e.y - t.y) < 65) damage(e, g.trap);
      t.t = -1;
      g.effects.push({ x: t.x, y: t.y, t: 0.5, r: 65, color: "#c1d87e" });
    }
  }
  for (const gem of g.gems) {
    const d = Math.hypot(gem.x - g.x, gem.y - g.y);
    if (d < 45 + (g.range - 190) * 0.3) {
      gem.x += (g.x - gem.x) * Math.min(1, dt * 9);
      gem.y += (g.y - gem.y) * Math.min(1, dt * 9);
    }
    if (d < 10) {
      g.xp += gem.v;
      gem.v = 0;
    }
  }
  g.shots = g.shots.filter((s) => s.t > 0);
  g.enemies = g.enemies.filter((e) => !e.dead);
  g.traps = g.traps.filter((t) => t.t > 0);
  g.gems = g.gems.filter((e) => e.v);
  for (const e of g.effects) e.t -= dt;
  g.effects = g.effects.filter((e) => e.t > 0);
  if (g.hp <= 0 && state === "playing") finish(false);
  else if (g.xp >= g.need && state === "playing") {
    g.xp -= g.need;
    g.level++;
    g.need = Math.round(g.need * 1.22 + 3);
    levelUp();
  }
  updateHUD();
}
function ellipse(x, y, rx, ry, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
}
function render(dt) {
  ambient += dt;
  ctx.fillStyle = "#17231f";
  ctx.fillRect(0, 0, W, H);
  if (!world.ready) return;
  const menu = !g;
  world.begin(ctx, W, H, menu);
  if (g) {
    for (const gem of g.gems) {
      ctx.fillStyle = "#78cfdf";
      ctx.beginPath();
      ctx.moveTo(gem.x, gem.y - 4);
      ctx.lineTo(gem.x + 3, gem.y);
      ctx.lineTo(gem.x, gem.y + 4);
      ctx.lineTo(gem.x - 3, gem.y);
      ctx.fill();
    }
    for (const t of g.traps) {
      ctx.strokeStyle = "#9b4485aa";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeRect(t.x - 8, t.y - 8, 16, 16);
    }
    const actors = g.enemies.map((e) => ({
      y: e.y,
      draw(c) {
        world.actor(
          c,
          e.art,
          e.x,
          e.y,
          ambient + e.x * 0.01,
          true,
          e.facing,
          e.flash > 0 ? 0.55 : 1,
        );
        if (e.poison > 0) {
          c.strokeStyle = "#85b348";
          c.lineWidth = 1;
          c.beginPath();
          c.ellipse(e.x, e.y, e.r + 3, (e.r + 3) * 0.5, 0, 0, Math.PI * 2);
          c.stroke();
        }
      },
    }));
    actors.push({
      y: g.y,
      draw(c) {
        c.strokeStyle = "#f1ead1";
        c.lineWidth = 1;
        c.beginPath();
        c.ellipse(g.x, g.y, 12, 6, 0, 0, Math.PI * 2);
        c.stroke();
        world.actor(
          c,
          "40",
          g.x,
          g.y,
          ambient,
          g.moving,
          g.facing,
          g.inv > 0 && Math.sin(ambient * 45) > 0 ? 0.4 : 1,
        );
      },
    });
    world.objectsAndActors(ctx, actors, ambient);
    for (const s of g.shots) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(Math.atan2(s.vy, s.vx));
      ctx.fillStyle = "#f1f0d5";
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-5, -2);
      ctx.lineTo(-3, 0);
      ctx.lineTo(-5, 2);
      ctx.fill();
      ctx.restore();
    }
    for (const e of g.effects) {
      ctx.globalAlpha = Math.min(1, e.t * 2);
      ctx.strokeStyle = e.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * (1 - e.t) + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  } else {
    world.objectsAndActors(
      ctx,
      [
        {
          y: 250,
          draw(c) {
            world.actor(c, "40", 340, 350, ambient, false, "R");
          },
        },
        {
          y: 305,
          draw(c) {
            world.actor(c, "1016", 490, 305, ambient, false, "L");
          },
        },
        {
          y: 340,
          draw(c) {
            world.actor(c, "1212", 310, 340, ambient, false, "R");
          },
        },
      ],
      ambient,
    );
  }
  ctx.restore();
  if (g?.bossSpawned) {
    const b = g.enemies.find((e) => e.type === 4);
    if (b) {
      const w = Math.min(400, W * 0.5);
      ctx.fillStyle = "#101b19";
      ctx.fillRect((W - w) / 2, H - 85, w, 7);
      ctx.fillStyle = "#d2b96e";
      ctx.fillRect((W - w) / 2, H - 85, w * Math.max(0, b.hp / b.max), 7);
      ctx.fillStyle = "#e7ddba";
      ctx.textAlign = "center";
      ctx.font = "11px sans-serif";
      ctx.fillText("BOUFTOU ROYAL", W / 2, H - 94);
    }
  }
}
function frame(now) {
  const dt = Math.min((now - last) / 1000 || 0, 0.04);
  last = now;
  if (state === "playing") update(dt);
  render(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
