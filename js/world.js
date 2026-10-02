// Monta o pavilhão em 3D a partir do mapa
import * as THREE from 'three';
import { MAP, W, H, CELL, WALL_H, ROOMS, ENTITIES, DOOR_KEYS, cellChar, isDoorChar, center } from './map.js';
import { Nav, wallSide, doorAxis } from './nav.js';
import { psx } from './render.js';
import { makeProps } from './props.js';
import { writingTex } from './textures.js';

const WALL_BY_ROOM = { recepcao: 'paint', enfA: 'paint', posto: 'paint', refeitorio: 'tile', corredor: 'paint', banheiro: 'tile', enfB: 'paint', tratamento: 'tile', maquinas: 'concrete' };
const FLOOR_BY_ROOM = { recepcao: 'lino', enfA: 'lino', posto: 'lino', refeitorio: 'tile', corredor: 'lino', banheiro: 'tile', enfB: 'lino', tratamento: 'tile', maquinas: 'concrete' };
const DOOR_LEAF_W = 1.3, DOOR_H = 2.3, JAMB = (CELL - DOOR_LEAF_W) / 2;

export const WRITINGS = [
  { text: 'LEITO 31',            x: 8,  z: 9,  dir: [0, 1],  stage: 0 },
  { text: '31',                  x: 17, z: 15, dir: [-1, 0], stage: 0 },
  { text: 'NÃO CORRA',           x: 11, z: 11, dir: [0, -1], stage: 1 },
  { text: 'ELA VÊ A LUZ',        x: 5,  z: 6,  dir: [1, 0],  stage: 1 },
  { text: 'DEVOLVA',             x: 21, z: 2,  dir: [1, 0],  stage: 1 },
  { text: 'ELA ESTÁ ATRÁS',      x: 7,  z: 21, dir: [1, 0],  stage: 2 },
  { text: 'NÃO OLHE PARA TRÁS',  x: 24, z: 11, dir: [0, 1],  stage: 2 },
  { text: 'FIQUE',               x: 29, z: 22, dir: [1, 0],  stage: 4 }
];

export function roomOf(x, z) {
  for (const r of ROOMS) if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) return r.id;
  return 'corredor';
}

function makeMaterials(T) {
  const P = (o) => psx(new THREE.MeshPhongMaterial(o));
  return {
    wall: { paint: P({ map: T.wallPaint, shininess: 5, specular: 0x111111 }), tile: P({ map: T.wallTile, shininess: 40, specular: 0x333333 }), concrete: P({ map: T.wallConcrete, shininess: 3, specular: 0x050505 }) },
    floor: { lino: P({ map: T.floorLino, shininess: 40, specular: 0x333333 }), tile: P({ map: T.floorTile, shininess: 50, specular: 0x3a3a3a }), concrete: P({ map: T.floorConcrete, shininess: 10, specular: 0x151515 }) },
    ceil: { panels: P({ map: T.ceilPanels, shininess: 2, specular: 0x050505 }), concrete: P({ map: T.ceilConcrete, shininess: 2, specular: 0x050505 }) },
    door: P({ map: T.door, shininess: 30, specular: 0x333333 }),
    bigDoor: P({ map: T.bigDoor, shininess: 10 }),
    locker: P({ map: T.locker, shininess: 40, specular: 0x333333 }),
    metal: P({ map: T.metal, shininess: 60, specular: 0x444444 }),
    metalDark: P({ map: T.metalDark, shininess: 40, specular: 0x333333 }),
    metalGreen: P({ color: 0x4f5e58, shininess: 40, specular: 0x333333 }),
    rust: P({ map: T.rust, shininess: 15, specular: 0x222222 }),
    wood: P({ map: T.wood, shininess: 12, specular: 0x111111 }),
    mattress: P({ map: T.mattress, shininess: 2 }),
    sheet: P({ map: T.sheet, shininess: 2 }),
    leather: P({ map: T.leather, shininess: 20, specular: 0x222222 }),
    strap: P({ color: 0x3a2a1a, shininess: 10 }),
    porcelain: P({ color: 0xb8b8ae, shininess: 80, specular: 0x666666 }),
    mirror: P({ color: 0x1a1e20, shininess: 120, specular: 0x8a9aa0 }),
    paperPlain: P({ color: 0xbdb59c, shininess: 2 }),
    binder: P({ color: 0x3d4a5a, shininess: 10 }),
    deadPlant: P({ color: 0x3a3220, shininess: 2 }),
    dial: P({ color: 0x1d2420, emissive: 0x0a1a10, shininess: 60 }),
    cable: P({ color: 0x111111 }),
    slotEmpty: P({ color: 0x0b0b0b, shininess: 10 }),
    slotFull: P({ color: 0x9adfe0, emissive: 0x2a6a70, shininess: 80 }),
    redLamp: psx(new THREE.MeshBasicMaterial({ color: 0x551010 })),
    paper: P({ map: T.paper, emissive: 0x2a2620, emissiveMap: T.paper }),
    note: P({ map: T.note, emissive: 0x2a2620, emissiveMap: T.note }),
    board: P({ color: 0x4a3624, emissive: 0x120c06 }),
    battery: P({ color: 0xc06a1c, emissive: 0x8a4a0a, shininess: 60 }),
    batTop: P({ color: 0xb0b0a8, emissive: 0x202020, shininess: 80 }),
    brass: P({ color: 0xb08a3a, emissive: 0x3a2a08, shininess: 90, specular: 0x886622 }),
    tagRed: P({ color: 0x8a1e14, emissive: 0x2a0806 }),
    tagBlue: P({ color: 0x1e3a8a, emissive: 0x060c2a }),
    glass: P({ color: 0x9adfe0, emissive: 0x1f5a60, shininess: 100, specular: 0xffffff, transparent: true, opacity: .8 }),
    phone: P({ color: 0x151515, shininess: 70, specular: 0x444444 }),
    sign: psx(new THREE.MeshBasicMaterial({ map: T.sign, color: 0xff2a1a })),
    chain: P({ color: 0x55524a, shininess: 70, specular: 0x555555 })
  };
}

export function buildWorld(scene, T) {
  const M = makeMaterials(T);
  const props = makeProps(M);
  const nav = new Nav();
  const group = new THREE.Group(); scene.add(group);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1), yAxis = new THREE.Vector3(0, 1, 0);

  /* ---------- Pisos, tetos e paredes ---------- */
  const floorM = {}, ceilM = {}, wallM = {};
  const push = (obj, key, mat) => { (obj[key] = obj[key] || []).push(mat.clone()); };
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const c = cellChar(x, z);
    if (c !== '.' && !isDoorChar(c)) continue;
    const room = isDoorChar(c) ? 'corredor' : roomOf(x, z);
    m4.makeTranslation(center(x), 0, center(z)); push(floorM, FLOOR_BY_ROOM[room], m4);
    m4.makeTranslation(center(x), WALL_H, center(z)); push(ceilM, room === 'maquinas' ? 'concrete' : 'panels', m4);
    if (isDoorChar(c)) continue;
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = cellChar(x + dx, z + dz);
      if (n !== '#' && n !== 'F' && n !== 'E') continue;
      q.setFromAxisAngle(yAxis, Math.atan2(-dx, -dz));
      v3.set(center(x) + dx * CELL / 2, WALL_H / 2, center(z) + dz * CELL / 2);
      m4.compose(v3, q, one); push(wallM, WALL_BY_ROOM[room], m4);
    }
  }
  const floorGeo = new THREE.PlaneGeometry(CELL, CELL); floorGeo.rotateX(-Math.PI / 2);
  const ceilGeo = new THREE.PlaneGeometry(CELL, CELL); ceilGeo.rotateX(Math.PI / 2);
  const wallGeo = new THREE.PlaneGeometry(CELL, WALL_H);
  const inst = (geo, mat, list, recv) => { const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((mm, i) => im.setMatrixAt(i, mm)); im.receiveShadow = recv; group.add(im); return im; };
  for (const k in floorM) inst(floorGeo, M.floor[k], floorM[k], true);
  for (const k in ceilM) inst(ceilGeo, M.ceil[k], ceilM[k], false);
  for (const k in wallM) inst(wallGeo, M.wall[k], wallM[k], true);

  /* ---------- Portas ---------- */
  const doors = [];
  const roomLabel = id => ({ recepcao: 'RECEPÇÃO', enfA: 'ENFERMARIA A', posto: 'POSTO DE ENFERMAGEM', refeitorio: 'REFEITÓRIO', banheiro: 'SANITÁRIOS', enfB: 'ENFERMARIA B', tratamento: 'TRATAMENTO', maquinas: 'CASA DE MÁQUINAS' }[id] || '');
  const leafGeo = new THREE.BoxGeometry(DOOR_LEAF_W, DOOR_H - .02, .06);
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const c = cellChar(x, z); if (!isDoorChar(c)) continue;
    const axis = doorAxis(x, z), cx = center(x), cz = center(z);
    const wallMat = M.wall.paint;
    const g = new THREE.Group(); group.add(g);
    // batentes e verga
    if (axis === 'x') {
      for (const s of [-1, 1]) { const j = new THREE.Mesh(new THREE.BoxGeometry(JAMB, WALL_H, CELL), wallMat); j.position.set(cx + s * (CELL / 2 - JAMB / 2), WALL_H / 2, cz); j.receiveShadow = true; g.add(j); nav.obstacles.push({ x0: cx + s * (CELL / 2 - JAMB / 2) - JAMB / 2, x1: cx + s * (CELL / 2 - JAMB / 2) + JAMB / 2, z0: cz - CELL / 2, z1: cz + CELL / 2 }); }
      const l = new THREE.Mesh(new THREE.BoxGeometry(DOOR_LEAF_W, WALL_H - DOOR_H, CELL), wallMat); l.position.set(cx, DOOR_H + (WALL_H - DOOR_H) / 2, cz); g.add(l);
    } else {
      for (const s of [-1, 1]) { const j = new THREE.Mesh(new THREE.BoxGeometry(CELL, WALL_H, JAMB), wallMat); j.position.set(cx, WALL_H / 2, cz + s * (CELL / 2 - JAMB / 2)); j.receiveShadow = true; g.add(j); nav.obstacles.push({ x0: cx - CELL / 2, x1: cx + CELL / 2, z0: cz + s * (CELL / 2 - JAMB / 2) - JAMB / 2, z1: cz + s * (CELL / 2 - JAMB / 2) + JAMB / 2 }); }
      const l = new THREE.Mesh(new THREE.BoxGeometry(CELL, WALL_H - DOOR_H, DOOR_LEAF_W), wallMat); l.position.set(cx, DOOR_H + (WALL_H - DOOR_H) / 2, cz); g.add(l);
    }
    const pivot = new THREE.Group();
    const base = axis === 'x' ? 0 : -Math.PI / 2;
    if (axis === 'x') pivot.position.set(cx - DOOR_LEAF_W / 2, 0, cz); else pivot.position.set(cx, 0, cz - DOOR_LEAF_W / 2);
    pivot.rotation.y = base;
    const leaf = new THREE.Mesh(leafGeo, M.door); leaf.position.set(DOOR_LEAF_W / 2, DOOR_H / 2, 0); leaf.castShadow = true; leaf.receiveShadow = true; pivot.add(leaf);
    g.add(pivot);
    // placa da sala no lado do corredor
    let label = '';
    if (z === 10 || z === 12) {
      const roomZ = z === 10 ? z - 1 : z + 1, side = z === 10 ? 1 : -1;
      label = roomLabel(roomOf(x, roomZ));
      if (label) {
        const pm = psx(new THREE.MeshPhongMaterial({ map: T.plate(label), shininess: 10 }));
        const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.1, .28), pm); plate.userData.own = true;
        plate.position.set(cx, DOOR_H + .32, cz + side * (CELL / 2 + .01)); plate.rotation.y = side > 0 ? 0 : Math.PI; g.add(plate);
      }
    } else { label = roomLabel(roomOf(x - 1, z)) || roomLabel(roomOf(x + 1, z)); }
    const d = { id: 'd' + x + '_' + z, x, z, cx, cz, axis, pivot, base, angle: 0, target: 0, open: false, locked: c !== 'D', key: DOOR_KEYS[c] || null, label, busy: 0 };
    doors.push(d); nav.doors.set(x + ',' + z, d);
  }
  function openDoor(d, fromX, fromZ, instant) {
    if (d.axis === 'x') d.target = fromZ < d.cz ? -1.5 : 1.5;
    else d.target = fromX < d.cx ? 1.5 : -1.5;
    d.open = true; if (instant) d.angle = d.target;
  }
  function closeDoor(d) { d.target = 0; d.open = false; }

  /* ---------- Porta da frente e saída ---------- */
  const front = (() => {
    const g = new THREE.Group(); group.add(g);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.4), M.bigDoor); p.position.set(CELL + .02, 1.2, center(5)); p.rotation.y = Math.PI / 2; g.add(p);
    for (let i = 0; i < 9; i++) { const link = new THREE.Mesh(new THREE.TorusGeometry(.06, .015, 4, 8), M.chain); link.position.set(CELL + .08, 1.1 + Math.sin(i * .7) * .08, center(5) - .5 + i * .125); link.rotation.y = i % 2 ? Math.PI / 2 : 0; g.add(link); }
    const lock = new THREE.Mesh(new THREE.BoxGeometry(.06, .14, .1), M.brass); lock.position.set(CELL + .1, 1.0, center(5) + .05); g.add(lock);
    return { x: CELL + .3, z: center(5) };
  })();
  const exit = (() => {
    const ex = 30 * CELL - .02, ez = center(11);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(1.3, DOOR_H), M.door); p.position.set(ex, DOOR_H / 2, ez); p.rotation.y = -Math.PI / 2; group.add(p);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(.06, .08, 1.0), M.metal); bar.position.set(ex - .06, 1.05, ez); group.add(bar);
    const sm = M.sign; sm.color.setHex(0xff2a1a);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(.9, .34), sm); sign.position.set(ex - .01, 2.6, ez); sign.rotation.y = -Math.PI / 2; group.add(sign);
    const light = new THREE.PointLight(0xff2a1a, 1.1, 7, 2); light.position.set(ex - .6, 2.4, ez); group.add(light);
    return { x: ex - .3, z: ez, sign: sm, light };
  })();

  /* ---------- Móveis, armários e itens ---------- */
  const lockers = [], items = [], lamps = [];
  let fusebox = null, wheelchair = null;
  const GLOW = { battery: new THREE.SpriteMaterial({ map: T.glow, color: 0xffc95a, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }), key: new THREE.SpriteMaterial({ map: T.glow, color: 0xfff0c0, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: .5 }), fuse: new THREE.SpriteMaterial({ map: T.glow, color: 0x7fe8ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, opacity: .6 }) };
  const cellProp = {};
  const batteryMesh = () => {
    const g = new THREE.Group();
    const holder = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .2, 10), M.battery);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .03, 8), M.batTop); top.position.y = .115;
    holder.add(body); holder.add(top); holder.rotation.z = Math.PI / 2; holder.position.y = .07; g.add(holder);
    const s = new THREE.Sprite(GLOW.battery); s.scale.set(1.1, 1.1, 1); s.position.y = .1; g.add(s);
    return g;
  };
  const place = (built, e) => {
    const { group: obj, boxes, depth } = built;
    let rot = 0, px = center(e.x), pz = center(e.z);
    if (e.wall) {
      const [dx, dz] = wallSide(e.x, e.z);
      rot = Math.atan2(-dx, -dz);
      px += dx * (CELL / 2 - depth / 2 - .02); pz += dz * (CELL / 2 - depth / 2 - .02);
    } else if (e.rot) rot = e.rot * Math.PI / 180;
    obj.position.set(px, 0, pz); obj.rotation.y = rot; group.add(obj);
    cellProp[e.x + ',' + e.z] = { px, pz };
    const cs = Math.abs(Math.cos(rot)), sn = Math.abs(Math.sin(rot));
    for (const b of boxes) {
      const bx = px + b.x * Math.cos(rot) + b.z * Math.sin(rot), bz = pz - b.x * Math.sin(rot) + b.z * Math.cos(rot);
      const hw = (b.w * cs + b.d * sn) / 2, hd = (b.w * sn + b.d * cs) / 2;
      nav.obstacles.push({ x0: bx - hw, x1: bx + hw, z0: bz - hd, z1: bz + hd, prop: e.type });
    }
    return { px, pz, rot };
  };
  const itemBase = (e, mesh, extra) => {
    const cp = (e.y || 0) > .1 ? cellProp[e.x + ',' + e.z] : null;
    mesh.position.set((cp ? cp.px : center(e.x)) + (e.ox || 0), e.y || 0, (cp ? cp.pz : center(e.z)) + (e.oz || 0));
    group.add(mesh);
    const it = Object.assign({ id: e.id, type: e.type, mesh, x: mesh.position.x, z: mesh.position.z, y: mesh.position.y, taken: false }, extra || {});
    items.push(it); return it;
  };
  for (const e of ENTITIES) {
    switch (e.type) {
      case 'bed': case 'desk': case 'chairs': case 'plant': case 'shelf': case 'table': case 'sink': case 'stall': case 'gurney': case 'ectchair': case 'machine': case 'generator':
        place(props[e.type](), e); break;
      case 'wheelchair': { const b = props.wheelchair(); const p = place(b, Object.assign({ rot: 35 }, e)); wheelchair = { obj: b.group, box: nav.obstacles[nav.obstacles.length - 1], rolling: 0 }; break; }
      case 'locker': {
        const b = props.locker(); const p = place(b, e);
        const fx = Math.sin(p.rot), fz = Math.cos(p.rot);
        lockers.push({ id: e.id, x: p.px, z: p.pz, fx, fz, door: b.door, doorAngle: 0, doorTarget: 0, yaw: Math.atan2(-fx, -fz) });
        break;
      }
      case 'fusebox': {
        const b = props.fusebox(); const p = place(b, e);
        const fx = Math.sin(p.rot), fz = Math.cos(p.rot);
        fusebox = { x: p.px + fx * .3, z: p.pz + fz * .3, slots: b.slots, lever: b.lever, lamp: b.lamp, M };
        break;
      }
      case 'note': { const m = new THREE.Mesh(new THREE.BoxGeometry(.22, .005, .3), M.note); m.rotation.y = .4; itemBase(e, m); break; }
      case 'record': {
        const g = new THREE.Group();
        const f = new THREE.Mesh(new THREE.BoxGeometry(.28, .02, .36), [M.board, M.board, M.paper, M.board, M.board, M.board]); g.add(f);
        g.rotation.y = Math.random() * 6; itemBase(e, g); break;
      }
      case 'battery': itemBase(e, batteryMesh(), {}); break;
      case 'keyPosto': case 'keyMaq': {
        const g = new THREE.Group();
        const ring = new THREE.Mesh(new THREE.TorusGeometry(.035, .008, 5, 10), M.brass); ring.rotation.x = Math.PI / 2; g.add(ring);
        const shaft = new THREE.Mesh(new THREE.BoxGeometry(.012, .008, .09), M.brass); shaft.position.z = .075; g.add(shaft);
        const tag = new THREE.Mesh(new THREE.BoxGeometry(.06, .005, .09), e.type === 'keyPosto' ? M.tagBlue : M.tagRed); tag.position.set(.04, 0, -.05); tag.rotation.y = .4; g.add(tag);
        const s = new THREE.Sprite(GLOW.key); s.scale.set(.5, .5, 1); g.add(s);
        g.position.y = .01; itemBase(e, g); break;
      }
      case 'fuse': {
        const g = new THREE.Group();
        const glass = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .12, 8), M.glass); glass.rotation.z = Math.PI / 2; glass.position.y = .035; g.add(glass);
        for (const s of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(.034, .034, .03, 8), M.metal); cap.rotation.z = Math.PI / 2; cap.position.set(s * .07, .035, 0); g.add(cap); }
        const sp = new THREE.Sprite(GLOW.fuse); sp.scale.set(.7, .7, 1); sp.position.y = .05; g.add(sp);
        itemBase(e, g, { glow: sp, glowMat: GLOW.fuse }); break;
      }
      case 'phone': {
        const g = new THREE.Group();
        g.add(new THREE.Mesh(new THREE.BoxGeometry(.2, .08, .22), M.phone));
        const hs = new THREE.Mesh(new THREE.BoxGeometry(.24, .04, .06), M.phone); hs.position.set(0, .07, -.03); g.add(hs);
        const dial = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .01, 12), M.metal); dial.position.set(0, .045, .05); g.add(dial);
        g.rotation.y = -.3; itemBase(e, g, { handset: hs }); break;
      }
      case 'lamp': {
        const lx = center(e.x), lz = center(e.z);
        const L = new THREE.PointLight(0xd5efd8, 0, 11, 2); L.position.set(lx, WALL_H - .3, lz); group.add(L);
        const fm = psx(new THREE.MeshBasicMaterial({ color: 0x222622 }));
        const fx = new THREE.Mesh(new THREE.BoxGeometry(1.2, .06, .22), fm); fx.position.set(lx, WALL_H - .04, lz); group.add(fx);
        lamps.push({ light: L, mat: fm, mode: e.mode || 'flicker', t: Math.random() * 3, on: e.mode !== 'off', dead: false, deadT: 0, x: lx, z: lz, base: 1.4, color: 0xd5efd8, room: roomOf(e.x, e.z) });
        break;
      }
    }
  }

  /* ---------- Escritas nas paredes ---------- */
  const writings = [];
  const wGeo = new THREE.PlaneGeometry(1.9, .95);
  for (const w of WRITINGS) {
    const mat = psx(new THREE.MeshPhongMaterial({ map: writingTex(w.text), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, shininess: 25, specular: 0x220000 }));
    const m = new THREE.Mesh(wGeo, mat);
    const [dx, dz] = w.dir;
    m.position.set(center(w.x) + dx * (CELL / 2 - .015), 1.5 + (Math.random() - .5) * .3, center(w.z) + dz * (CELL / 2 - .015));
    m.rotation.y = Math.atan2(-dx, -dz); m.rotation.z = (Math.random() - .5) * .12;
    m.visible = false; group.add(m);
    writings.push({ mesh: m, stage: w.stage });
  }

  function update(dt) {
    for (const d of doors) {
      const k = Math.min(1, dt * 5);
      d.angle += (d.target - d.angle) * k;
      d.pivot.rotation.y = d.base + d.angle;
    }
    for (const l of lockers) {
      l.doorAngle += (l.doorTarget - l.doorAngle) * Math.min(1, dt * 8);
      l.door.rotation.y = -l.doorAngle;
    }
    if (wheelchair && wheelchair.rolling > 0) {
      wheelchair.rolling -= dt;
      const sp = Math.min(1, wheelchair.rolling) * 1.1 * dt;
      wheelchair.obj.position.x -= sp; wheelchair.obj.rotation.y += dt * .25;
      wheelchair.box.x0 -= sp; wheelchair.box.x1 -= sp;
    }
  }

  function spawnBattery(cx, cz) {
    return itemBase({ id: 'bx' + Math.random().toString(36).slice(2, 7), type: 'battery', x: cx, z: cz, y: .02 }, batteryMesh());
  }

  return { group, nav, M, GLOW, spawnBattery, doors, lockers, items, lamps, front, exit, fusebox, wheelchair, writings, openDoor, closeDoor, update };
}
