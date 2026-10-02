// Móveis e objetos do hospital. Cada construtor monta o objeto virado para +Z (frente),
// com a base no chão, e devolve as caixas de colisão em coordenadas locais.
import * as THREE from 'three';

const box = (w, h, d, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; return m; };
const cyl = (rt, rb, h, mat, seg = 10) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.castShadow = m.receiveShadow = true; return m; };

export function makeProps(M) {
  return {
    bed() {
      // cama hospitalar: cabeceira contra a parede (-Z)
      const g = new THREE.Group(); const L = 1.9, Wd = .95;
      g.add(box(Wd, .07, L, M.metal, 0, .5, 0));
      g.add(box(Wd - .06, .16, L - .1, M.mattress, 0, .62, .02));
      const sheet = box(Wd - .02, .05, L * .62, M.sheet, 0, .72, .3); sheet.rotation.x = .02; g.add(sheet);
      g.add(box(.5, .1, .3, M.sheet, 0, .74, -L / 2 + .25));
      g.add(box(Wd, .8, .05, M.metal, 0, .85, -L / 2 + .02));
      g.add(box(Wd, .4, .05, M.metal, 0, .7, L / 2 - .02));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(.05, .5, .05, M.metal, sx * (Wd / 2 - .03), .25, sz * (L / 2 - .05)));
      g.add(box(.03, .03, L * .5, M.metal, Wd / 2, .82, 0));
      return { group: g, boxes: [{ x: 0, z: 0, w: Wd, d: L }], depth: L };
    },
    locker() {
      const g = new THREE.Group(); const Wd = .8, D = .55, Hh = 1.95;
      const body = box(Wd, Hh, D, M.metalGreen, 0, Hh / 2, 0); g.add(body);
      const pivot = new THREE.Group(); pivot.position.set(-Wd / 2 + .02, 0, D / 2 + .015);
      const door = new THREE.Mesh(new THREE.BoxGeometry(Wd - .04, Hh - .06, .03), [M.metalGreen, M.metalGreen, M.metalGreen, M.metalGreen, M.locker, M.metalGreen]);
      door.position.set((Wd - .04) / 2, Hh / 2, 0); door.castShadow = true; pivot.add(door); g.add(pivot);
      return { group: g, boxes: [{ x: 0, z: 0, w: Wd, d: D }], depth: D, door: pivot };
    },
    desk() {
      const g = new THREE.Group(); const Wd = 1.98, D = .8, Hh = .84;
      g.add(box(Wd, .05, D, M.wood, 0, Hh, 0));
      g.add(box(Wd, Hh - .05, .05, M.wood, 0, (Hh - .05) / 2, D / 2 - .03));
      g.add(box(.05, Hh - .05, D, M.wood, -Wd / 2 + .03, (Hh - .05) / 2, 0));
      g.add(box(.05, Hh - .05, D, M.wood, Wd / 2 - .03, (Hh - .05) / 2, 0));
      // papéis e uma luminária apagada
      const p = box(.3, .01, .22, M.paperPlain, -.5, Hh + .03, .05); p.rotation.y = .3; g.add(p);
      const lampB = cyl(.07, .09, .03, M.metalDark); lampB.position.set(.75, Hh + .04, -.2); g.add(lampB);
      const lampA = box(.02, .35, .02, M.metalDark, .75, Hh + .2, -.2); g.add(lampA);
      return { group: g, boxes: [{ x: 0, z: 0, w: Wd, d: D }], depth: D };
    },
    chairs() {
      const g = new THREE.Group();
      g.add(box(1.8, .05, .05, M.metalDark, 0, .42, .1));
      for (let i = -1; i <= 1; i++) {
        g.add(box(.5, .06, .45, M.leather, i * .6, .45, 0));
        const back = box(.5, .45, .05, M.leather, i * .6, .72, -.22); back.rotation.x = -.08; g.add(back);
      }
      for (const sx of [-.85, .85]) g.add(box(.04, .42, .4, M.metalDark, sx, .21, 0));
      return { group: g, boxes: [{ x: 0, z: 0, w: 1.8, d: .55 }], depth: .55 };
    },
    plant() {
      const g = new THREE.Group();
      const pot = cyl(.22, .16, .45, M.rust, 10); pot.position.y = .22; g.add(pot);
      for (let i = 0; i < 7; i++) { const s = box(.02, .7 + Math.random() * .4, .02, M.deadPlant, (Math.random() - .5) * .2, .8, (Math.random() - .5) * .2); s.rotation.z = (Math.random() - .5) * 1.2; s.rotation.x = (Math.random() - .5) * 1.2; g.add(s); }
      return { group: g, boxes: [{ x: 0, z: 0, w: .45, d: .45 }], depth: .45 };
    },
    wheelchair() {
      const g = new THREE.Group();
      g.add(box(.5, .05, .45, M.leather, 0, .5, 0));
      const back = box(.5, .5, .04, M.leather, 0, .8, -.22); back.rotation.x = -.15; g.add(back);
      for (const sx of [-1, 1]) {
        const w = new THREE.Mesh(new THREE.TorusGeometry(.3, .025, 6, 16), M.metalDark); w.rotation.y = Math.PI / 2; w.position.set(sx * .3, .32, -.05); w.castShadow = true; g.add(w);
        g.add(box(.03, .45, .03, M.metal, sx * .25, .72, -.25));
        const fw = cyl(.06, .06, .03, M.metalDark, 8); fw.rotation.z = Math.PI / 2; fw.position.set(sx * .22, .06, .3); g.add(fw);
      }
      return { group: g, boxes: [{ x: 0, z: 0, w: .7, d: .9 }], depth: .9 };
    },
    shelf() {
      const g = new THREE.Group(); const Wd = 1.6, D = .45, Hh = 2.0;
      for (const sx of [-1, 1]) g.add(box(.04, Hh, D, M.metal, sx * (Wd / 2 - .02), Hh / 2, 0));
      for (let i = 0; i < 5; i++) {
        const y = .1 + i * .46; g.add(box(Wd, .03, D, M.metal, 0, y, 0));
        if (i < 4) for (let k = 0; k < 6; k++) { if (Math.random() < .3) continue; const bw = .08 + Math.random() * .12, bh = .25 + Math.random() * .12; const b = box(bw, bh, .3, Math.random() < .5 ? M.binder : M.paperPlain, -Wd / 2 + .15 + k * .24, y + bh / 2 + .02, 0); b.rotation.z = (Math.random() - .5) * .2; g.add(b); }
      }
      return { group: g, boxes: [{ x: 0, z: 0, w: Wd, d: D }], depth: D };
    },
    table() {
      const g = new THREE.Group(); const Wd = 1.7, D = .85, Hh = .76;
      g.add(box(Wd, .05, D, M.wood, 0, Hh, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(.05, Hh, .05, M.metalDark, sx * (Wd / 2 - .08), Hh / 2, sz * (D / 2 - .08)));
      for (const sz of [-1, 1]) { g.add(box(Wd - .1, .04, .3, M.wood, 0, .45, sz * .6)); for (const sx of [-1, 1]) g.add(box(.04, .45, .04, M.metalDark, sx * .7, .22, sz * .6)); }
      // pratos e uma bandeja virada
      const plate = cyl(.11, .1, .02, M.porcelain, 10); plate.position.set(-.4, Hh + .035, .1); g.add(plate);
      const tray = box(.45, .02, .3, M.metal, .35, Hh + .04, -.1); tray.rotation.y = .5; g.add(tray);
      return { group: g, boxes: [{ x: 0, z: 0, w: Wd, d: D + .5 }], depth: 1.4 };
    },
    sink() {
      const g = new THREE.Group();
      g.add(box(.6, .18, .45, M.porcelain, 0, .8, 0));
      g.add(box(.1, .7, .1, M.porcelain, 0, .38, -.12));
      g.add(box(.05, .12, .05, M.metal, 0, .95, -.16));
      const mirror = box(.55, .7, .02, M.mirror, 0, 1.55, -.22); g.add(mirror);
      return { group: g, boxes: [{ x: 0, z: 0, w: .6, d: .45 }], depth: .45 };
    },
    stall() {
      const g = new THREE.Group();
      for (const sx of [-1, 1]) g.add(box(.05, 2.0, 1.4, M.metalGreen, sx * .85, 1.05, 0));
      const tank = box(.45, .35, .2, M.porcelain, 0, .75, -.6); g.add(tank);
      const bowl = cyl(.22, .18, .42, M.porcelain, 10); bowl.position.set(0, .21, -.35); g.add(bowl);
      return { group: g, boxes: [{ x: -.85, z: 0, w: .08, d: 1.4 }, { x: .85, z: 0, w: .08, d: 1.4 }, { x: 0, z: -.4, w: .5, d: .7 }], depth: 1.45 };
    },
    gurney() {
      const g = new THREE.Group();
      g.add(box(.7, .05, 1.9, M.metal, 0, .85, 0));
      g.add(box(.66, .08, 1.8, M.sheet, 0, .92, 0));
      const body = box(.4, .22, 1.5, M.sheet, 0, 1.05, .05); g.add(body);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(box(.04, .85, .04, M.metal, sx * .3, .42, sz * .85));
      return { group: g, boxes: [{ x: 0, z: 0, w: .7, d: 1.9 }], depth: 1.9 };
    },
    ectchair() {
      const g = new THREE.Group();
      g.add(box(.7, .1, .7, M.leather, 0, .5, 0));
      const back = box(.7, .9, .1, M.leather, 0, 1.0, -.32); back.rotation.x = -.18; g.add(back);
      g.add(box(.08, .5, .6, M.metalDark, -.4, .3, 0)); g.add(box(.08, .5, .6, M.metalDark, .4, .3, 0));
      for (const sx of [-1, 1]) { g.add(box(.1, .06, .55, M.leather, sx * .42, .72, 0)); g.add(box(.12, .07, .06, M.strap, sx * .42, .76, .1)); }
      const head = new THREE.Mesh(new THREE.TorusGeometry(.16, .025, 6, 14, Math.PI), M.metal); head.position.set(0, 1.52, -.42); head.rotation.x = -.2; g.add(head);
      g.add(box(.12, .07, .5, M.strap, 0, .58, .25));
      return { group: g, boxes: [{ x: 0, z: 0, w: .9, d: .8 }], depth: .8 };
    },
    machine() {
      const g = new THREE.Group();
      g.add(box(1.0, 1.1, .5, M.metalDark, 0, .55, 0));
      g.add(box(.9, .3, .02, M.dial, 0, .85, .26));
      for (let i = 0; i < 4; i++) { const k = cyl(.04, .04, .04, M.metal, 8); k.rotation.x = Math.PI / 2; k.position.set(-.3 + i * .2, .45, .27); g.add(k); }
      const wireA = box(.02, .02, .9, M.cable, -.2, .9, .6); wireA.rotation.x = .9; g.add(wireA);
      return { group: g, boxes: [{ x: 0, z: 0, w: 1.0, d: .5 }], depth: .5 };
    },
    generator() {
      const g = new THREE.Group();
      g.add(box(1.7, .9, 1.1, M.rust, 0, .55, 0));
      g.add(box(1.8, .1, 1.2, M.metalDark, 0, .05, 0));
      const tank = cyl(.35, .35, 1.6, M.metalDark, 12); tank.rotation.z = Math.PI / 2; tank.position.set(0, 1.25, 0); g.add(tank);
      const pipe = cyl(.07, .07, 1.8, M.rust, 8); pipe.position.set(.6, 1.9, -.3); g.add(pipe);
      for (let i = 0; i < 5; i++) g.add(box(.02, .5, 1.0, M.metal, -.6 + i * .12, .6, 0));
      return { group: g, boxes: [{ x: 0, z: 0, w: 1.8, d: 1.2 }], depth: 1.2 };
    },
    fusebox() {
      const g = new THREE.Group();
      g.add(box(.7, 1.0, .22, M.metalDark, 0, 1.25, 0));
      g.add(box(.6, .9, .02, M.metal, 0, 1.25, .12));
      const slots = [];
      for (let i = 0; i < 3; i++) {
        const s = box(.1, .16, .03, M.slotEmpty, -.18 + i * .18, 1.4, .14); g.add(s); slots.push(s);
      }
      const leverPivot = new THREE.Group(); leverPivot.position.set(.0, 1.02, .16);
      const lever = box(.05, .3, .05, M.strap, 0, .14, 0); leverPivot.add(lever); leverPivot.rotation.x = .9; g.add(leverPivot);
      const lamp = box(.06, .06, .03, M.redLamp, .25, 1.62, .14); g.add(lamp);
      return { group: g, boxes: [{ x: 0, z: 0, w: .7, d: .25 }], depth: .25, slots, lever: leverPivot, lamp };
    }
  };
}
