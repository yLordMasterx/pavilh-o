// Entrada: teclado, mouse (com trava do ponteiro) e toque
const $ = id => document.getElementById(id);

export class Input {
  constructor(target, settings) {
    this.target = target; this.settings = settings;
    this.keys = {}; this.joy = { x: 0, y: 0 }; this.look = { dx: 0, dy: 0 };
    this.touchRun = false; this.touchHold = false;
    this.handlers = {};
    this.isTouch = matchMedia('(pointer: coarse)').matches;
    this.locked = false; this.hadLock = false; this.noLock = this.isTouch; this.enabled = false;
    this.bind();
  }
  on(name, fn) { this.handlers[name] = fn; }
  emit(name, ...a) { const f = this.handlers[name]; if (f) f(...a); }

  lock() {
    if (this.noLock) return;
    try { const p = this.target.requestPointerLock(); if (p && p.catch) p.catch(() => { this.noLock = true; }); } catch (e) { this.noLock = true; }
  }
  unlock() { if (document.pointerLockElement) document.exitPointerLock(); }

  bind() {
    addEventListener('keydown', e => {
      if (e.repeat) { if (['Space'].includes(e.code)) e.preventDefault(); return; }
      this.keys[e.code] = true;
      if (!this.enabled) return;
      if (e.code === 'KeyE') this.emit('interact');
      if (e.code === 'KeyF') this.emit('flash');
      if (e.code === 'KeyC' || e.code === 'ControlLeft') this.emit('crouch');
      if (e.code === 'Escape' && this.noLock) this.emit('pause');
      if (e.code === 'KeyP') this.emit('pause');
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', e => { this.keys[e.code] = false; });
    addEventListener('blur', () => { this.keys = {}; });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.target;
      if (this.locked) this.hadLock = true;
      else if (this.enabled && this.hadLock) this.emit('pause');
    });
    document.addEventListener('pointerlockerror', () => { this.noLock = true; });
    document.addEventListener('mousemove', e => {
      if (!this.enabled || this.isTouch) return;
      if (this.locked || (this.noLock && (e.buttons & 1))) { this.look.dx += e.movementX; this.look.dy += e.movementY; }
    });
    this.target.addEventListener('mousedown', () => { if (this.enabled && !this.locked && !this.noLock) this.lock(); });

    // toque
    const stick = $('stick'), knob = $('knob');
    let padId = null, padO = { x: 0, y: 0 }, lookId = null, lookL = { x: 0, y: 0 };
    const cap = e => { try { e.target.setPointerCapture(e.pointerId); } catch (_) { } };
    $('padZone').addEventListener('pointerdown', e => { padId = e.pointerId; padO = { x: e.clientX, y: e.clientY }; stick.style.left = e.clientX + 'px'; stick.style.top = e.clientY + 'px'; stick.classList.add('on'); cap(e); });
    $('padZone').addEventListener('pointermove', e => { if (e.pointerId !== padId) return; let dx = e.clientX - padO.x, dy = e.clientY - padO.y; const l = Math.hypot(dx, dy), R = 50; if (l > R) { dx *= R / l; dy *= R / l; } this.joy.x = dx / R; this.joy.y = dy / R; knob.style.transform = `translate(${dx}px,${dy}px)`; });
    const padEnd = e => { if (e.pointerId !== padId) return; padId = null; this.joy.x = this.joy.y = 0; knob.style.transform = ''; stick.classList.remove('on'); };
    ['pointerup', 'pointercancel'].forEach(t => $('padZone').addEventListener(t, padEnd));
    $('lookZone').addEventListener('pointerdown', e => { lookId = e.pointerId; lookL = { x: e.clientX, y: e.clientY }; cap(e); });
    $('lookZone').addEventListener('pointermove', e => { if (e.pointerId !== lookId) return; this.look.dx += (e.clientX - lookL.x) * 2.4; this.look.dy += (e.clientY - lookL.y) * 2.4; lookL = { x: e.clientX, y: e.clientY }; });
    ['pointerup', 'pointercancel'].forEach(t => $('lookZone').addEventListener(t, e => { if (e.pointerId === lookId) lookId = null; }));
    const tap = (id, fn) => $(id).addEventListener('click', e => { e.preventDefault(); if (this.enabled) fn(); });
    tap('tInteract', () => this.emit('interact'));
    tap('tLight', () => this.emit('flash'));
    tap('tCrouch', () => this.emit('crouch'));
    tap('tPause', () => this.emit('pause'));
    const hold = (id, set) => {
      const b = $(id);
      b.addEventListener('pointerdown', e => { set(true); b.classList.add('active'); e.preventDefault(); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => b.addEventListener(t, () => { set(false); b.classList.remove('active'); }));
    };
    hold('tRun', v => this.touchRun = v);
    hold('tHold', v => this.touchHold = v);
  }

  read() {
    const k = this.keys;
    let fwd = 0, strafe = 0;
    if (k.KeyW || k.ArrowUp) fwd += 1; if (k.KeyS || k.ArrowDown) fwd -= 1;
    if (k.KeyD || k.ArrowRight) strafe += 1; if (k.KeyA || k.ArrowLeft) strafe -= 1;
    fwd -= this.joy.y; strafe += this.joy.x;
    return { fwd, strafe, run: !!(k.ShiftLeft || k.ShiftRight || this.touchRun), hold: !!(k.Space || this.touchHold) };
  }
  consumeLook() {
    const s = .0022 * this.settings.sens, inv = this.settings.invertY ? -1 : 1;
    const out = { yaw: -this.look.dx * s, pitch: -this.look.dy * s * inv };
    this.look.dx = this.look.dy = 0; return out;
  }
  clear() { this.keys = {}; this.joy.x = this.joy.y = 0; this.look.dx = this.look.dy = 0; this.touchRun = this.touchHold = false; }
}
