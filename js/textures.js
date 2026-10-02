// Texturas procedurais desenhadas em canvas, depois reduzidas para o visual serrilhado de PS1
import * as THREE from 'three';

export function makeCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
export function grit(x, w, h, amt) {
  const im = x.getImageData(0, 0, w, h), d = im.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * amt; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
  x.putImageData(im, 0, 0);
}
export function stain(x, w, h, count, rgb, alpha, rmin, rmax) {
  for (let i = 0; i < count; i++) {
    const px = Math.random() * w, py = Math.random() * h, r = rmin + Math.random() * (rmax - rmin);
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(${rgb},${alpha})`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
  }
}
function drips(x, w, y0, y1, n, rgb, a) {
  for (let i = 0; i < n; i++) {
    const px = Math.random() * w, len = 20 + Math.random() * (y1 - y0), py = y0 + Math.random() * 30;
    const g = x.createLinearGradient(0, py, 0, py + len); g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g; x.fillRect(px, py, 1.5 + Math.random() * 3, len);
  }
}
function cracks(x, w, h, n) {
  x.strokeStyle = 'rgba(25,25,20,.55)'; x.lineWidth = 1;
  for (let i = 0; i < n; i++) { let px = Math.random() * w, py = Math.random() * h * .6; x.beginPath(); x.moveTo(px, py); for (let k = 0; k < 8; k++) { px += (Math.random() - .5) * 22; py += Math.random() * 14; x.lineTo(px, py); } x.stroke(); }
}

export function toTex(c, rep, scale) {
  let src = c;
  if (scale && scale !== 1) { const [s, sx] = makeCanvas(Math.max(1, Math.round(c.width * scale)), Math.max(1, Math.round(c.height * scale))); sx.drawImage(c, 0, 0, s.width, s.height); src = s; }
  const t = new THREE.CanvasTexture(src);
  if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  return t;
}

/* ---------- Paredes ---------- */
function wallPaint() {
  const [c, x] = makeCanvas(256, 384);
  x.fillStyle = '#8c9887'; x.fillRect(0, 0, 256, 384);
  x.fillStyle = '#3d5046'; x.fillRect(0, 230, 256, 154);
  x.fillStyle = '#252e29'; x.fillRect(0, 224, 256, 7);
  x.fillStyle = '#1d231f'; x.fillRect(0, 370, 256, 14);
  stain(x, 256, 230, 14, '70,52,28', .28, 8, 60);
  drips(x, 256, 0, 220, 12, '60,45,25', .35);
  stain(x, 256, 384, 8, '20,24,18', .35, 10, 40);
  const gb = x.createLinearGradient(0, 300, 0, 384); gb.addColorStop(0, 'rgba(15,12,8,0)'); gb.addColorStop(1, 'rgba(15,12,8,.7)'); x.fillStyle = gb; x.fillRect(0, 300, 256, 84);
  cracks(x, 256, 384, 4);
  grit(x, 256, 384, 26);
  return toTex(c, true, .5);
}
function wallTile() {
  const [c, x] = makeCanvas(256, 384);
  x.fillStyle = '#bdbfb6'; x.fillRect(0, 0, 256, 384);
  const s = 32;
  for (let j = 0; j < 12; j++) for (let i = 0; i < 8; i++) {
    const v = 175 + Math.random() * 25 | 0; x.fillStyle = `rgb(${v},${v + 2},${v - 6})`;
    x.fillRect(i * s + 1, j * s + 1, s - 2, s - 2);
    if (Math.random() < .05) { x.fillStyle = 'rgba(30,30,25,.6)'; x.fillRect(i * s + 1, j * s + 1, s - 2, s - 2); }
  }
  x.fillStyle = '#4a5a52'; x.fillRect(0, 250, 256, 10);
  stain(x, 256, 384, 18, '80,60,30', .3, 8, 50);
  drips(x, 256, 0, 300, 10, '90,70,40', .35);
  stain(x, 256, 384, 3, '90,15,10', .3, 6, 18);
  const gb = x.createLinearGradient(0, 300, 0, 384); gb.addColorStop(0, 'rgba(20,16,10,0)'); gb.addColorStop(1, 'rgba(20,16,10,.65)'); x.fillStyle = gb; x.fillRect(0, 300, 256, 84);
  grit(x, 256, 384, 22);
  return toTex(c, true, .5);
}
function wallConcrete() {
  const [c, x] = makeCanvas(256, 384);
  x.fillStyle = '#5b5852'; x.fillRect(0, 0, 256, 384);
  for (let j = 0; j < 8; j++) { x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(0, j * 48, 256, 2); for (let i = 0; i < 3; i++) x.fillRect(((j % 2) * 64 + i * 128) % 256, j * 48, 2, 48); }
  stain(x, 256, 384, 25, '30,26,20', .35, 10, 60);
  drips(x, 256, 0, 320, 16, '20,18,12', .45);
  stain(x, 256, 384, 6, '110,60,20', .3, 6, 30);
  cracks(x, 256, 384, 6);
  grit(x, 256, 384, 34);
  return toTex(c, true, .5);
}
/* ---------- Pisos e tetos ---------- */
function floorLino() {
  const [c, x] = makeCanvas(256, 256); const s = 32;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { x.fillStyle = ((i + j) % 2) ? '#2c4238' : '#a49d86'; x.fillRect(i * s, j * s, s, s); }
  x.strokeStyle = 'rgba(0,0,0,.4)'; x.lineWidth = 1;
  for (let i = 0; i <= 8; i++) { x.beginPath(); x.moveTo(i * s + .5, 0); x.lineTo(i * s + .5, 256); x.stroke(); x.beginPath(); x.moveTo(0, i * s + .5); x.lineTo(256, i * s + .5); x.stroke(); }
  stain(x, 256, 256, 22, '28,22,12', .4, 10, 60);
  stain(x, 256, 256, 3, '70,18,12', .25, 6, 22);
  grit(x, 256, 256, 30);
  return toTex(c, true, .5);
}
function floorTile() {
  const [c, x] = makeCanvas(256, 256); const s = 21;
  x.fillStyle = '#3a3c36'; x.fillRect(0, 0, 256, 256);
  for (let j = 0; j < 13; j++) for (let i = 0; i < 13; i++) { const v = 130 + Math.random() * 30 | 0; x.fillStyle = `rgb(${v},${v},${v - 8})`; x.fillRect(i * s + 1, j * s + 1, s - 2, s - 2); }
  stain(x, 256, 256, 26, '30,26,15', .45, 8, 50);
  stain(x, 256, 256, 2, '90,15,10', .35, 10, 30);
  grit(x, 256, 256, 26);
  return toTex(c, true, .5);
}
function floorConcrete() {
  const [c, x] = makeCanvas(256, 256);
  x.fillStyle = '#4a4741'; x.fillRect(0, 0, 256, 256);
  stain(x, 256, 256, 30, '20,18,14', .45, 10, 70);
  stain(x, 256, 256, 6, '15,12,8', .6, 20, 50);
  cracks(x, 256, 256, 5);
  grit(x, 256, 256, 36);
  return toTex(c, true, .5);
}
function ceilPanels() {
  const [c, x] = makeCanvas(256, 256);
  x.fillStyle = '#6a6e66'; x.fillRect(0, 0, 256, 256);
  stain(x, 256, 256, 10, '95,70,35', .3, 15, 55);
  x.strokeStyle = '#2c2f2a'; x.lineWidth = 4;
  for (let i = 0; i <= 2; i++) { x.beginPath(); x.moveTo(i * 128, 0); x.lineTo(i * 128, 256); x.stroke(); x.beginPath(); x.moveTo(0, i * 128); x.lineTo(256, i * 128); x.stroke(); }
  if (Math.random() < 1) { x.fillStyle = '#121310'; x.fillRect(132, 6, 120, 118); }
  grit(x, 256, 256, 22);
  return toTex(c, true, .5);
}
function ceilConcrete() {
  const [c, x] = makeCanvas(256, 256);
  x.fillStyle = '#3d3b37'; x.fillRect(0, 0, 256, 256);
  stain(x, 256, 256, 20, '15,13,10', .5, 10, 60);
  x.fillStyle = '#2a2723'; x.fillRect(0, 110, 256, 18);
  grit(x, 256, 256, 30);
  return toTex(c, true, .5);
}
/* ---------- Objetos ---------- */
function doorTex(label) {
  const [c, x] = makeCanvas(128, 256);
  x.fillStyle = '#5a5f52'; x.fillRect(0, 0, 128, 256);
  x.strokeStyle = '#2b2e27'; x.lineWidth = 5; x.strokeRect(3, 3, 122, 250);
  x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 2; x.strokeRect(16, 130, 96, 100);
  x.fillStyle = '#14171a'; x.fillRect(36, 30, 56, 70);
  x.strokeStyle = 'rgba(150,150,140,.5)'; x.lineWidth = 1;
  for (let i = 0; i < 7; i++) { x.beginPath(); x.moveTo(36 + i * 10, 30); x.lineTo(46 + i * 10, 100); x.stroke(); x.beginPath(); x.moveTo(92 - i * 10, 30); x.lineTo(82 - i * 10, 100); x.stroke(); }
  x.fillStyle = '#9a9a8c'; x.fillRect(100, 120, 14, 8);
  if (label) { x.fillStyle = '#ddd8c6'; x.fillRect(30, 108, 68, 14); x.fillStyle = '#2b2720'; x.font = 'bold 10px Arial'; x.textAlign = 'center'; x.fillText(label, 64, 119); }
  stain(x, 128, 256, 10, '110,55,20', .35, 6, 24);
  drips(x, 128, 120, 250, 6, '110,55,20', .4);
  grit(x, 128, 256, 24);
  return toTex(c, false, .5);
}
function bigDoorTex() {
  const [c, x] = makeCanvas(256, 256);
  x.fillStyle = '#4a3a2a'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2; i++) { x.strokeStyle = '#2a1e14'; x.lineWidth = 6; x.strokeRect(8 + i * 124, 8, 116, 240); x.strokeRect(24 + i * 124, 30, 84, 90); x.strokeRect(24 + i * 124, 140, 84, 90); }
  stain(x, 256, 256, 14, '20,14,8', .45, 10, 40);
  grit(x, 256, 256, 30);
  return toTex(c, false, .5);
}
function lockerTex() {
  const [c, x] = makeCanvas(128, 256);
  x.fillStyle = '#56645f'; x.fillRect(0, 0, 128, 256);
  x.strokeStyle = '#26302c'; x.lineWidth = 4; x.strokeRect(4, 4, 120, 248);
  x.fillStyle = '#121614'; for (let i = 0; i < 6; i++) x.fillRect(30, 26 + i * 9, 68, 4);
  for (let i = 0; i < 4; i++) x.fillRect(30, 200 + i * 9, 68, 4);
  x.fillStyle = '#9a9f98'; x.fillRect(102, 118, 8, 26);
  stain(x, 128, 256, 12, '120,60,20', .4, 6, 26);
  drips(x, 128, 0, 240, 6, '120,60,20', .35);
  x.fillStyle = 'rgba(190,190,180,.85)'; x.font = 'bold 14px Arial'; x.fillText(String(10 + (Math.random() * 80 | 0)), 46, 110);
  grit(x, 128, 256, 24);
  return toTex(c, false, .5);
}
function metalTex(base) {
  const [c, x] = makeCanvas(64, 64);
  x.fillStyle = base; x.fillRect(0, 0, 64, 64);
  stain(x, 64, 64, 6, '110,55,20', .35, 4, 16);
  grit(x, 64, 64, 30);
  return toTex(c, true, 1);
}
function woodTex() {
  const [c, x] = makeCanvas(128, 64);
  x.fillStyle = '#5a4128'; x.fillRect(0, 0, 128, 64);
  for (let i = 0; i < 26; i++) { x.strokeStyle = `rgba(30,18,8,${.2 + Math.random() * .3})`; x.lineWidth = 1 + Math.random() * 2; x.beginPath(); const y = Math.random() * 64; x.moveTo(0, y); x.bezierCurveTo(40, y + (Math.random() - .5) * 8, 80, y + (Math.random() - .5) * 8, 128, y); x.stroke(); }
  stain(x, 128, 64, 5, '20,10,5', .4, 4, 18);
  grit(x, 128, 64, 22);
  return toTex(c, true, 1);
}
function fabricTex(base, stains) {
  const [c, x] = makeCanvas(128, 128);
  x.fillStyle = base; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 4) { x.fillStyle = 'rgba(0,0,0,.06)'; x.fillRect(i, 0, 2, 128); }
  stain(x, 128, 128, stains, '90,70,40', .4, 6, 30);
  stain(x, 128, 128, Math.max(1, stains / 4 | 0), '80,14,10', .45, 4, 18);
  grit(x, 128, 128, 20);
  return toTex(c, true, 1);
}
function paperTex(kind) {
  const [c, x] = makeCanvas(128, 168);
  x.fillStyle = kind === 'note' ? '#cfc6a6' : '#dcd4bb'; x.fillRect(0, 0, 128, 168);
  x.fillStyle = '#3a342a'; x.fillRect(10, 10, 108, 3);
  for (let r = 0; r < 12; r++) { let px = 10; const py = 24 + r * 11; while (px < 110) { const w = 4 + Math.random() * 16; if (px + w > 118) break; x.fillStyle = 'rgba(40,35,28,' + (.5 + Math.random() * .4) + ')'; x.fillRect(px, py, w, 3); px += w + 4; } }
  if (kind !== 'note') { x.strokeStyle = 'rgba(168,39,27,.8)'; x.lineWidth = 3; x.save(); x.translate(88, 140); x.rotate(.3); x.strokeRect(-26, -10, 52, 20); x.restore(); }
  stain(x, 128, 168, 4, '120,90,40', .3, 8, 30);
  grit(x, 128, 168, 18);
  return toTex(c, false, .5);
}
function plateTex(text) {
  const [c, x] = makeCanvas(256, 64);
  x.fillStyle = '#c9c3ae'; x.fillRect(0, 0, 256, 64);
  x.strokeStyle = '#2b2720'; x.lineWidth = 4; x.strokeRect(4, 4, 248, 56);
  x.fillStyle = '#2b2720'; x.font = 'bold 26px "Arial Narrow",Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, 128, 34, 236);
  stain(x, 256, 64, 6, '90,60,20', .35, 6, 24);
  grit(x, 256, 64, 18);
  return toTex(c, false, .5);
}
function signTex() {
  const [c, x] = makeCanvas(256, 96);
  x.fillStyle = '#050505'; x.fillRect(0, 0, 256, 96);
  x.fillStyle = '#ffffff'; x.font = 'bold 58px "Arial Narrow",Arial,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('SAÍDA', 128, 52);
  x.strokeStyle = '#ffffff'; x.lineWidth = 3; x.strokeRect(6, 6, 244, 84);
  return toTex(c, false, 1);
}
function glowTex() {
  const [c, x] = makeCanvas(64, 64);
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
export function writingTex(text) {
  const [c, x] = makeCanvas(256, 128);
  const size = text.length > 12 ? 24 : text.length > 9 ? 30 : text.length > 5 ? 40 : 62;
  x.font = `bold ${size}px Georgia,"Times New Roman",serif`; x.textBaseline = 'middle';
  let w = 0; for (const ch of text) w += x.measureText(ch).width * 1.05;
  let px = Math.max(6, (256 - w) / 2);
  for (const ch of text) {
    x.save(); x.translate(px, 58 + (Math.random() - .5) * 8); x.rotate((Math.random() - .5) * .25);
    x.fillStyle = `rgba(${110 + Math.random() * 40 | 0},${8 + Math.random() * 12 | 0},6,${.75 + Math.random() * .25})`;
    x.fillText(ch, 0, 0); x.restore();
    const cw = x.measureText(ch).width;
    if (Math.random() < .45) { const dx = px + cw * (.2 + Math.random() * .6), len = 12 + Math.random() * 44; const g = x.createLinearGradient(0, 70, 0, 70 + len); g.addColorStop(0, 'rgba(120,12,6,.85)'); g.addColorStop(1, 'rgba(120,12,6,0)'); x.fillStyle = g; x.fillRect(dx, 66, 1.5 + Math.random() * 2, len); }
    px += cw * 1.05;
  }
  return toTex(c, false, .5);
}
/* ---------- Inimiga ---------- */
function faceTex() {
  // Cabeça: rosto centrado em u=0.25 (frente +Z da esfera)
  const [c, x] = makeCanvas(256, 128);
  const g = x.createLinearGradient(0, 0, 0, 128); g.addColorStop(0, '#9c9686'); g.addColorStop(1, '#6d6858');
  x.fillStyle = g; x.fillRect(0, 0, 256, 128);
  // cabelo atrás (u 0.5..1)
  x.fillStyle = '#0b0a09'; x.fillRect(128, 0, 128, 128); x.fillRect(0, 0, 256, 34);
  for (let i = 0; i < 60; i++) { x.strokeStyle = 'rgba(10,9,8,.9)'; x.lineWidth = 2; const sx = Math.random() * 256; x.beginPath(); x.moveTo(sx, 20); x.lineTo(sx + (Math.random() - .5) * 10, 40 + Math.random() * 60); x.stroke(); }
  // rosto
  const fx = 64;
  const fg = x.createRadialGradient(fx, 66, 4, fx, 66, 46); fg.addColorStop(0, '#d8d2c2'); fg.addColorStop(1, 'rgba(160,154,138,0)');
  x.fillStyle = fg; x.fillRect(fx - 50, 20, 100, 100);
  [[-13, 60], [13, 60]].forEach(([ex, ey]) => { const e = x.createRadialGradient(fx + ex, ey, 0, fx + ex, ey, 11); e.addColorStop(0, 'rgba(0,0,0,1)'); e.addColorStop(.6, 'rgba(8,6,5,.9)'); e.addColorStop(1, 'rgba(30,25,20,0)'); x.fillStyle = e; x.fillRect(fx + ex - 12, ey - 12, 24, 24); });
  const m = x.createRadialGradient(fx, 92, 0, fx, 92, 9); m.addColorStop(0, 'rgba(25,10,8,.7)'); m.addColorStop(1, 'rgba(25,10,8,0)'); x.fillStyle = m; x.fillRect(fx - 10, 82, 20, 20);
  // mechas caindo no rosto
  for (let i = 0; i < 10; i++) { x.strokeStyle = '#0b0a09'; x.lineWidth = 2; const sx = fx + (Math.random() < .5 ? -1 : 1) * (18 + Math.random() * 12); x.beginPath(); x.moveTo(sx, 30); x.quadraticCurveTo(sx + (Math.random() - .5) * 8, 70, sx + (Math.random() - .5) * 10, 110); x.stroke(); }
  grit(x, 256, 128, 20);
  return toTex(c, false, .5);
}
function gownTex() {
  const [c, x] = makeCanvas(128, 256);
  const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#5a574c'); g.addColorStop(1, '#2a2822');
  x.fillStyle = g; x.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 128; i += 8) { x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(i, 0, 3, 256); }
  [[30, 120, 26], [44, 150, 18], [24, 180, 14], [36, 90, 10], [96, 140, 12]].forEach(([px, py, r]) => { const s = x.createRadialGradient(px, py, 0, px, py, r); s.addColorStop(0, 'rgba(70,12,8,.9)'); s.addColorStop(1, 'rgba(70,12,8,0)'); x.fillStyle = s; x.fillRect(px - r, py - r, r * 2, r * 2); });
  drips(x, 128, 120, 250, 8, '60,10,6', .6);
  grit(x, 128, 256, 22);
  return toTex(c, true, .5);
}
function skinTex() {
  const [c, x] = makeCanvas(32, 32); x.fillStyle = '#8d877a'; x.fillRect(0, 0, 32, 32); stain(x, 32, 32, 4, '60,50,40', .4, 2, 8); grit(x, 32, 32, 22);
  return toTex(c, true, 1);
}

export function buildTextures() {
  return {
    wallPaint: wallPaint(), wallTile: wallTile(), wallConcrete: wallConcrete(),
    floorLino: floorLino(), floorTile: floorTile(), floorConcrete: floorConcrete(),
    ceilPanels: ceilPanels(), ceilConcrete: ceilConcrete(),
    door: doorTex(''), bigDoor: bigDoorTex(), locker: lockerTex(),
    metal: metalTex('#6d736f'), metalDark: metalTex('#3b3f3c'), rust: metalTex('#6a4a32'),
    wood: woodTex(), mattress: fabricTex('#8a8270', 10), sheet: fabricTex('#a7a596', 6), leather: fabricTex('#3a2a20', 4),
    paper: paperTex('record'), note: paperTex('note'), sign: signTex(), glow: glowTex(),
    face: faceTex(), gown: gownTex(), skin: skinTex(),
    plate: plateTex
  };
}
