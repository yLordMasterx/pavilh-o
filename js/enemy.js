// A Enfermeira: modelo 3D procedural animado + inteligência (patrulha, audição, visão, perseguição, busca)
import * as THREE from 'three';
import { CELL, W, WAYPOINTS, center, toCell } from './map.js';
import { psx } from './render.js';
import { Audio } from './audio.js';

export function buildNurse(T) {
  const P = o => psx(new THREE.MeshPhongMaterial(o));
  const gown = P({ map: T.gown, side: THREE.DoubleSide, emissive: 0x140c0a, emissiveMap: T.gown, shininess: 4 });
  const skin = P({ map: T.skin, emissive: 0x161010, emissiveMap: T.skin, shininess: 8 });
  const face = P({ map: T.face, emissive: 0x1e1614, emissiveMap: T.face, shininess: 10 });
  const cap = P({ color: 0xb9b3a2, emissive: 0x141210, shininess: 4 });
  const red = P({ color: 0x7a1d16, emissive: 0x1a0504 });
  const mk = (geo, mat) => { const m = new THREE.Mesh(geo, mat); m.castShadow = true; return m; };

  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  // pernas finas
  const legs = [];
  for (const s of [-1, 1]) { const l = mk(new THREE.CylinderGeometry(.03, .035, .5, 6), skin); l.position.set(s * .08, .25, 0); body.add(l); legs.push(l); }
  // camisola
  const skirt = mk(new THREE.CylinderGeometry(.2, .36, 1.1, 10, 1, true), gown); skirt.position.y = .78; body.add(skirt);
  const torso = new THREE.Group(); torso.position.y = 1.3; body.add(torso);
  const chest = mk(new THREE.CylinderGeometry(.16, .2, .6, 10), gown); chest.position.y = .22; torso.add(chest);
  const shoulders = mk(new THREE.BoxGeometry(.46, .09, .2), gown); shoulders.position.y = .52; torso.add(shoulders);
  const neck = mk(new THREE.CylinderGeometry(.04, .05, .26, 6), skin); neck.position.y = .66; torso.add(neck);
  const head = new THREE.Group(); head.position.y = .86; torso.add(head);
  const skull = mk(new THREE.SphereGeometry(.15, 12, 10), face); skull.scale.set(.85, 1.22, .9); head.add(skull);
  const capM = mk(new THREE.BoxGeometry(.2, .07, .14), cap); capM.position.set(0, .17, -.01); capM.rotation.x = -.15; head.add(capM);
  const cross = mk(new THREE.BoxGeometry(.04, .045, .01), red); cross.position.set(0, .18, .06); head.add(cross);
  // braços longos com cotovelo
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * .24, .5, 0); torso.add(sh);
    const up = mk(new THREE.CylinderGeometry(.035, .03, .55, 6), gown); up.position.y = -.27; sh.add(up);
    const el = new THREE.Group(); el.position.y = -.55; sh.add(el);
    const fo = mk(new THREE.CylinderGeometry(.028, .022, .55, 6), skin); fo.position.y = -.27; el.add(fo);
    const hand = new THREE.Group(); hand.position.y = -.56; el.add(hand);
    hand.add(mk(new THREE.BoxGeometry(.06, .09, .03), skin));
    for (let f = 0; f < 4; f++) { const fi = mk(new THREE.BoxGeometry(.012, .17, .012), skin); fi.position.set(-.022 + f * .015, -.12 - (f === 1 || f === 2 ? .02 : 0), 0); fi.rotation.z = (f - 1.5) * .06; hand.add(fi); }
    arms.push({ sh, el, side: s });
  }
  root.userData = { body, torso, head, arms, legs, phase: 0, twitchT: 2, twitch: 0, headYaw: 0 };
  return root;
}

export function animateNurse(root, dt, speed, mode, time, frozen) {
  const u = root.userData;
  u.phase += dt * speed * 3.2;
  const walk = Math.min(1, speed / 2);
  const chase = mode === 'chase' || mode === 'kill';
  u.body.position.y = Math.abs(Math.sin(u.phase)) * .045 * walk;
  u.torso.rotation.x = chase ? .38 : .12 + Math.sin(time * .6) * .02;
  u.legs[0].rotation.x = Math.sin(u.phase) * .5 * walk; u.legs[1].rotation.x = -Math.sin(u.phase) * .5 * walk;
  for (const a of u.arms) {
    if (chase) { a.sh.rotation.x = -1.25 + Math.sin(u.phase * 1.3 + a.side) * .12; a.el.rotation.x = -.25; a.sh.rotation.z = a.side * .12; }
    else { a.sh.rotation.x = .08 + Math.sin(u.phase + (a.side > 0 ? 0 : Math.PI)) * .22 * walk; a.el.rotation.x = -.15 - Math.sin(time * .9 + a.side) * .05; a.sh.rotation.z = a.side * .05; }
  }
  // cabeça inclinada com espasmos
  u.twitchT -= dt;
  if (u.twitchT <= 0) { u.twitch = (Math.random() - .5) * 1.2; u.twitchT = .8 + Math.random() * 3.5; }
  u.twitch *= Math.pow(.02, dt);
  u.head.rotation.z = .42 + Math.sin(time * .7) * .05 + u.twitch * .5;
  u.head.rotation.y = u.headYaw + u.twitch;
  u.head.rotation.x = chase ? -.35 : .1;
  if (frozen) { root.rotation.z = (Math.random() - .5) * .05; u.head.rotation.z += (Math.random() - .5) * .3; }
  else root.rotation.z = 0;
}

export class Enemy {
  constructor(world, model) {
    this.w = world; this.nav = world.nav; this.model = model;
    this.reset();
  }
  reset() {
    this.state = 'inactive'; this.x = 0; this.z = 0; this.heading = 0;
    this.path = null; this.repathT = 0; this.target = null; this.waitT = 0;
    this.alertPos = null; this.searchT = 0; this.lastSeenT = -99; this.seenAt = { x: 0, z: 0 };
    this.stepT = 0; this.speedNow = 0; this.frozen = false; this.unseenT = 0; this.stuckT = 0; this.lastX = 0; this.lastZ = 0;
    this.locker = null; this.doorWait = 0; this.breathT = 0; this.d = 99; this.sees = false; this.killed = false;
    this.model.visible = false;
  }
  spawn(cx, cz, state = 'patrol') {
    this.x = center(cx); this.z = center(cz); this.state = state; this.model.visible = true; this.path = null; this.repathT = 0;
  }
  get active() { return this.state !== 'inactive'; }

  canSee(p, lightOn, playerLit) {
    if (p.hidden) return false;
    const dx = p.x - this.x, dz = p.z - this.z, d = Math.hypot(dx, dz);
    let range = lightOn ? 20 : playerLit ? 13 : 8;
    if (p.crouch) range *= .65;
    if (d > range) return false;
    if (d > 2.2) {
      const hx = Math.sin(this.heading), hz = Math.cos(this.heading);
      if ((dx * hx + dz * hz) / (d || 1) < Math.cos(65 * Math.PI / 180)) return false;
    }
    return this.nav.lineOfSight(this.x, this.z, p.x, p.z);
  }
  hear(noise) {
    if (!this.active || this.state === 'chase' || this.state === 'kill' || this.state === 'checkLocker') return;
    if (Math.hypot(noise.x - this.x, noise.z - this.z) > noise.r) return;
    this.state = 'investigate'; this.alertPos = { x: noise.x, z: noise.z }; this.path = null; this.repathT = 0; this.waitT = 0;
  }
  checkLocker(locker) {
    if (!this.active || this.state === 'kill') return;
    this.state = 'checkLocker'; this.locker = locker; this.path = null; this.repathT = 0; this.waitT = 0;
  }

  pickWaypoint(px, pz) {
    // prefere pontos perto do jogador para manter a pressão
    const opts = WAYPOINTS.filter(([x, z]) => this.nav.walkableForEnemy(x, z));
    opts.sort((a, b) => (Math.hypot(center(a[0]) - px, center(a[1]) - pz) + Math.random() * 18) - (Math.hypot(center(b[0]) - px, center(b[1]) - pz) + Math.random() * 18));
    return opts[0] || [toCell(this.x), toCell(this.z)];
  }

  teleportBehind(p) {
    const pc = [toCell(p.x), toCell(p.z)];
    const dist = this.nav.distances(pc[0], pc[1]);
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw), opts = [];
    for (let i = 0; i < dist.length; i++) {
      const v = dist[i]; if (v < 4 || v > 7) continue;
      const x = i % W, z = (i / W) | 0, wx = center(x), wz = center(z);
      if ((wx - p.x) * fx + (wz - p.z) * fz < -1 && !this.nav.lineOfSight(p.x, p.z, wx, wz)) opts.push([x, z]);
    }
    if (!opts.length) return false;
    const c = opts[Math.floor(Math.random() * opts.length)];
    this.x = center(c[0]); this.z = center(c[1]); this.state = 'investigate'; this.alertPos = { x: p.x, z: p.z }; this.path = null; this.repathT = 0; this.unseenT = 0;
    return true;
  }

  // retorna eventos para o jogo: 'spotted', 'kill', 'lockerOpened'
  update(dt, ctx) {
    const ev = [];
    if (!this.active) { this.model.visible = false; return ev; }
    const p = ctx.player;
    const dx = p.x - this.x, dz = p.z - this.z; this.d = Math.hypot(dx, dz);
    this.frozen = ctx.lit && this.state !== 'kill' && this.state !== 'checkLocker';

    // visão
    const sees = this.canSee(p, ctx.lightOn, ctx.playerLit);
    if (sees) {
      if (this.state !== 'chase' && this.state !== 'kill' && this.state !== 'checkLocker') ev.push('spotted');
      if (this.state !== 'kill' && this.state !== 'checkLocker') this.state = 'chase';
      this.lastSeenT = ctx.time; this.seenAt = { x: p.x, z: p.z };
    }
    this.sees = sees;
    if (sees || (ctx.seenByPlayer)) this.unseenT = 0; else this.unseenT += dt;
    if (ctx.power && this.state !== 'kill' && this.state !== 'checkLocker' && !p.hidden) { this.state = 'chase'; this.seenAt = { x: p.x, z: p.z }; this.lastSeenT = ctx.time; }

    // aparece pelas costas se ficar muito tempo sumida
    if ((this.state === 'patrol') && this.unseenT > 48 && this.d > 16 && !p.hidden) { if (!this.teleportBehind(p)) this.unseenT = 30; }

    // escolhe destino
    let goal = null, speed = 1.25;
    const mc = [toCell(this.x), toCell(this.z)];
    switch (this.state) {
      case 'patrol':
        if (!this.target || (mc[0] === this.target[0] && mc[1] === this.target[1])) {
          if (this.target && this.waitT <= 0) this.waitT = 1.5 + Math.random() * 2;
          if (this.waitT > 0) { this.waitT -= dt; if (this.waitT <= 0) { this.target = this.pickWaypoint(p.x, p.z); this.path = null; } }
          else if (!this.target) this.target = this.pickWaypoint(p.x, p.z);
        }
        goal = this.target; speed = 1.25; break;
      case 'investigate':
        goal = [toCell(this.alertPos.x), toCell(this.alertPos.z)]; speed = 2.1;
        if (mc[0] === goal[0] && mc[1] === goal[1]) { this.state = 'search'; this.searchT = 7; this.target = null; }
        break;
      case 'chase':
        speed = (ctx.power ? 3.9 : 3.25 + ctx.fuses * .12);
        if (!sees && ctx.time - this.lastSeenT > .6) {
          goal = [toCell(this.seenAt.x), toCell(this.seenAt.z)];
          if (mc[0] === goal[0] && mc[1] === goal[1]) { this.state = 'search'; this.searchT = 9; this.target = null; }
        } else goal = [toCell(p.x), toCell(p.z)];
        break;
      case 'search':
        this.searchT -= dt; speed = 1.7;
        if (!this.target || (mc[0] === this.target[0] && mc[1] === this.target[1])) {
          const sx = toCell(this.seenAt.x), sz = toCell(this.seenAt.z);
          for (let k = 0; k < 20; k++) { const tx = sx + Math.floor(Math.random() * 7) - 3, tz = sz + Math.floor(Math.random() * 7) - 3; if (this.nav.walkableForEnemy(tx, tz)) { this.target = [tx, tz]; this.path = null; break; } }
        }
        goal = this.target;
        if (this.searchT <= 0) { this.state = 'patrol'; this.target = null; }
        break;
      case 'checkLocker': {
        const L = this.locker; const fxp = L.x + L.fx * .9, fzp = L.z + L.fz * .9;
        goal = [toCell(fxp), toCell(fzp)]; speed = 2.4;
        if (Math.hypot(fxp - this.x, fzp - this.z) < .7) {
          speed = 0; this.waitT += dt;
          this.heading = Math.atan2(L.x - this.x, L.z - this.z);
          if (this.waitT > .5 && L.doorTarget === 0) { L.doorTarget = 1.9; Audio.locker(1); ev.push('lockerOpened'); if (p.hidden && p.locker === L) { this.state = 'kill'; ev.push('kill'); } }
          if (this.waitT > 2.2) { L.doorTarget = 0; this.state = 'search'; this.searchT = 6; this.seenAt = { x: L.x, z: L.z }; this.target = null; this.waitT = 0; }
        }
        break;
      }
      case 'kill': speed = 0; break;
    }

    // portas no caminho
    if (this.doorWait > 0) { this.doorWait -= dt; speed = 0; }
    if (this.frozen) speed = 0;

    // caminho
    this.repathT -= dt;
    if (goal && speed > 0 && (this.repathT <= 0 || !this.path)) {
      this.path = this.nav.walkableForEnemy(mc[0], mc[1]) ? this.nav.path(mc[0], mc[1], goal[0], goal[1]) : null;
      this.repathT = this.state === 'chase' ? .3 : .9;
      if (!this.path && this.state !== 'chase') { this.target = null; }
    }
    let tx = null, tz = null;
    if (this.state === 'chase' && sees && this.d < CELL * 1.6) { tx = p.x; tz = p.z; }
    else if (this.path && this.path.length > 1) {
      const [nx, nz] = this.path[1];
      const door = this.nav.door(nx, nz);
      if (door && !door.open && !door.locked && this.doorWait <= 0) {
        this.w.openDoor(door, this.x, this.z); this.doorWait = .55;
        ev.push({ type: 'door', x: door.cx, z: door.cz });
      }
      tx = center(nx); tz = center(nz);
    } else if (goal && this.path && this.path.length === 1) { tx = center(goal[0]); tz = center(goal[1]); }
    else if (!this.nav.walkableForEnemy(mc[0], mc[1])) { tx = p.x; tz = p.z; }

    this.speedNow = 0;
    if (tx !== null && speed > 0) {
      const vx = tx - this.x, vz = tz - this.z, vl = Math.hypot(vx, vz);
      if (vl > .02) {
        const s = Math.min(vl, speed * dt);
        this.x += vx / vl * s; this.z += vz / vl * s; this.speedNow = speed;
        const want = Math.atan2(vx, vz);
        let dh = want - this.heading; while (dh > Math.PI) dh -= Math.PI * 2; while (dh < -Math.PI) dh += Math.PI * 2;
        this.heading += dh * Math.min(1, dt * 7);
      }
      if (vl < .15 && this.path && this.path.length > 1) this.path.shift();
      // passos
      this.stepT += dt * speed;
      if (this.stepT > 1.3) { this.stepT = 0; ev.push({ type: 'step' }); }
    }
    // travada?
    if (this.speedNow > 0 && Math.hypot(this.x - this.lastX, this.z - this.lastZ) < .002) { this.stuckT += dt; if (this.stuckT > 2.5) { this.stuckT = 0; this.path = null; this.target = null; if (this.state === 'investigate') { this.state = 'search'; this.searchT = 4; } } }
    else this.stuckT = 0;
    this.lastX = this.x; this.lastZ = this.z;

    // olhar ao redor quando parada
    const u = this.model.userData;
    u.headYaw = (this.state === 'search' || (this.state === 'patrol' && this.waitT > 0)) ? Math.sin(ctx.time * 1.1) * .9 : 0;

    // pegou
    if (this.state !== 'kill' && !p.hidden && this.d < .9 && !this.frozen) { this.state = 'kill'; ev.push('kill'); }

    this.model.position.set(this.x, 0, this.z);
    this.model.rotation.y = this.state === 'kill' ? Math.atan2(dx, dz) : this.heading;
    animateNurse(this.model, dt, this.speedNow, this.state, ctx.time, this.frozen);
    this.model.visible = true;
    return ev;
  }
}
