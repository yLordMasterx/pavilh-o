// Jogador: andar, correr, agachar, lanterna, esconder no armário e prender a respiração
import { CELL, START, center } from './map.js';

export const WALK = 2.4, RUN = 4.4, CROUCH = 1.25, RADIUS = .3;

export class Player {
  constructor(nav) { this.nav = nav; this.reset(); }
  reset(s = START) {
    this.x = center(s.x); this.z = center(s.z); this.yaw = s.yaw; this.pitch = 0;
    this.crouch = false; this.h = 1.6; this.running = false; this.moving = false;
    this.stamina = 100; this.exhausted = false;
    this.battery = 100; this.flashOn = true;
    this.hidden = false; this.locker = null; this.breath = 100; this.holding = false; this.breathLock = 0; this.breathT = 0;
    this.bobT = 0; this.stepAcc = 0; this.stepSide = 1; this.enteredAt = -99;
  }
  enterLocker(L, time) {
    this.hidden = true; this.locker = L; this.enteredAt = time;
    this.savedPos = { x: this.x, z: this.z };
    this.x = L.x + L.fx * .02; this.z = L.z + L.fz * .02; this.yaw = L.yaw; this.pitch = 0; this.crouch = false;
  }
  exitLocker() {
    const L = this.locker; if (!L) return;
    this.x = L.x + L.fx * .85; this.z = L.z + L.fz * .85; this.yaw = L.yaw;
    this.hidden = false; this.locker = null; this.holding = false;
  }
  update(dt, inp, time) {
    const ev = [];
    if (this.hidden) {
      // limita o olhar para as frestas
      const L = this.locker; let dy = this.yaw - L.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      dy = Math.max(-.45, Math.min(.45, dy)); this.yaw = L.yaw + dy; this.pitch = Math.max(-.35, Math.min(.35, this.pitch));
      this.breathLock -= dt;
      this.holding = inp.hold && this.breathLock <= 0 && this.breath > 0;
      if (this.holding) { this.breath -= 26 * dt; if (this.breath <= 0) { this.breath = 0; this.breathLock = 2.5; this.holding = false; ev.push({ type: 'gasp', r: 7 }); } }
      else { this.breath = Math.min(100, this.breath + 16 * dt); this.breathT -= dt; if (this.breathT <= 0) { this.breathT = 1.35; ev.push({ type: 'breath', r: 3.2 }); } }
      this.h += (1.55 - this.h) * Math.min(1, dt * 8);
      this.moving = false; this.running = false;
      this.stamina = Math.min(100, this.stamina + 16 * dt);
      return ev;
    }
    this.breath = Math.min(100, this.breath + 20 * dt);
    let ix = inp.strafe, iz = inp.fwd;
    const il = Math.hypot(ix, iz); if (il > 1) { ix /= il; iz /= il; }
    const moving = il > .1;
    if (inp.run && this.crouch && moving) this.crouch = false;
    const wantRun = inp.run && moving && iz > 0 && !this.crouch;
    const running = wantRun && !this.exhausted && this.stamina > 0;
    if (running) { this.stamina -= 22 * dt; if (this.stamina <= 0) { this.stamina = 0; this.exhausted = true; } }
    else { this.stamina = Math.min(100, this.stamina + (moving ? 10 : 16) * dt); if (this.exhausted && this.stamina > 35) this.exhausted = false; }
    const spd = this.crouch ? CROUCH : (running ? RUN : WALK) * (this.exhausted ? .8 : 1);
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw), rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    const mx = (fx * iz + rx * ix) * spd * dt, mz = (fz * iz + rz * ix) * spd * dt;
    const ox = this.x, oz = this.z;
    if (!this.nav.blocked(this.x + mx, this.z, RADIUS)) this.x += mx;
    if (!this.nav.blocked(this.x, this.z + mz, RADIUS)) this.z += mz;
    const moved = Math.hypot(this.x - ox, this.z - oz);
    this.moving = moved > .0005; this.running = running && this.moving;
    this.bobT += moved * (running ? 2.6 : this.crouch ? 3.4 : 2.9);
    this.stepAcc += moved;
    const stride = running ? 1.35 : this.crouch ? .8 : 1.05;
    if (this.stepAcc > stride) { this.stepAcc = 0; this.stepSide *= -1; ev.push({ type: 'step', run: running, crouch: this.crouch, side: this.stepSide, r: running ? 13 : this.crouch ? 0 : 4.5 }); }
    this.h += ((this.crouch ? .95 : 1.6) - this.h) * Math.min(1, dt * 8);
    // lanterna
    if (this.flashOn && this.battery > 0) { this.battery -= (inp.drainBoost ? 3.2 : 1.0) * dt; if (this.battery <= 0) { this.battery = 0; this.flashOn = false; ev.push({ type: 'batteryOut' }); } }
    return ev;
  }
}

export { CELL };
