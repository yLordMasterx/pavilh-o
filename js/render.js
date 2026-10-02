// Renderizador com pós-processamento retrô (baixa resolução, pontilhado, CRT, VHS)
import * as THREE from 'three';

export const SNAP = { value: new THREE.Vector2(160, 120) };

// Vértices tremidos estilo PS1
export function psx(mat) {
  mat.onBeforeCompile = sh => {
    sh.uniforms.uSnap = SNAP;
    sh.vertexShader = 'uniform vec2 uSnap;\n' + sh.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\nif(gl_Position.w>0.0){vec4 sp=gl_Position;sp.xy/=sp.w;sp.xy=floor(sp.xy*uSnap+0.5)/uSnap;sp.xy*=sp.w;gl_Position=sp;}');
  };
  return mat;
}

const FRAG = `
uniform sampler2D tDiffuse;uniform vec2 uRes;uniform vec2 uOut;uniform float uTime;uniform float uDanger;uniform float uGlitch;uniform float uTint;uniform float uBright;uniform float uRetro;uniform float uFade;
varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
float b2(vec2 a){return a.x*2.0+a.y*3.0-4.0*a.x*a.y;}
float bayer(vec2 p){p=mod(p,4.0);return (4.0*b2(mod(p,2.0))+b2(floor(p/2.0)))/16.0;}
vec2 crt(vec2 uv){uv=uv*2.0-1.0;vec2 o=abs(uv.yx)/vec2(5.5,4.5);uv=uv+uv*o*o;return uv*0.5+0.5;}
void main(){
  vec2 uv=mix(vUv,crt(vUv),uRetro);
  if(uv.x<0.0||uv.y<0.0||uv.x>1.0||uv.y>1.0){gl_FragColor=vec4(0.0,0.0,0.0,1.0);return;}
  float t=uTime;
  float row=floor(uv.y*uRes.y);
  float wob=(h(vec2(row,floor(t*24.0)))-0.5)*(0.0012*uRetro+uDanger*0.006+uGlitch*0.05);
  float band=smoothstep(0.0,0.02,abs(fract(uv.y*0.6-t*0.07)-0.5)-0.47)*uRetro;
  wob+=band*0.006*(0.4+uDanger);
  float tear=step(0.92,h(vec2(floor(uv.y*18.0),floor(t*12.0))))*uGlitch*0.08;
  uv.x+=wob+tear;
  float ca=0.0018*uRetro+uDanger*0.005+uGlitch*0.02;
  vec3 c;c.r=texture2D(tDiffuse,uv+vec2(ca,0.0)).r;c.g=texture2D(tDiffuse,uv).g;c.b=texture2D(tDiffuse,uv-vec2(ca,0.0)).b;
  c*=uBright;
  c+=vec3(band*0.035);
  vec2 px=floor(uv*uRes);
  float L=18.0;
  c=mix(c,floor(c*L+bayer(px))/L,uRetro);
  c=mix(c,vec3(dot(c,vec3(0.3,0.59,0.11)))*vec3(1.0,0.93,0.82),0.18);
  c=mix(c,c*vec3(1.35,0.55,0.5),clamp(uDanger*0.55+uTint,0.0,1.0));
  float sl=0.78+0.22*sin(vUv.y*uOut.y*3.14159);
  c*=mix(1.0,sl,uRetro);
  c+=(h(vUv*uOut+fract(t)*91.0)-0.5)*(0.035+0.02*uRetro+uDanger*0.16+uGlitch*0.4);
  vec2 v=(vUv-0.5)*vec2(1.05,1.25);
  c*=1.0-smoothstep(0.3,0.95,length(v));
  c*=uFade;
  gl_FragColor=vec4(max(c,0.0),1.0);
}`;

export class RetroRenderer {
  constructor(canvas) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.setClearColor(0x030505);
    this.rt = new THREE.WebGLRenderTarget(4, 4, { minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter, depthBuffer: true });
    this.uniforms = {
      tDiffuse: { value: this.rt.texture }, uRes: { value: new THREE.Vector2(4, 4) }, uOut: { value: new THREE.Vector2(4, 4) },
      uTime: { value: 0 }, uDanger: { value: 0 }, uGlitch: { value: 0 }, uTint: { value: 0 }, uBright: { value: 1 }, uRetro: { value: 1 }, uFade: { value: 1 }
    };
    this.postScene = new THREE.Scene();
    this.postCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const mat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}',
      fragmentShader: FRAG, depthTest: false, depthWrite: false
    });
    this.postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat));
    this.retro = true; this.lowH = 224;
  }
  setShadows(on) {
    this.renderer.shadowMap.enabled = on;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.needsUpdate = true;
  }
  setRetro(on) { this.retro = on; this.uniforms.uRetro.value = on ? 1 : 0; }
  resize(camera) {
    const w = innerWidth, h = innerHeight;
    const outScale = this.retro ? Math.min(1, 720 / h) : Math.min(window.devicePixelRatio || 1, 1.5);
    const ow = Math.max(1, Math.round(w * outScale)), oh = Math.max(1, Math.round(h * outScale));
    this.renderer.setSize(ow, oh, false);
    const lh = this.retro ? this.lowH : oh, lw = this.retro ? Math.max(1, Math.round(this.lowH * w / h)) : ow;
    this.rt.setSize(lw, lh);
    this.rt.texture.minFilter = this.rt.texture.magFilter = this.retro ? THREE.NearestFilter : THREE.LinearFilter;
    this.uniforms.uRes.value.set(lw, lh);
    this.uniforms.uOut.value.set(ow, oh);
    if (this.retro) SNAP.value.set(lw / 3, lh / 3); else SNAP.value.set(1e5, 1e5);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  render(scene, camera) {
    const r = this.renderer;
    r.setRenderTarget(this.rt); r.render(scene, camera);
    r.setRenderTarget(null); r.render(this.postScene, this.postCam);
  }
}
