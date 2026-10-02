// Mapa do Pavilhão 9, desenhado à mão.
// Cada caractere é uma célula de CELL metros.
//  #  parede          .  chão
//  D  porta comum     K  porta trancada (chave do posto)   M  porta trancada (chave da casa de máquinas)
//  F  porta da frente (acorrentada)                         E  saída de emergência
export const CELL = 2;
export const WALL_H = 3;

export const MAP = [
  '###############################', // 0
  '#.....#.......#.......#.......#', // 1
  '#.....#.......#.......#.......#', // 2
  '#.....#.......#.......#..#..#.#', // 3
  '#.....#.......#.......#.......#', // 4
  'F.....#.......K.......#.......#', // 5
  '#.....#.......#.......#.......#', // 6
  '#.....#.......#.......#..#..#.#', // 7
  '#.....#.......#.......#.......#', // 8
  '#.....#.......#.......#.......#', // 9
  '###.######D#######K#######D####', // 10
  '#.............................E', // 11
  '####D#######D######D######M####', // 12
  '#.......#.......#.....#.......#', // 13
  '#.......#.......#.....#.......#', // 14
  '#.......#.......#.....#.......#', // 15
  '#.......#...#...#.....#.#.....#', // 16
  '######..#...#...#.....#.......#', // 17
  '#.......#...#...#.....#.......#', // 18
  '#.......D.......D.....#.......#', // 19
  '#.......#.......#.....#.....#.#', // 20
  '#.......#.......#.....#.......#', // 21
  '#.......#.......#.....#.......#', // 22
  '#.......#.......#.....#.......#', // 23
  '###############################'  // 24
];
export const W = MAP[0].length;
export const H = MAP.length;

export const DOOR_KEYS = { K: 'keyPosto', M: 'keyMaq' };

export const ROOMS = [
  { id: 'recepcao',  name: 'Recepção',               x0: 1,  z0: 1,  x1: 5,  z1: 9  },
  { id: 'enfA',      name: 'Enfermaria A',           x0: 7,  z0: 1,  x1: 13, z1: 9  },
  { id: 'posto',     name: 'Posto de enfermagem',    x0: 15, z0: 1,  x1: 21, z1: 9  },
  { id: 'refeitorio',name: 'Refeitório',             x0: 23, z0: 1,  x1: 29, z1: 9  },
  { id: 'corredor',  name: 'Corredor central',       x0: 1,  z0: 11, x1: 29, z1: 11 },
  { id: 'banheiro',  name: 'Banheiros',              x0: 1,  z0: 13, x1: 7,  z1: 23 },
  { id: 'enfB',      name: 'Enfermaria B',           x0: 9,  z0: 13, x1: 15, z1: 23 },
  { id: 'tratamento',name: 'Sala de tratamento',     x0: 17, z0: 13, x1: 21, z1: 23 },
  { id: 'maquinas',  name: 'Casa de máquinas',       x0: 23, z0: 13, x1: 29, z1: 23 }
];

export const START = { x: 3, z: 7, yaw: Math.PI };

// Entidades: posição em células. "y" é a altura do item em metros.
// Móveis com "wall" encostam na parede mais próxima automaticamente.
export const ENTITIES = [
  // Recepção
  { type: 'desk',      x: 3,  z: 3 },
  { type: 'note',      id: 'n0', x: 3, z: 3, y: 0.86 },
  { type: 'chairs',    x: 1,  z: 6, wall: true },
  { type: 'chairs',    x: 1,  z: 8, wall: true },
  { type: 'plant',     x: 5,  z: 1 },
  { type: 'record',    id: 'r1', x: 5, z: 8, y: 0.02 },
  { type: 'lamp',      x: 3,  z: 5, mode: 'dying' },

  // Enfermaria A
  { type: 'bed',       x: 7,  z: 2, wall: true },
  { type: 'bed',       x: 7,  z: 4, wall: true },
  { type: 'bed',       x: 7,  z: 6, wall: true },
  { type: 'bed',       x: 7,  z: 8, wall: true },
  { type: 'bed',       x: 13, z: 2, wall: true },
  { type: 'bed',       x: 13, z: 8, wall: true },
  { type: 'locker',    id: 'lk1', x: 9,  z: 1, wall: true },
  { type: 'locker',    id: 'lk2', x: 11, z: 1, wall: true },
  { type: 'battery',   id: 'b1', x: 7, z: 6, y: 0.72 },
  { type: 'record',    id: 'r2', x: 13, z: 8, y: 0.72 },
  { type: 'wheelchair',id: 'wc', x: 12, z: 6 },
  { type: 'lamp',      x: 10, z: 5 },

  // Posto de enfermagem
  { type: 'desk',      x: 17, z: 4 },
  { type: 'desk',      x: 18, z: 4 },
  { type: 'desk',      x: 19, z: 4 },
  { type: 'phone',     id: 'phone', x: 18, z: 4, y: 0.86 },
  { type: 'keyMaq',    id: 'keyMaq', x: 19, z: 4, y: 0.86 },
  { type: 'record',    id: 'r3', x: 17, z: 4, y: 0.86 },
  { type: 'shelf',     x: 16, z: 1, wall: true },
  { type: 'shelf',     x: 20, z: 1, wall: true },
  { type: 'locker',    id: 'lk3', x: 21, z: 7, wall: true },
  { type: 'battery',   id: 'b2', x: 15, z: 8, y: 0.02 },
  { type: 'lamp',      x: 18, z: 6 },

  // Refeitório
  { type: 'table',     x: 26, z: 2 },
  { type: 'table',     x: 24, z: 5 },
  { type: 'table',     x: 27, z: 5 },
  { type: 'table',     x: 26, z: 8 },
  { type: 'fuse',      id: 'f1', x: 24, z: 5, y: 0.8 },
  { type: 'battery',   id: 'b3', x: 26, z: 8, y: 0.8 },
  { type: 'record',    id: 'r4', x: 29, z: 9, y: 0.02 },
  { type: 'locker',    id: 'lk4', x: 29, z: 1, wall: true },
  { type: 'lamp',      x: 26, z: 4 },

  // Corredor
  { type: 'locker',    id: 'lk5', x: 8,  z: 11, wall: true },
  { type: 'locker',    id: 'lk6', x: 22, z: 11, wall: true },
  { type: 'battery',   id: 'b4', x: 15, z: 11, y: 0.02 },
  { type: 'lamp',      x: 6,  z: 11 },
  { type: 'lamp',      x: 14, z: 11 },
  { type: 'lamp',      x: 21, z: 11, mode: 'dying' },
  { type: 'lamp',      x: 28, z: 11 },

  // Banheiros
  { type: 'sink',      x: 1,  z: 14, wall: true },
  { type: 'sink',      x: 1,  z: 15, wall: true },
  { type: 'keyPosto',  id: 'keyPosto', x: 1, z: 15, y: 0.92 },
  { type: 'stall',     x: 1,  z: 20, wall: true },
  { type: 'stall',     x: 1,  z: 22, wall: true },
  { type: 'fuse',      id: 'f2', x: 5, z: 23, y: 0.02 },
  { type: 'record',    id: 'r5', x: 7, z: 14, y: 0.02 },
  { type: 'lamp',      x: 4,  z: 15 },
  { type: 'lamp',      x: 4,  z: 20, mode: 'dying' },

  // Enfermaria B
  { type: 'bed',       x: 9,  z: 14, wall: true },
  { type: 'bed',       x: 9,  z: 22, wall: true },
  { type: 'bed',       x: 15, z: 14, wall: true },
  { type: 'bed',       x: 15, z: 22, wall: true },
  { type: 'gurney',    x: 13, z: 20 },
  { type: 'locker',    id: 'lk7', x: 10, z: 23, wall: true },
  { type: 'locker',    id: 'lk8', x: 14, z: 23, wall: true },
  { type: 'battery',   id: 'b5', x: 15, z: 14, y: 0.72 },
  { type: 'lamp',      x: 12, z: 20 },

  // Sala de tratamento
  { type: 'ectchair',  x: 19, z: 17, rot: 180 },
  { type: 'machine',   x: 21, z: 17, wall: true },
  { type: 'fuse',      id: 'f3', x: 21, z: 17, y: 1.12 },
  { type: 'record',    id: 'r6', x: 17, z: 22, y: 0.02 },
  { type: 'locker',    id: 'lk9', x: 21, z: 22, wall: true },
  { type: 'lamp',      x: 19, z: 15, mode: 'dying' },

  // Casa de máquinas
  { type: 'generator', x: 27, z: 15 },
  { type: 'fusebox',   id: 'fusebox', x: 29, z: 18, wall: true },
  { type: 'battery',   id: 'b6', x: 23, z: 22, y: 0.02 },
  { type: 'locker',    id: 'lk10', x: 23, z: 13, wall: true },
  { type: 'lamp',      x: 26, z: 19, mode: 'off' }
];

export const ENEMY_SPAWN = { x: 29, z: 2 };

export const WAYPOINTS = [
  [3, 6], [10, 5], [18, 6], [26, 6], [28, 2],
  [5, 11], [15, 11], [25, 11], [11, 11], [20, 11],
  [4, 15], [4, 20], [11, 15], [13, 22], [19, 14], [19, 21], [26, 17], [24, 21]
];

// Gatilhos de roteiro (células)
export const ZONES = {
  enfA:       { x0: 7,  z0: 1,  x1: 13, z1: 9 },
  posto:      { x0: 15, z0: 1,  x1: 21, z1: 9 },
  refeitorio: { x0: 23, z0: 1,  x1: 29, z1: 9 },
  tratamento: { x0: 17, z0: 13, x1: 21, z1: 23 },
  corredorLeste: { x0: 24, z0: 11, x1: 29, z1: 11 }
};

export function cellChar(x, z) {
  if (x < 0 || z < 0 || x >= W || z >= H) return '#';
  return MAP[z][x];
}
export const isDoorChar = c => c === 'D' || c === 'K' || c === 'M';
export const center = c => (c + 0.5) * CELL;
export const toCell = v => Math.floor(v / CELL);
