// Navegação em grade: paredes, portas, linha de visão e caminhos (sem dependência do three.js)
import { MAP, W, H, CELL, cellChar, isDoorChar, toCell } from './map.js';

export class Nav {
  constructor() {
    this.doors = new Map();   // "x,z" -> objeto da porta { open, locked, ... }
    this.obstacles = [];      // AABBs { x0, x1, z0, z1 }
    this.parent = new Int32Array(W * H);
  }
  key(x, z) { return x + ',' + z; }
  door(x, z) { return this.doors.get(this.key(x, z)); }

  // Célula bloqueia o jogador?
  solid(x, z) {
    const c = cellChar(x, z);
    if (c === '#' || c === 'F' || c === 'E') return true;
    if (isDoorChar(c)) { const d = this.door(x, z); return !d || !d.open; }
    return false;
  }
  // Célula bloqueia a visão?
  opaque(x, z) { return this.solid(x, z); }
  // Célula é atravessável pela inimiga? (ela abre portas comuns e destrancadas)
  walkableForEnemy(x, z) {
    const c = cellChar(x, z);
    if (c === '#' || c === 'F' || c === 'E') return false;
    if (isDoorChar(c)) { const d = this.door(x, z); return !!d && !d.locked; }
    return true;
  }

  solidAt(wx, wz) { return this.solid(toCell(wx), toCell(wz)); }

  blocked(wx, wz, r) {
    if (this.solidAt(wx - r, wz - r) || this.solidAt(wx + r, wz - r) || this.solidAt(wx - r, wz + r) || this.solidAt(wx + r, wz + r)) return true;
    for (const b of this.obstacles) {
      if (wx + r > b.x0 && wx - r < b.x1 && wz + r > b.z0 && wz - r < b.z1) return true;
    }
    return false;
  }

  lineOfSight(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az, d = Math.hypot(dx, dz);
    const steps = Math.max(1, Math.ceil(d / 0.25));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (this.opaque(toCell(ax + dx * t), toCell(az + dz * t))) return false;
    }
    return true;
  }

  // Caminho por BFS para a inimiga; retorna lista de células [x,z]
  path(sx, sz, tx, tz) {
    if (!this.walkableForEnemy(sx, sz) || !this.walkableForEnemy(tx, tz)) return null;
    const P = this.parent; P.fill(-2);
    const s = sz * W + sx, t = tz * W + tx;
    const q = [s]; P[s] = -1;
    for (let h = 0; h < q.length; h++) {
      const c = q[h]; if (c === t) break;
      const x = c % W, z = (c / W) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), nz = z + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
        const n = nz * W + nx;
        if (P[n] !== -2 || !this.walkableForEnemy(nx, nz)) continue;
        P[n] = c; q.push(n);
      }
    }
    if (P[t] === -2) return null;
    const out = [];
    for (let c = t; c !== -1; c = P[c]) out.push([c % W, (c / W) | 0]);
    return out.reverse();
  }

  // Distâncias a partir de uma célula (jogador), considerando portas como passáveis se destrancadas
  distances(sx, sz) {
    const d = new Int16Array(W * H).fill(-1);
    if (!this.walkableForEnemy(sx, sz)) return d;
    const q = [sz * W + sx]; d[q[0]] = 0;
    for (let h = 0; h < q.length; h++) {
      const c = q[h], x = c % W, z = (c / W) | 0;
      for (let k = 0; k < 4; k++) {
        const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), nz = z + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
        const n = nz * W + nx;
        if (d[n] >= 0 || !this.walkableForEnemy(nx, nz)) continue;
        d[n] = d[c] + 1; q.push(n);
      }
    }
    return d;
  }
}

// Qual parede está ao lado de uma célula (para encostar móveis). Retorna [dx,dz] apontando para a parede.
export function wallSide(x, z) {
  const dirs = [[0, -1], [-1, 0], [1, 0], [0, 1]];
  for (const [dx, dz] of dirs) { if (cellChar(x + dx, z + dz) === '#') return [dx, dz]; }
  return [0, -1];
}

// Orientação de uma porta: 'x' se a passagem é ao longo de z (paredes a leste/oeste), 'z' caso contrário
export function doorAxis(x, z) {
  const wl = cellChar(x - 1, z), wr = cellChar(x + 1, z);
  const solidish = c => c === '#' || isDoorChar(c);
  return (solidish(wl) && solidish(wr)) ? 'x' : 'z';
}

export { MAP, CELL };
