// Interface: HUD, mensagens, legendas, documentos e telas
const $ = id => document.getElementById(id);
const SCREENS = ['scrMenu', 'scrHow', 'scrSettings', 'scrPause', 'scrEnd'];
let msgTimer = 0, subTimer = 0, lastObjective = '';

export const UI = {
  $, isTouch: matchMedia('(pointer: coarse)').matches,
  screen(id) { SCREENS.forEach(s => $(s).hidden = s !== id); },
  playUI(on) {
    $('hud').hidden = !on; $('touch').hidden = !(on && this.isTouch);
  },
  msg(text, ms = 4000) { const m = $('msg'); m.textContent = text; m.classList.add('show'); clearTimeout(msgTimer); msgTimer = setTimeout(() => m.classList.remove('show'), ms); },
  subtitle(text, ms = 3000) { const s = $('subtitle'); s.textContent = text; s.classList.add('show'); clearTimeout(subTimer); subTimer = setTimeout(() => s.classList.remove('show'), ms); },
  clearText() { $('msg').classList.remove('show'); $('subtitle').classList.remove('show'); },
  objective(text) {
    if (text === lastObjective) return; lastObjective = text;
    const o = $('objective'); o.textContent = text; o.classList.remove('flash'); void o.offsetWidth; o.classList.add('flash');
  },
  resetObjective() { lastObjective = ''; },
  prompt(label, locked) {
    const p = $('prompt'), k = (label || '') + (locked ? '!' : '');
    if (k === this._lastPrompt) return; this._lastPrompt = k;
    if (!label) { p.classList.remove('show'); return; }
    const key = this.isTouch ? 'Usar' : 'E';
    p.innerHTML = `<b>${key}</b>${label}`; p.classList.toggle('locked', !!locked); p.classList.add('show');
  },
  bars(battery, stamina, exhausted) {
    const b = $('batBar'); b.style.width = battery.toFixed(1) + '%'; b.classList.toggle('low', battery < 20);
    const s = $('staBar'); s.style.width = stamina.toFixed(1) + '%'; s.classList.toggle('low', exhausted);
  },
  clock(t) { $('clock').textContent = t; },
  inventory(S, total) {
    const items = [];
    if (S.inv.keyPosto && !S.unlocked.keyPosto) items.push(['key', 'Chave do posto']);
    if (S.inv.keyMaq && !S.unlocked.keyMaq) items.push(['key', 'Chave das máquinas']);
    if (S.fuses.length > S.fusesIn) items.push(['fuse', `Fusíveis ${S.fuses.length - S.fusesIn}`]);
    items.push(['rec', `Prontuários ${S.records.length}/${total}`]);
    const html = items.map(([c, t]) => `<li class="${c}"><i></i>${t}</li>`).join('');
    const ul = $('invList'); if (ul.innerHTML !== html) ul.innerHTML = html;
  },
  crouch(on) { $('crouchTag').hidden = !on; $('tCrouch').classList.toggle('active', on); },
  light(on) { $('tLight').classList.toggle('active', on); },
  hidden(on) {
    $('hideOverlay').hidden = !on; $('dot').hidden = on;
    $('tHold').hidden = !on; $('tRun').hidden = on; $('tCrouch').hidden = on; $('tLight').hidden = on;
    $('breathHint').textContent = this.isTouch ? 'Segure Prender quando ela chegar perto · Usar para sair' : 'Segure Espaço para prender a respiração · E para sair';
  },
  breath(v, holding) { const b = $('breathBar'); b.style.width = v.toFixed(1) + '%'; b.classList.toggle('low', v < 25 || holding); },
  note(doc, extra) {
    $('noteKind').textContent = doc.kind; $('noteNum').textContent = doc.num; $('noteDate').textContent = doc.date; $('noteText').textContent = doc.text;
    $('noteCount').textContent = extra || '';
    $('noteStamp').hidden = doc.kind.startsWith('Bilhete');
    $('noteClose').textContent = this.isTouch ? 'Toque para fechar' : 'E para fechar';
    $('note').hidden = false;
  },
  noteOpen() { return !$('note').hidden; },
  closeNote() { $('note').hidden = true; },
  fade(on) { $('fade').classList.toggle('on', on); }
};
