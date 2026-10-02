// Ponto de entrada: menus, configurações, laço principal e susto final
import { Game } from './game.js';
import { Input } from './input.js';
import { Audio } from './audio.js';
import { UI } from './ui.js';
import { ENDINGS, DEATH_TEXT, RECORD_IDS } from './story.js';

const $ = UI.$;
const SET_KEY = 'pavilhao9.settings';
const defaults = { sens: 1, bright: 1, volume: .8, retro: true, shadows: !UI.isTouch, invertY: false };
let settings = Object.assign({}, defaults);
try { Object.assign(settings, JSON.parse(localStorage.getItem(SET_KEY) || '{}')); } catch (e) { }
settings.reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const saveSettings = () => { try { const { reduceMotion, ...s } = settings; localStorage.setItem(SET_KEY, JSON.stringify(s)); } catch (e) { } };

let game;
try { game = new Game($('view'), settings); }
catch (err) {
  $('loading').textContent = 'Seu navegador não conseguiu abrir o 3D (WebGL). Tente outro navegador ou ative a aceleração de hardware.';
  throw err;
}
const input = new Input($('game'), settings);
if (UI.isTouch) { $('keysDesktop').hidden = true; $('keysTouch').hidden = false; }

/* ---------- Telas ---------- */
let backTo = 'scrMenu';
function showMenu() {
  game.state = 'menu'; input.enabled = false; input.unlock(); input.clear();
  UI.playUI(false); UI.hidden(false); UI.closeNote(); UI.fade(false); Audio.silenceLoops(); Audio.setGenerator(0);
  $('btnContinue').hidden = !game.hasSave();
  UI.screen('scrMenu');
  if (!game.world || game.state !== 'menu') game.preview();
}
function play() {
  Audio.init(); Audio.resume();
  game.state = 'playing'; UI.screen(null); UI.playUI(true); UI.hidden(game.player.hidden); UI.light(game.player.flashOn); UI.fade(false);
  input.clear(); input.enabled = true; input.lock();
}
function pause() {
  if (game.state !== 'playing') return;
  game.state = 'paused'; input.enabled = false; input.unlock(); input.clear();
  UI.playUI(false); Audio.silenceLoops();
  $('pauseClock').textContent = game.clockStr(); $('pauseObj').textContent = $('objective').textContent;
  $('pauseRec').textContent = game.S.records.length + ' de ' + RECORD_IDS.length;
  UI.screen('scrPause');
}
function fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ':' + String(s).padStart(2, '0'); }
function endScreen(kind) {
  const E = ENDINGS[kind], S = game.S;
  $('endTitle').textContent = E.title; $('endStamp').textContent = E.stamp; $('endStamp').classList.toggle('ok', kind !== 'dead');
  $('endText').textContent = kind === 'dead' ? DEATH_TEXT[(S.deaths - 1) % DEATH_TEXT.length] : E.text;
  $('endRec').textContent = S.records.length + ' de ' + RECORD_IDS.length; $('endClock').textContent = game.clockStr();
  $('endTime').textContent = fmtTime(S.time); $('endDeaths').textContent = S.deaths;
  $('btnRetry').hidden = kind !== 'dead';
  UI.screen('scrEnd');
}

$('btnNew').addEventListener('click', () => { Audio.init(); game.newGame(); play(); });
$('btnContinue').addEventListener('click', () => { Audio.init(); game.load(); play(); });
$('btnHow').addEventListener('click', () => { backTo = 'scrMenu'; UI.screen('scrHow'); });
$('btnSettings').addEventListener('click', () => { backTo = 'scrMenu'; openSettings(); });
$('btnPauseSettings').addEventListener('click', () => { backTo = 'scrPause'; openSettings(); });
$('btnResume').addEventListener('click', play);
$('btnQuit').addEventListener('click', () => { game.save(); showMenu(); });
$('btnRetry').addEventListener('click', () => { const d = game.S.deaths; game.retry(); game.S.deaths = d; play(); });
$('btnEndMenu').addEventListener('click', showMenu);
document.querySelectorAll('[data-back]').forEach(b => b.addEventListener('click', () => UI.screen(backTo)));
$('note').addEventListener('click', () => UI.closeNote());

/* ---------- Configurações ---------- */
function openSettings() {
  const map = [['setSens', 'sens', 'outSens', v => v.toFixed(2) + '×'], ['setBright', 'bright', 'outBright', v => Math.round(v * 100) + '%'], ['setVol', 'volume', 'outVol', v => Math.round(v * 100) + '%']];
  for (const [id, key, out, fmt] of map) { $(id).value = settings[key]; $(out).textContent = fmt(settings[key]); }
  $('setRetro').checked = settings.retro; $('setShadows').checked = settings.shadows; $('setInvert').checked = settings.invertY;
  UI.screen('scrSettings');
}
[['setSens', 'sens', 'outSens', v => v.toFixed(2) + '×'], ['setBright', 'bright', 'outBright', v => Math.round(v * 100) + '%'], ['setVol', 'volume', 'outVol', v => Math.round(v * 100) + '%']].forEach(([id, key, out, fmt]) => {
  $(id).addEventListener('input', e => { settings[key] = parseFloat(e.target.value); $(out).textContent = fmt(settings[key]); if (key === 'bright') game.R.uniforms.uBright.value = settings.bright; if (key === 'volume') Audio.setVolume(settings.volume); saveSettings(); });
});
$('setRetro').addEventListener('change', e => { settings.retro = e.target.checked; game.applySettings(); saveSettings(); });
$('setShadows').addEventListener('change', e => { settings.shadows = e.target.checked; game.applySettings(); saveSettings(); });
$('setInvert').addEventListener('change', e => { settings.invertY = e.target.checked; saveSettings(); });

/* ---------- Entrada ---------- */
input.on('interact', () => game.interact());
input.on('flash', () => {
  const p = game.player; if (p.hidden) return;
  if (p.battery <= 0) { UI.msg('A pilha acabou.', 2000); return; }
  p.flashOn = !p.flashOn; Audio.click(); UI.light(p.flashOn);
});
input.on('crouch', () => { const p = game.player; if (!p.hidden) p.crouch = !p.crouch; });
input.on('pause', pause);
addEventListener('blur', pause);
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

/* ---------- Susto e fim ---------- */
const sc = $('scareCanvas'), sx = sc.getContext('2d');
function drawScare(k) {
  const w = 200, h = 200; sx.fillStyle = '#000'; sx.fillRect(0, 0, w, h);
  sx.save(); sx.translate(100 + (Math.random() - .5) * 10 * k, 110 + (Math.random() - .5) * 10 * k); sx.rotate(.28 + (Math.random() - .5) * .1);
  const s = .9 + k * .35; sx.scale(s, s);
  const g = sx.createRadialGradient(-10, -20, 8, 0, 0, 95); g.addColorStop(0, '#e0dacb'); g.addColorStop(1, '#5e5a4c');
  sx.fillStyle = g; sx.beginPath(); sx.ellipse(0, 0, 64, 92, 0, 0, Math.PI * 2); sx.fill();
  [[-24, -12], [24, -12]].forEach(([ex, ey]) => { const e = sx.createRadialGradient(ex, ey, 0, ex, ey, 22); e.addColorStop(0, '#000'); e.addColorStop(.7, 'rgba(0,0,0,.9)'); e.addColorStop(1, 'rgba(0,0,0,0)'); sx.fillStyle = e; sx.beginPath(); sx.arc(ex, ey, 22, 0, Math.PI * 2); sx.fill(); sx.fillStyle = 'rgba(230,225,210,.9)'; sx.fillRect(ex - 1, ey - 1, 2, 2); });
  sx.fillStyle = '#000'; sx.beginPath(); sx.ellipse(0, 44, 14 + k * 6, 26 + k * 16, 0, 0, Math.PI * 2); sx.fill();
  sx.fillStyle = '#c9c3b0'; sx.fillRect(-34, -96, 68, 18); sx.fillStyle = '#7a1d16'; sx.fillRect(-4, -94, 8, 14); sx.fillRect(-9, -89, 18, 5);
  sx.strokeStyle = '#060504'; sx.lineWidth = 3; for (let i = 0; i < 14; i++) { const xx = (Math.random() < .5 ? -1 : 1) * (40 + Math.random() * 24); sx.beginPath(); sx.moveTo(xx * .6, -80); sx.quadraticCurveTo(xx, 0, xx * .9, 110); sx.stroke(); }
  sx.restore();
  for (let i = 0; i < 6; i++) { const y = Math.random() * h | 0, hh = 2 + Math.random() * 10 | 0; sx.drawImage(sc, 0, y, w, hh, (Math.random() - .5) * 30, y, w, hh); }
  const im = sx.getImageData(0, 0, w, h), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - .5) * 70; d[i] += n + 12 * k; d[i + 1] += n; d[i + 2] += n; } sx.putImageData(im, 0, 0);
  sx.fillStyle = 'rgba(0,0,0,.35)'; for (let y = 0; y < h; y += 2) sx.fillRect(0, y, w, 1);
}
game.onDeath = () => {
  input.enabled = false; input.unlock();
  setTimeout(() => {
    $('scare').hidden = false;
    const t0 = performance.now();
    (function frame() {
      const k = (performance.now() - t0) / 1300;
      if (k < 1) {
        drawScare(k);
        if (!settings.reduceMotion) {
          sc.style.transform = `translate(${(Math.random() - .5) * 22}px,${(Math.random() - .5) * 22}px) scale(${1.05 + k * .3})`;
          const r = Math.random(); sc.style.filter = r < .12 ? 'invert(1)' : r < .24 ? 'sepia(1) saturate(9) hue-rotate(-40deg) brightness(1.4)' : r < .3 ? 'brightness(0)' : 'none';
        }
        requestAnimationFrame(frame);
      } else { $('scare').hidden = true; sc.style.transform = ''; sc.style.filter = ''; Audio.silenceLoops(); game.state = 'dead'; endScreen('dead'); }
    })();
  }, 750);
};
game.onWin = trueEnd => { input.enabled = false; input.unlock(); UI.playUI(false); game.state = 'won'; endScreen(trueEnd ? 'true' : 'normal'); };

/* ---------- Laço ---------- */
let last = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - last) / 1000, .05); last = now;
  if (game.state === 'playing') game.update(dt, input);
  else if (game.state === 'menu') game.menuCamera(dt);
  else if (game.state === 'dying') game.dyingCamera(dt);
  game.fx(dt);
  game.render();
}

game.preview();
showMenu();
$('loading').hidden = true;
requestAnimationFrame(loop);
