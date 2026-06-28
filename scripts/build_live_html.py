#!/usr/bin/env python3
"""build_live_html.py — emit a self-contained Three.js page (data inlined, works
from file://) that renders the spirit manifold as a living, breathing
bioluminescent nebula: spectral 3D positions, energy-coloured glowing nodes,
affinity filaments, Laplacian-eigenmode 'breathing', bloom, and slow orbit.
"""
import os, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = json.load(open(os.path.join(ROOT, "arxiv_submission", "viz", "spirit_data.json")))

HTML = """<!doctype html><html><head><meta charset="utf-8">
<title>Spirit in Physics — live manifold</title>
<style>html,body{margin:0;height:100%;background:#05060f;overflow:hidden;font-family:-apple-system,sans-serif}
#cap{position:fixed;top:14px;left:0;right:0;text-align:center;color:#eaf2ff;pointer-events:none}
#cap b{font-size:20px;font-weight:600}#cap div{color:#9fb8d6;font-size:12px;margin-top:4px}</style>
<script type="importmap">{"imports":{
"three":"https://unpkg.com/three@0.160.0/build/three.module.js",
"three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>
</head><body>
<div id="cap"><b>Spirit in Physics — the living manifold</b>
<div>graph-Laplacian eigenmode breathing · heat-kernel glow · affinity filaments · complexes as light</div></div>
<script type="module">
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';

const DATA = __DATA__;
const N = DATA.n;

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth, innerHeight); renderer.setPixelRatio(Math.min(2,devicePixelRatio));
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(0x05060f, 0.06);
const camera = new THREE.PerspectiveCamera(55, innerWidth/innerHeight, 0.1, 100);
camera.position.set(0, 0.4, 4.2);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 0.6;

// bioluminescent palette: void->indigo->teal->magenta->gold
const STOPS = [[0.02,0.02,0.06],[0.05,0.11,0.23],[0.06,0.34,0.42],[0.12,0.71,0.69],[0.69,0.23,0.56],[1.0,0.91,0.69]];
function pal(t){ t=Math.max(0,Math.min(1,t)); const x=t*(STOPS.length-1); const i=Math.floor(x), f=x-i;
  const a=STOPS[i], b=STOPS[Math.min(i+1,STOPS.length-1)];
  return [a[0]+(b[0]-a[0])*f, a[1]+(b[1]-a[1])*f, a[2]+(b[2]-a[2])*f]; }

// round glow sprite
function glowTex(){ const s=128,c=document.createElement('canvas'); c.width=c.height=s;
  const g=c.getContext('2d'), rg=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);
  rg.addColorStop(0,'rgba(255,255,255,1)'); rg.addColorStop(0.25,'rgba(255,255,255,0.65)');
  rg.addColorStop(0.55,'rgba(255,255,255,0.18)'); rg.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=rg; g.fillRect(0,0,s,s); const t=new THREE.CanvasTexture(c); return t; }

const base = new Float32Array(N*3), pos = new Float32Array(N*3),
      col = new Float32Array(N*3), siz = new Float32Array(N), baseCol = new Float32Array(N*3), E = new Float32Array(N);
for(let i=0;i<N;i++){ const nd=DATA.nodes[i];
  base[3*i]=nd.p[0]*2.2; base[3*i+1]=nd.p[1]*2.2; base[3*i+2]=nd.p[2]*2.2;
  E[i]=nd.e; const c=pal(0.4+0.6*nd.e); baseCol[3*i]=c[0]; baseCol[3*i+1]=c[1]; baseCol[3*i+2]=c[2];
  siz[i]=14+46*nd.e; }
pos.set(base); col.set(baseCol);

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(pos,3));
geo.setAttribute('color', new THREE.BufferAttribute(col,3));
geo.setAttribute('size', new THREE.BufferAttribute(siz,1));
const mat = new THREE.ShaderMaterial({
  uniforms:{tex:{value:glowTex()}}, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending,
  vertexShader:`attribute float size; attribute vec3 color; varying vec3 vC;
    void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0);
      gl_PointSize=size*(300.0/-mv.z); gl_Position=projectionMatrix*mv; }`,
  fragmentShader:`uniform sampler2D tex; varying vec3 vC;
    void main(){ vec4 t=texture2D(tex,gl_PointCoord); gl_FragColor=vec4(vC,1.0)*t; }`});
const points = new THREE.Points(geo, mat); scene.add(points);

// affinity filaments
const ep = new Float32Array(DATA.edges.length*6), ec = new Float32Array(DATA.edges.length*6);
DATA.edges.forEach((e,k)=>{ for(let v=0;v<2;v++){ const id=e[v]; for(let d=0;d<3;d++){ ep[6*k+3*v+d]=base[3*id+d];}
  ec[6*k+3*v+0]=0.4; ec[6*k+3*v+1]=0.78; ec[6*k+3*v+2]=0.95; } });
const lg = new THREE.BufferGeometry();
lg.setAttribute('position', new THREE.BufferAttribute(ep,3));
lg.setAttribute('color', new THREE.BufferAttribute(ec,3));
const lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({vertexColors:true, transparent:true,
  opacity:0.16, blending:THREE.AdditiveBlending, depthWrite:false})); scene.add(lines);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight), 1.3, 0.7, 0.0);
composer.addPass(bloom);

const modes = DATA.modes;
const clock = new THREE.Clock();
function animate(){ requestAnimationFrame(animate);
  const t = clock.getElapsedTime();
  for(let i=0;i<N;i++){
    let breath=0; for(const m of modes){ breath += m.vec[i]*Math.sin(2*Math.PI*m.f*t); }
    breath *= 0.5; // amplitude
    const nx=base[3*i], ny=base[3*i+1], nz=base[3*i+2];
    const r=Math.hypot(nx,ny,nz)+1e-6; const k=1.0+0.10*breath; // radial pulse
    pos[3*i]=nx*k; pos[3*i+1]=ny*k; pos[3*i+2]=nz*k;
    const g=0.55+0.65*(0.5+0.5*breath); // brightness breathing
    col[3*i]=baseCol[3*i]*g; col[3*i+1]=baseCol[3*i+1]*g; col[3*i+2]=baseCol[3*i+2]*g;
  }
  geo.attributes.position.needsUpdate=true; geo.attributes.color.needsUpdate=true;
  DATA.edges.forEach((e,kk)=>{ for(let v=0;v<2;v++){ const id=e[v]; for(let d=0;d<3;d++){ ep[6*kk+3*v+d]=pos[3*id+d]; } } });
  lg.attributes.position.needsUpdate=true;
  controls.update(); composer.render();
}
animate();
addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight); composer.setSize(innerWidth,innerHeight); });
</script></body></html>"""

out = os.path.join(ROOT, "arxiv_submission", "viz", "spirit_live.html")
open(out, "w").write(HTML.replace("__DATA__", json.dumps(DATA["shared"])))
print("wrote", out)
