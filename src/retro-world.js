/* Original 1.29.1 map geometry and artwork; asset sources are in docs/retro-assets.md. */
window.RetroWorld = (() => {
  const data = window.RETRO_DATA,
    tiles = {},
    sprites = {},
    walkable = data.cells.filter((c) => c.active && c.move > 1),
    byId = new Map(walkable.map((c) => [c.id, c]));
  const neighbors = new Map(
    walkable.map((c) => [
      c.id,
      walkable
        .filter(
          (n) =>
            n.id !== c.id &&
            Math.abs(n.x - c.x) <= 27 &&
            Math.abs(n.y - c.y) <= 14,
        )
        .map((n) => n.id),
    ]),
  );
  const buckets = new Map();
  for (const c of data.cells) {
    const key = Math.floor(c.x / 53) + "," + Math.floor(c.y / 27);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(c);
  }
  let ready = false,
    flow = new Map(),
    lastCell = -1,
    fieldTime = 0;
  function texture(meta) {
    return {
      ...meta,
      images: meta.frames.map((src) => {
        const image = new Image();
        image.src = src;
        return image;
      }),
    };
  }
  for (const [name, meta] of Object.entries(data.tiles))
    tiles[name] = texture(meta);
  for (const [id, animations] of Object.entries(data.sprites)) {
    sprites[id] = {};
    for (const [name, meta] of Object.entries(animations))
      sprites[id][name] = texture(meta);
  }
  const images = [
    ...Object.values(tiles),
    ...Object.values(sprites).flatMap(Object.values),
  ].flatMap((t) => t.images);
  const loaded = Promise.all(images.map((im) => im.decode())).then(() => {
    ready = true;
    buildFloor();
  });
  function nearest(x, y, candidates = walkable) {
    let best = null,
      d = Infinity;
    for (const c of candidates) {
      const v = Math.abs(x - c.x) / 26.5 + Math.abs(y - c.y) / 13.5;
      if (v < d) {
        best = c;
        d = v;
      }
    }
    return best;
  }
  const spawn = nearest(340, 350),
    reachable = new Set([spawn.id]),
    queue = [spawn.id];
  for (let i = 0; i < queue.length; i++)
    for (const n of neighbors.get(queue[i]))
      if (!reachable.has(n)) {
        reachable.add(n);
        queue.push(n);
      }
  const arena = walkable.filter((c) => reachable.has(c.id));
  function contains(x, y) {
    const candidates = [];
    for (let bx = Math.floor(x / 53) - 1; bx <= Math.floor(x / 53) + 1; bx++)
      for (let by = Math.floor(y / 27) - 1; by <= Math.floor(y / 27) + 1; by++)
        candidates.push(...(buckets.get(bx + "," + by) || []));
    const c = nearest(x, y, candidates);
    return (
      c &&
      c.active &&
      c.move > 1 &&
      reachable.has(c.id) &&
      Math.abs(c.x - x) / 26.5 + Math.abs(c.y - y) / 13.5 <= 1.02
    );
  }
  function move(actor, dx, dy) {
    if (contains(actor.x + dx, actor.y + dy)) {
      actor.x += dx;
      actor.y += dy;
      return;
    }
    if (contains(actor.x + dx, actor.y)) actor.x += dx;
    if (contains(actor.x, actor.y + dy)) actor.y += dy;
  }
  function field(x, y, dt) {
    fieldTime -= dt;
    const c = nearest(x, y, arena);
    if (c.id === lastCell && fieldTime > 0) return;
    lastCell = c.id;
    fieldTime = 0.3;
    flow = new Map([[c.id, 0]]);
    const q = [c.id];
    for (let i = 0; i < q.length; i++)
      for (const n of neighbors.get(q[i]))
        if (!flow.has(n)) {
          flow.set(n, flow.get(q[i]) + 1);
          q.push(n);
        }
  }
  function chase(e, x, y, dt) {
    const candidates =
      e.cell !== undefined
        ? [byId.get(e.cell), ...neighbors.get(e.cell).map((n) => byId.get(n))]
        : arena;
    const cell = nearest(e.x, e.y, candidates);
    e.cell = cell.id;
    let target = { x, y };
    if (cell.id !== lastCell) {
      let id = cell.id;
      for (const n of neighbors.get(cell.id))
        if ((flow.get(n) ?? Infinity) < (flow.get(id) ?? Infinity)) id = n;
      target = byId.get(id);
    }
    const dx = target.x - e.x,
      dy = target.y - e.y,
      d = Math.hypot(dx, dy);
    if (d > 0.1) {
      const speed = Math.min(d, e.s * dt);
      e.facing = dx < 0 ? "L" : "R";
      move(e, (dx / d) * speed, (dy / d) * speed);
    }
  }
  function spawnPoint(x, y) {
    const distant = arena.filter((c) => Math.hypot(c.x - x, c.y - y) > 180);
    const boundary = distant.filter((c) => neighbors.get(c.id).length < 4);
    const pool = boundary.length ? boundary : distant.length ? distant : arena;
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function drawTile(ctx, name, x, y, rot = 0, flip = false, isGround = false) {
    const t = tiles[name];
    if (!t) return;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rot * Math.PI) / 2);
    ctx.scale(
      (flip ? -1 : 1) * (isGround && rot % 2 ? 0.5185 : 1),
      isGround && rot % 2 ? 1.9286 : 1,
    );
    ctx.drawImage(t.images[0], t.x, t.y);
    ctx.restore();
  }
  const floor = document.createElement("canvas");
  floor.width = data.width;
  floor.height = data.height;
  function buildFloor() {
    const ctx = floor.getContext("2d");
    drawTile(ctx, "g" + data.background, 0, 0);
    for (const c of data.cells)
      if (c.active && c.ground)
        drawTile(ctx, "g" + c.ground, c.x, c.y, c.grot, c.gflip, true);
    for (const c of data.cells)
      if (c.active && c.o1) drawTile(ctx, "o" + c.o1, c.x, c.y, c.r1, c.f1);
  }
  const foreground = data.cells
    .filter((c) => c.active && c.o2)
    .map((c) => ({ y: c.y, cell: c }));
  function actor(ctx, id, x, y, time, moving, direction = "R", opacity = 1) {
    const animations = sprites[id];
    if (!animations) return;
    let dir = direction;
    if (!animations["static" + dir]) dir = direction === "L" ? "L" : "R";
    const t =
      animations[(moving ? "run" : "static") + dir] ||
      animations["walk" + dir] ||
      animations["static" + dir] ||
      Object.values(animations)[0];
    const image =
      t.images[moving ? Math.floor(time * 18) % t.images.length : 0];
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(image, x + t.x, y + t.y);
    ctx.restore();
  }
  function view(w, h, menu = false) {
    if (menu) {
      const scale = Math.max(w / data.width, h / data.height);
      return {
        x: (w - data.width * scale) / 2,
        y: (h - data.height * scale) / 2,
        scale,
      };
    }
    const scale = Math.max(
      0.2,
      Math.min((w - 60) / data.width, (h - 235) / data.height),
    );
    return { x: (w - data.width * scale) / 2, y: 185, scale };
  }
  function begin(ctx, w, h, menu = false) {
    if (!ready) return null;
    const v = view(w, h, menu);
    ctx.save();
    ctx.translate(v.x, v.y);
    ctx.scale(v.scale, v.scale);
    ctx.beginPath();
    ctx.rect(0, 0, data.width, data.height);
    ctx.clip();
    ctx.drawImage(floor, 0, 0);
    return v;
  }
  function objectsAndActors(ctx, actors, time) {
    const entries = [...foreground, ...actors].sort((a, b) => a.y - b.y);
    for (const entry of entries) {
      if (entry.cell) {
        const c = entry.cell;
        drawTile(ctx, "o" + c.o2, c.x, c.y, 0, c.f2);
      } else entry.draw(ctx, time);
    }
  }
  return {
    data,
    loaded,
    get ready() {
      return ready;
    },
    spawn,
    arena,
    nearest,
    contains,
    move,
    field,
    chase,
    spawnPoint,
    actor,
    begin,
    objectsAndActors,
    view,
  };
})();
