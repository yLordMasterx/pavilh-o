// Núcleo do jogo: junta mundo, jogador, inimiga, roteiro, áudio e interface
import * as THREE from 'three';
import { W as MAP_W, START, ENEMY_SPAWN, ZONES, center, toCell } from './map.js';
import { buildTextures } from './textures.js';
import { RetroRenderer } from './render.js';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import { Enemy, buildNurse, animateNurse } from './enemy.js';
import { Audio } from './audio.js';
import { NOTES, RECORD_IDS, objective, stage, ENDINGS, DEATH_TEXT } from './story.js';
import { UI } from './ui.js';

const SAVE_KEY = 'pavilhao9.save.v2';
const LAMP_COLOR = 0xd5efd8, EMERGENCY = 0xff3020;

function freshState() {
  return { time: 0, inv: { keyPosto: false, keyMaq: false }, unlocked: { keyPosto: false, keyMaq: false }, fuses: [], fusesIn: 0, power: false, active: false, taken: [], records: [], flags: { knowsExit: false }, triggers: {}, deaths: 0 };
}

export class Game {
  constructor(canvas, settings) {
    this.settings = settings;
    this.R = new RetroRenderer(canvas);
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030505, 0.075);
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 80);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    // luz base (~45%) para enxergar mesmo sem pilha
    this.scene.add(new THREE.AmbientLight(0x3a4642, 0.32));
    this.scene.add(new THREE.HemisphereLight(0x6d7c74, 0x1a1612, 0.42));
    this.flash = new THREE.SpotLight(0xffe6c0, 2.6, 24, 0.46, 0.5, 1.3);
    this.flash.position.set(0.18, -0.12, 0.05);
    this.flash.shadow.mapSize.set(512, 512); this.flash.shadow.camera.near = .2; this.flash.shadow.camera.far = 24; this.flash.shadow.bias = -0.002;
    this.camera.add(this.flash); this.flash.target.position.set(0.04, -0.06, -1); this.camera.add(this.flash.target);
    this.T = buildTextures();
    this.world = null; this.player = null; this.enemy = null;
    this.state = 'menu';
    this.fwd = new THREE.Vector3(); this.tmp = new THREE.Vector3();
    this.applySettings();
    this.resize(); addEventListener('resize', () => this.resize());
  }

  /* ---------- Configurações ---------- */
  applySettings() {
    const s = this.settings;
    this.R.setRetro(s.retro); this.R.uniforms.uBright.value = s.bright;
    this.R.setShadows(s.shadows); this.flash.castShadow = s.shadows;
    this.scene.traverse(o => { if (o.material) { (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.needsUpdate = true); } });
    Audio.setVolume(s.volume);
    this.resize();
  }
  resize() { this.R.resize(this.camera); }

  /* ---------- Construção ---------- */
  build() {
    if (this.world) {
      this.scene.remove(this.world.group);
      this.world.group.traverse(o => { if (o.geometry) o.geometry.dispose(); });
    }
    if (this.nurse) this.scene.remove(this.nurse);
    if (this.ghostModel) this.scene.remove(this.ghostModel);
    this.world = buildWorld(this.scene, this.T);
    this.player = new Player(this.world.nav);
    this.nurse = buildNurse(this.T); this.scene.add(this.nurse);
    this.enemy = new Enemy(this.world, this.nurse);
    this.ghostModel = buildNurse(this.T); this.ghostModel.visible = false; this.scene.add(this.ghostModel);
    this.ghost = { on: false, t: 0, next: 40, x: 0, z: 0, litT: 0, life: 5 };
    this.applySettings();
  }

  // mundo de fundo para o menu, sem mexer no save
  preview() {
    this.S = freshState(); this.build(); this.player.reset(START); this.resetRuntime();
    this.player.x += .3; this.player.yaw = Math.PI * .8;
  }
  newGame() {
    this.S = freshState();
    this.build();
    this.player.reset(START);
    this.resetRuntime();
    this.save();
  }
  resetRuntime() {
    this.blackout = 0; this.eventT = 14; this.pingT = 0; this.hbT = 0; this.lowHint = false; this.respawnT = 0;
    this.stingerAt = -99; this.glitch = 0; this.phone = null; this.scripts = []; this.lockedMsgT = 0; this.wasChasing = false;
    this.target = null; this.dyingT = 0; this.sirenT = 0;
    UI.resetObjective();
  }

  hasSave() { try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; } }
  save() {
    const p = this.player, data = {
      v: 2, S: this.S,
      p: { x: p.x, z: p.z, yaw: p.yaw, battery: Math.max(p.battery, 25), flashOn: p.flashOn },
      doors: this.world.doors.map(d => ({ id: d.id, open: d.open, locked: d.locked, target: d.target })),
      extraBatteries: this.world.items.filter(i => i.id && i.id.startsWith('bx') && !i.taken).map(i => [toCell(i.x), toCell(i.z), i.id])
    };
    this.checkpoint = data;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch (e) { }
  }
  load(data) {
    if (!data) { try { data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { data = null; } }
    if (!data || data.v !== 2) { this.newGame(); return; }
    this.S = JSON.parse(JSON.stringify(data.S));
    this.build(); this.resetRuntime();
    const W = this.world, p = this.player;
    p.reset(START); p.x = data.p.x; p.z = data.p.z; p.yaw = data.p.yaw; p.battery = data.p.battery; p.flashOn = data.p.flashOn && p.battery > 0;
    for (const ds of data.doors) { const d = W.doors.find(x => x.id === ds.id); if (!d) continue; d.locked = ds.locked; d.open = ds.open; d.target = ds.target; d.angle = ds.target; }
    for (const it of W.items) if (this.S.taken.includes(it.id)) { it.taken = true; it.mesh.visible = false; }
    (data.extraBatteries || []).forEach(([x, z]) => W.spawnBattery(x, z));
    for (let i = 0; i < this.S.fusesIn; i++) W.fusebox.slots[i].material = W.M.slotFull;
    if (this.S.power) this.applyPower(true);
    if (this.S.active) this.enemy.spawn(ENEMY_SPAWN.x, ENEMY_SPAWN.z, 'patrol');
    if (this.S.power) this.enemy.spawn(25, 11, 'chase');
    this.checkpoint = data;
  }
  retry() { this.load(this.checkpoint); }

  /* ---------- Utilidades ---------- */
  clockStr() { const mins = Math.floor(this.S.time / 5); const h = 3 + Math.floor(mins / 60), m = mins % 60; return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0'); }
  spatial(x, z, maxD = 24) {
    const p = this.player, dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz) || 1;
    const rx = Math.cos(p.yaw), rz = -Math.sin(p.yaw), fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    const los = this.world.nav.lineOfSight(p.x, p.z, x, z);
    return { d, pan: (dx * rx + dz * rz) / d, front: (dx * fx + dz * fz) / d, vol: Math.pow(Math.max(0, 1 - d / maxD), 2) * (los ? 1 : .55), los };
  }
  inBeam(x, z, maxD) {
    const p = this.player; if (!(p.flashOn && p.battery > 0)) return false;
    if (Math.hypot(x - p.x, z - p.z) > maxD) return false;
    if (!this.world.nav.lineOfSight(p.x, p.z, x, z)) return false;
    this.camera.getWorldDirection(this.fwd); this.tmp.set(x - this.camera.position.x, 1.5 - this.camera.position.y, z - this.camera.position.z).normalize();
    return this.fwd.dot(this.tmp) > Math.cos(.38);
  }
  inView(x, z) {
    this.camera.getWorldDirection(this.fwd); this.tmp.set(x - this.camera.position.x, 1.5 - this.camera.position.y, z - this.camera.position.z).normalize();
    return this.fwd.dot(this.tmp) > Math.cos(.8);
  }
  inZone(name) { const z = ZONES[name], cx = toCell(this.player.x), cz = toCell(this.player.z); return cx >= z.x0 && cx <= z.x1 && cz >= z.z0 && cz <= z.z1; }
  later(t, fn) { this.scripts.push({ t, fn }); }
  noise(x, z, r) { if (r > 0 && this.enemy.active) this.enemy.hear({ x, z, r }); }
  playerLit() {
    for (const l of this.world.lamps) if (l.on && Math.hypot(l.x - this.player.x, l.z - this.player.z) < 4.5) return true;
    return false;
  }

  /* ---------- Interações ---------- */
  findTarget() {
    const p = this.player, W = this.world, S = this.S;
    if (p.hidden) return { label: 'Sair do armário', act: () => this.leaveLocker() };
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    let best = null, bestScore = -1;
    const consider = (x, z, range, label, act, locked) => {
      const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz); if (d > range) return;
      const dot = d < .5 ? 1 : (dx * fx + dz * fz) / d; if (dot < .55) return;
      const score = dot * 2 - d / range; if (score > bestScore) { bestScore = score; best = { label, act, locked }; }
    };
    for (const d of W.doors) {
      if (d.locked) {
        const has = S.inv[d.key];
        consider(d.cx, d.cz, 1.9, has ? 'Destrancar' : 'Trancada', () => this.useDoor(d), !has);
      } else consider(d.cx, d.cz, 1.9, d.open ? 'Fechar porta' : 'Abrir porta', () => this.useDoor(d));
    }
    for (const L of W.lockers) consider(L.x + L.fx * .5, L.z + L.fz * .5, 1.5, 'Esconder no armário', () => this.enterLocker(L));
    for (const it of W.items) {
      if (it.taken) continue;
      const lab = { note: 'Ler bilhete', record: 'Pegar prontuário', battery: 'Pegar pilha', keyPosto: 'Pegar chave', keyMaq: 'Pegar chave', fuse: 'Pegar fusível', phone: this.phone && this.phone.ringing ? 'Atender' : 'Telefone' }[it.type];
      consider(it.x, it.z, it.type === 'phone' ? 1.7 : 1.6, lab, () => this.useItem(it));
    }
    consider(W.front.x, W.front.z, 1.6, 'Porta da frente', () => this.useFront());
    consider(W.exit.x, W.exit.z, 1.6, S.power ? 'Sair' : 'Saída de emergência', () => this.useExit());
    if (W.fusebox) {
      const lab = S.power ? 'Gerador ligado' : (S.fusesIn >= 3 ? 'Puxar a alavanca' : (S.fuses.length > S.fusesIn ? 'Colocar fusíveis' : 'Caixa de fusíveis'));
      consider(W.fusebox.x, W.fusebox.z, 1.6, lab, () => this.useFusebox());
    }
    return best;
  }
  interact() {
    if (this.state !== 'playing') return;
    if (UI.noteOpen()) { UI.closeNote(); return; }
    const t = this.findTarget(); if (t) t.act();
  }
  useDoor(d) {
    const p = this.player, S = this.S;
    const sp = this.spatial(d.cx, d.cz);
    if (d.locked) {
      if (S.inv[d.key]) {
        d.locked = false; S.unlocked[d.key] = true;
        // a mesma chave abre as duas portas do posto
        this.world.doors.forEach(o => { if (o.key === d.key) o.locked = false; });
        Audio.pickupKey(); Audio.thump(.3, 120, 0, sp.pan);
        this.world.openDoor(d, p.x, p.z); Audio.door(sp.pan);
        UI.msg('Você destrancou a porta.', 2200); this.noise(d.cx, d.cz, 6);
      } else {
        Audio.doorLocked(sp.pan);
        UI.msg(d.key === 'keyPosto' ? 'Trancada. A chave do posto ficou com a enfermeira Irene.' : 'Trancada. A chave da casa de máquinas está no posto de enfermagem.', 3200);
      }
      return;
    }
    if (d.open) {
      const pc = [toCell(p.x), toCell(p.z)], ec = [toCell(this.enemy.x), toCell(this.enemy.z)];
      if ((pc[0] === d.x && pc[1] === d.z) || (this.enemy.active && ec[0] === d.x && ec[1] === d.z)) return;
      this.world.closeDoor(d); Audio.door(sp.pan, .7); this.noise(d.cx, d.cz, 4);
    } else { this.world.openDoor(d, p.x, p.z); Audio.door(sp.pan); this.noise(d.cx, d.cz, 6); }
  }
  enterLocker(L) {
    const p = this.player, e = this.enemy;
    Audio.locker(.7); L.doorTarget = 1.2; setTimeout(() => { L.doorTarget = 0; }, 350);
    p.enterLocker(L, this.S.time); UI.hidden(true); UI.prompt(null);
    if (e.active && (e.sees || this.S.time - e.lastSeenT < 1.2)) e.checkLocker(L);
  }
  leaveLocker() {
    const p = this.player, L = p.locker; if (!L) return;
    if (this.enemy.state === 'checkLocker' && this.enemy.locker === L && this.enemy.d < 2.5) return;
    Audio.locker(.7); L.doorTarget = 1.2; setTimeout(() => { L.doorTarget = 0; }, 400);
    p.exitLocker(); UI.hidden(false); this.noise(p.x, p.z, 4);
  }
  takeItem(it) { it.taken = true; it.mesh.visible = false; if (it.id && !this.S.taken.includes(it.id)) this.S.taken.push(it.id); }
  useItem(it) {
    const S = this.S, p = this.player;
    switch (it.type) {
      case 'note': UI.note(NOTES[it.id]); Audio.click(); S.flags.knowsExit = true; this.takeItem(it); break;
      case 'record': {
        this.takeItem(it); S.records.push(it.id); Audio.chime();
        UI.note(NOTES[it.id], `Prontuário ${S.records.length} de ${RECORD_IDS.length}`);
        if (!S.active && S.records.length >= 2) this.activate();
        break;
      }
      case 'battery': this.takeItem(it); p.battery = Math.min(100, p.battery + 50); Audio.click(); UI.msg('Pilha nova. A luz volta a firmar.', 2200); break;
      case 'keyPosto':
        this.takeItem(it); S.inv.keyPosto = true; Audio.pickupKey(); UI.msg('Chave do posto de enfermagem. Uma etiqueta: "Irene".', 3200);
        if (!S.active) this.activate(); this.save(); break;
      case 'keyMaq': this.takeItem(it); S.inv.keyMaq = true; Audio.pickupKey(); UI.msg('Chave da casa de máquinas.', 2600); if (!S.active) this.activate(); this.save(); break;
      case 'fuse': {
        this.takeItem(it); S.fuses.push(it.id); Audio.pickupKey(); Audio.tone(880, .04, .4, 'sine');
        UI.msg(`Fusível ${S.fuses.length} de 3.`, 2400);
        if (!S.active) this.activate();
        if (S.fuses.length === 2) this.later(2.5, () => { this.blackout = 5; Audio.whisper(-this.spatial(p.x, p.z).pan || .6, .12); Audio.pop(0); });
        this.save(); break;
      }
      case 'phone': {
        if (this.phone && this.phone.ringing) {
          this.phone.ringing = false; this.phone.done = true; Audio.click(); Audio.voice(0);
          const lines = ['… você está no meu turno …', '… devolva os prontuários …', '… eu vejo a sua luz …'];
          lines.forEach((l, i) => this.later(.6 + i * 1.6, () => UI.subtitle(l, 1700)));
          this.later(5.5, () => { if (this.enemy.active) { this.enemy.hear({ x: p.x, z: p.z, r: 999 }); UI.msg('Passos no corredor. Vindo para cá.', 2800); } });
        } else { Audio.click(); UI.msg('A linha está muda.', 1800); }
        break;
      }
    }
  }
  useFront() { Audio.doorLocked(0); UI.msg('Acorrentada por fora. A saída de emergência fica no fim do corredor.', 3400); this.S.flags.knowsExit = true; }
  useExit() {
    if (this.S.power) { this.win(); return; }
    Audio.doorLocked(0); this.S.flags.knowsExit = true;
    UI.msg('A trava eletrônica não tem energia. O gerador fica na casa de máquinas.', 3600);
  }
  useFusebox() {
    const S = this.S, fb = this.world.fusebox;
    if (S.power) { UI.msg('O gerador está ligado. Corra.', 1800); return; }
    if (S.fuses.length > S.fusesIn) {
      while (S.fusesIn < S.fuses.length) { fb.slots[S.fusesIn].material = this.world.M.slotFull; S.fusesIn++; }
      Audio.click(); Audio.tone(660, .04, .3, 'square');
      UI.msg(S.fusesIn >= 3 ? 'Os três fusíveis estão no lugar. Puxe a alavanca.' : `Fusíveis encaixados: ${S.fusesIn} de 3.`, 2600);
      this.save(); return;
    }
    if (S.fusesIn >= 3) { this.powerOn(); return; }
    UI.msg(`Faltam fusíveis: ${S.fusesIn} de 3 no lugar.`, 2400);
  }

  /* ---------- Roteiro ---------- */
  activate() {
    if (this.S.active) return;
    this.S.active = true;
    this.blackout = 3.2; Audio.pop(.3);
    this.later(.8, () => Audio.distantScream());
    this.later(2.4, () => { Audio.slam(.55, (Math.random() - .5) * 1.4); UI.msg('Uma porta bateu em algum lugar do pavilhão. Você não está sozinho.', 3600); });
    this.later(3.6, () => { this.enemy.spawn(ENEMY_SPAWN.x, ENEMY_SPAWN.z, 'patrol'); });
  }
  applyPower(silent) {
    const W = this.world;
    W.lamps.forEach(l => { l.color = EMERGENCY; l.light.color.setHex(EMERGENCY); l.base = 1.2; l.dead = false; if (l.mode === 'off') { l.mode = 'flicker'; l.on = true; l.color = LAMP_COLOR; l.light.color.setHex(LAMP_COLOR); l.base = 1.5; } });
    W.exit.sign.color.setHex(0x3dff7a); W.exit.light.color.setHex(0x3dff7a);
    W.fusebox.lever.rotation.x = -.9; W.fusebox.lamp.material = new THREE.MeshBasicMaterial({ color: 0x3dff7a });
    Audio.setGenerator(.05);
    if (!silent) { Audio.setSiren(.035); this.sirenT = 9; }
  }
  powerOn() {
    const S = this.S; S.power = true;
    Audio.power(); Audio.unlock(); this.blackout = 1.2; this.glitch = .8;
    this.applyPower(false);
    UI.msg('O gerador ligou. A trava da saída abriu. Ela sabe. Corra.', 4200);
    this.later(1.5, () => { this.enemy.spawn(25, 11, 'chase'); Audio.stinger(1); });
    this.save();
  }
  zones(dt) {
    const S = this.S, T = S.triggers, p = this.player;
    if (!T.intro) { T.intro = 1; this.later(1.2, () => UI.msg('03h00. Trancaram a porta por fora. Tem um bilhete no balcão da recepção.', 4800)); }
    if (!T.enfA && this.inZone('enfA')) { T.enfA = 1; if (this.world.wheelchair) { this.later(1.5, () => { this.world.wheelchair.rolling = 2.6; const sp = this.spatial(this.world.wheelchair.obj.position.x, this.world.wheelchair.obj.position.z); Audio.creak(sp.pan, .05, 120, 95, 2.4); }); } }
    if (!T.posto && this.inZone('posto')) { T.posto = 1; this.phone = { ringing: false, rings: 0, t: 4, done: false }; }
    if (!T.refeit && this.inZone('refeitorio') && !S.active) { T.refeit = 1; this.apparition(center(28), center(8), 6); }
    if (!T.trat && this.inZone('tratamento')) { T.trat = 1; this.later(2, () => { Audio.whisper(.7, .11); UI.subtitle('… você não deveria estar aqui …', 2200); }); }
    if (!T.leste && S.power && this.inZone('corredorLeste')) { T.leste = 1; }
    // telefone tocando
    if (this.phone && !this.phone.done) {
      this.phone.t -= dt;
      if (this.phone.t <= 0) {
        if (this.phone.rings >= 5) { this.phone.done = true; this.phone.ringing = false; }
        else { this.phone.ringing = true; this.phone.rings++; this.phone.t = 4; const ph = this.world.items.find(i => i.type === 'phone'); if (ph) { const sp = this.spatial(ph.x, ph.z, 30); Audio.phoneRing(); ph.handset.position.y = .07 + .01; setTimeout(() => ph.handset.position.y = .07, 900); } }
      }
    }
  }
  apparition(x, z, life) {
    const G = this.ghost; G.on = true; G.x = x; G.z = z; G.t = 0; G.litT = 0; G.life = life; this.ghostModel.visible = true;
  }
  updateGhost(dt) {
    const G = this.ghost, p = this.player;
    if (!G.on) {
      if (!this.S.active || this.S.power) return;
      G.next -= dt; if (G.next > 0) return; G.next = 3;
      if (this.enemy.d < 14 || p.hidden) return;
      const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
      let far = 0; for (let s = 1; s < 18; s += .5) { if (this.world.nav.solidAt(p.x + fx * s, p.z + fz * s)) break; far = s; }
      if (far < 9) return;
      const dd = Math.min(far - .6, 9 + Math.random() * 5);
      this.apparition(p.x + fx * dd, p.z + fz * dd, 4 + Math.random() * 3);
      return;
    }
    G.t += dt;
    const d = Math.hypot(G.x - p.x, G.z - p.z);
    this.ghostModel.position.set(G.x, 0, G.z); this.ghostModel.rotation.y = Math.atan2(p.x - G.x, p.z - G.z);
    animateNurse(this.ghostModel, dt, 0, 'idle', this.S.time, false);
    if (this.inBeam(G.x, G.z, 16)) G.litT += dt;
    let vanish = false, loud = false;
    if (G.litT > .25 || d < 5) { vanish = true; loud = true; } else if (G.t > G.life) vanish = true;
    if (vanish) { G.on = false; this.ghostModel.visible = false; G.next = 35 + Math.random() * 35; if (loud) { Audio.stinger(.6); this.glitch = 1; } }
  }

  /* ---------- Fim ---------- */
  kill() {
    if (this.state !== 'playing') return;
    this.state = 'dying'; this.dyingT = 0; this.S.deaths++;
    const p = this.player;
    if (p.hidden) { p.exitLocker(); UI.hidden(false); }
    UI.playUI(false); UI.closeNote(); UI.clearText();
    Audio.silenceLoops(); Audio.scream(); Audio.setStatic(.2);
    // ela fica cara a cara
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    this.enemy.x = p.x + fx * .75; this.enemy.z = p.z + fz * .75; this.enemy.state = 'kill';
    this.nurse.position.set(this.enemy.x, 0, this.enemy.z); this.nurse.rotation.y = Math.atan2(p.x - this.enemy.x, p.z - this.enemy.z);
    this.glitch = 1;
    if (this.onDeath) this.onDeath();
  }
  win() {
    this.state = 'won'; UI.fade(true); Audio.silenceLoops(); Audio.setGenerator(0); Audio.unlock();
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { }
    if (this.onWin) setTimeout(() => this.onWin(this.S.records.length >= RECORD_IDS.length), 1200);
  }

  /* ---------- Laço ---------- */
  update(dt, input) {
    const S = this.S, p = this.player, W = this.world, e = this.enemy;
    S.time += dt;
    for (let i = this.scripts.length - 1; i >= 0; i--) { const s = this.scripts[i]; s.t -= dt; if (s.t <= 0) { this.scripts.splice(i, 1); s.fn(); } }

    // olhar
    const look = input.consumeLook();
    p.yaw += look.yaw; p.pitch = Math.max(-1.3, Math.min(1.3, p.pitch + look.pitch));
    // movimento
    const inp = input.read(); inp.drainBoost = e.frozen;
    if (UI.noteOpen()) { inp.fwd *= .4; inp.strafe *= .4; inp.run = false; }
    for (const ev of p.update(dt, inp, S.time)) {
      if (ev.type === 'step') { Audio.step(ev.run ? .22 : ev.crouch ? .04 : .12, ev.side * .15, ev.run ? 1400 : 1100, .08); this.noise(p.x, p.z, ev.r); }
      else if (ev.type === 'breath') { Audio.breath(.03, 0, false, false); if (e.active && e.d < ev.r) e.checkLocker(p.locker); }
      else if (ev.type === 'gasp') { Audio.gasp(); if (e.active && e.d < ev.r) e.checkLocker(p.locker); }
      else if (ev.type === 'batteryOut') { UI.light(false); UI.msg('A lanterna apagou.', 2500); Audio.click(); }
    }
    UI.breath(p.breath, p.holding); UI.crouch(p.crouch);

    // câmera
    const bobA = this.settings.reduceMotion ? .012 : (p.hidden ? 0 : .045);
    this.camera.position.set(p.x, p.h + Math.sin(p.bobT) * bobA, p.z);
    let sh = 0; if (e.active && e.d < 6 && !this.settings.reduceMotion) sh = (1 - e.d / 6) * .02;
    this.camera.position.x += (Math.random() - .5) * sh; this.camera.position.y += (Math.random() - .5) * sh;
    this.camera.rotation.set(p.pitch + Math.sin(p.bobT * .5) * bobA * .15, p.yaw, 0);
    this.camera.updateMatrixWorld();

    // inimiga
    const lit = e.active && e.d < 15 && this.inBeam(e.x, e.z, 15);
    const seenByPlayer = e.active && e.d < 14 && this.inView(e.x, e.z) && W.nav.lineOfSight(p.x, p.z, e.x, e.z);
    const evs = e.update(dt, { player: p, lit, lightOn: p.flashOn && p.battery > 0, playerLit: this.playerLit(), seenByPlayer, time: S.time, power: S.power, fuses: S.fuses.length });
    for (const ev of evs) {
      if (ev === 'spotted') { if (S.time - this.stingerAt > 15) { this.stingerAt = S.time; Audio.stinger(1); this.glitch = .7; } }
      else if (ev === 'kill') { this.kill(); return; }
      else if (ev && ev.type === 'door') { const sp = this.spatial(ev.x, ev.z, 26); if (sp.vol > 0) Audio.door(sp.pan, Math.max(.25, sp.vol * 1.4)); }
      else if (ev && ev.type === 'step') { const sp = this.spatial(e.x, e.z, 24); if (sp.vol > 0) Audio.step(.42 * sp.vol, sp.pan, sp.front < 0 || !sp.los ? 380 : 620, .17); }
    }
    if (e.active) {
      const chasing = e.state === 'chase';
      Audio.setChase(chasing ? (e.sees ? .075 : .035) * Math.max(.25, 1 - e.d / 30) : 0);
      // respiração dela nas suas costas
      e.breathT -= dt;
      if (e.d < 6 && !this.inView(e.x, e.z) && e.breathT <= 0) { const sp = this.spatial(e.x, e.z); Audio.breath(.05 + .15 * (1 - e.d / 6), sp.pan, true, true); e.breathT = 1.4; }
    }
    this.updateGhost(dt);

    // interação
    this.target = UI.noteOpen() ? null : this.findTarget();
    UI.prompt(this.target ? this.target.label : null, this.target && this.target.locked);

    // pilhas: bip, dica e reposição
    let nb = null, nd = 1e9;
    for (const it of W.items) { if (it.taken || it.type !== 'battery') continue; const d = Math.hypot(it.x - p.x, it.z - p.z); if (d < nd) { nd = d; nb = it; } }
    this.pingT -= dt;
    if (nb && nd < 9 && this.pingT <= 0) { const sp = this.spatial(nb.x, nb.z); Audio.ping(.025 + .06 * (1 - nd / 9), sp.pan); this.pingT = .5 + nd * .15; }
    if (!this.lowHint && p.battery < 40) { this.lowHint = true; UI.msg('A pilha está fraca. Procure o brilho amarelo das pilhas e siga o bip.', 4500); }
    if (!nb && p.battery < 35) { this.respawnT += dt; if (this.respawnT > 6) { this.respawnT = 0; this.spawnBatteryNear(); } } else this.respawnT = 0;

    this.zones(dt);

    // eventos de ambiente
    if (S.active) {
      this.eventT -= dt;
      if (this.eventT <= 0) {
        this.eventT = 12 + Math.random() * 18; const pan = (Math.random() - .5) * 1.8, r = Math.random();
        if (r < .25) Audio.slam(.25 + Math.random() * .2, pan); else if (r < .5) Audio.creak(pan); else if (r < .75) Audio.whisper(pan);
        else { let n = 0; const go = () => { if (this.state !== 'playing' || n >= 5) return; Audio.step(.2 - n * .025, (Math.random() - .5) * .4, 360, .17); n++; setTimeout(go, 560); }; go(); }
      }
    }
    // escritas nas paredes
    const st = stage(S);
    for (const w of W.writings) if (!w.mesh.visible && st >= w.stage && Math.hypot(w.mesh.position.x - p.x, w.mesh.position.z - p.z) > 7) w.mesh.visible = true;

    // sirene
    if (this.sirenT > 0) { this.sirenT -= dt; if (this.sirenT <= 0) Audio.setSiren(.012); }

    // respiração do jogador
    this.breathT = (this.breathT || 0) - dt;
    const scared = e.active && e.d < 9;
    if (!p.hidden && this.breathT <= 0 && (p.stamina < 45 || p.exhausted || scared)) { Audio.breath(p.exhausted ? .09 : scared ? .07 : .05, 0, false, false); this.breathT = p.exhausted ? .75 : scared ? .95 : 1.2; }

    W.update(dt);
  }

  spawnBatteryNear() {
    const p = this.player, nav = this.world.nav;
    const d = nav.distances(toCell(p.x), toCell(p.z)), opts = [];
    for (let i = 0; i < d.length; i++) if (d[i] >= 3 && d[i] <= 7) { const x = i % MAP_W, z = (i / MAP_W) | 0; if (!nav.door(x, z)) opts.push([x, z]); }
    if (!opts.length) return;
    const c = opts[Math.floor(Math.random() * opts.length)];
    this.world.spawnBattery(c[0], c[1]);
    Audio.ping(.08, 0); UI.msg('Você ouve um bip perto daqui.', 2600);
  }

  // efeitos que rodam também em menus e na morte
  fx(dt) {
    const S = this.S, p = this.player, W = this.world, e = this.enemy, tt = performance.now() / 1000;
    if (!W) return;
    // lanterna
    let fi = 0;
    if (p.flashOn && p.battery > 0) {
      fi = 2.6;
      if (p.battery < 20 && Math.random() < .08) fi *= Math.random() * .4;
      if (e.active && e.d < 7 && Math.random() < .12 * (1 - e.d / 7) + .02) fi *= Math.random();
    }
    this.flash.intensity = fi;
    // lâmpadas
    if (this.blackout > 0) this.blackout -= dt;
    let humV = 0;
    for (const l of W.lamps) {
      l.t -= dt;
      if (l.t <= 0) {
        if (l.mode === 'dying') { l.on = Math.random() < .3; l.t = l.on ? .05 + Math.random() * .15 : .2 + Math.random() * 2.2; }
        else if (l.mode === 'flicker') { l.on = Math.random() < .9; l.t = l.on ? .6 + Math.random() * 3 : .03 + Math.random() * .18; }
        else l.on = false;
      }
      if (e && e.active && !l.dead && Math.hypot(l.x - e.x, l.z - e.z) < 2.6) { l.dead = true; l.deadT = 8 + Math.random() * 8; const sp = this.spatial(l.x, l.z, 22); if (sp.vol > 0) Audio.pop(sp.pan); }
      if (l.dead) { l.deadT -= dt; if (l.deadT <= 0 && (!e || Math.hypot(l.x - e.x, l.z - e.z) > 6)) l.dead = false; }
      const on = l.on && !l.dead && this.blackout <= 0 && l.mode !== 'off';
      l.light.intensity = on ? l.base : 0;
      l.mat.color.setHex(on ? (l.color === EMERGENCY ? 0xff6a50 : 0xcfe8d2) : 0x1c201d);
      if (on) { const dd = Math.hypot(l.x - p.x, l.z - p.z); humV = Math.max(humV, Math.max(0, 1 - dd / 9) * .03); }
    }
    if (this.state === 'playing') Audio.setHum(humV);
    W.exit.light.intensity = 1 + Math.sin(tt * (S && S.power ? 3 : 1.2)) * .25;
    // itens brilham
    W.GLOW.battery.opacity = .55 + Math.sin(tt * 3) * .25;
    for (const it of W.items) { if (it.taken) continue; if (it.type === 'record' || it.type === 'keyPosto' || it.type === 'keyMaq' || it.type === 'fuse') it.mesh.rotation.y += dt * (it.type === 'record' ? 0 : .8); }
    // tensão na imagem e no som
    let s = 0;
    if (this.state === 'playing' && e.active) { s = Math.max(0, 1 - e.d / 11); if (e.frozen) s = Math.min(1, s + .35); }
    this.glitch = Math.max(0, this.glitch - dt * 1.6);
    const U = this.R.uniforms, rm = this.settings.reduceMotion;
    U.uTime.value = tt; U.uDanger.value = rm ? s * .5 : s; U.uGlitch.value = rm ? this.glitch * .3 : this.glitch; U.uTint.value = this.state === 'dying' ? .6 : 0;
    if (this.state === 'playing') {
      Audio.setStatic(s * s * .07 + (e.frozen ? .025 : 0));
      const hi = e.active ? Math.max(0, 1 - e.d / 15) : 0;
      this.hbT -= dt; if (hi > .04 && this.hbT <= 0) { Audio.heartbeat(.18 + hi * .55); this.hbT = 1.15 - hi * .68; }
    }
    // HUD
    if (this.state === 'playing') {
      UI.bars(p.battery, p.stamina, p.exhausted); UI.clock(this.clockStr());
      UI.objective(objective(S)); UI.inventory(S, RECORD_IDS.length);
    }
  }

  // câmera de menu: passeia devagar pela recepção
  menuCamera(dt) {
    const p = this.player; if (!p) return;
    p.yaw += dt * .06;
    this.camera.position.set(p.x, 1.6, p.z); this.camera.rotation.set(-.05, p.yaw, 0);
  }
  dyingCamera(dt) {
    this.dyingT += dt;
    const e = this.enemy, p = this.player;
    animateNurse(this.nurse, dt, 0, 'kill', this.S.time, false);
    const hx = e.x, hz = e.z, hy = 2.05;
    this.tmp.set(hx - this.camera.position.x, hy - this.camera.position.y, hz - this.camera.position.z);
    const targetYaw = Math.atan2(-this.tmp.x, -this.tmp.z), targetPitch = Math.atan2(this.tmp.y, Math.hypot(this.tmp.x, this.tmp.z));
    p.yaw += (targetYaw - p.yaw) * Math.min(1, dt * 10); p.pitch += (targetPitch - p.pitch) * Math.min(1, dt * 10);
    this.camera.rotation.set(p.pitch + (Math.random() - .5) * .04, p.yaw + (Math.random() - .5) * .04, 0);
    this.flash.intensity = Math.random() < .5 ? 2.6 : 0;
  }
  render() { this.R.render(this.scene, this.camera); }
}
