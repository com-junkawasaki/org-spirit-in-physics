#!/usr/bin/env python3
"""build_wall_html.py — immersive-wall edition: ultra-wide/fullscreen, parallax
depth layers, sonified Laplacian eigenvalues, PLUS (a) multiple colour palettes
and (b) an auto-advancing tour through the shared manifold and each individual
spirit space (crossfade + label). Self-contained; works from file://.

Controls: click = enter (sound+fullscreen) · ←/→ = prev/next space ·
space = pause/resume tour · 1-4 = palette · m = mute.
"""
import os, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = json.load(open(os.path.join(ROOT, "arxiv_submission", "viz", "spirit_data.json")))

HTML = r"""<!doctype html><html><head><meta charset="utf-8">
<title>Spirit in Physics — immersive wall</title>
<style>html,body{margin:0;height:100%;background:#03040a;overflow:hidden;font-family:-apple-system,sans-serif;cursor:crosshair}
#cap{position:fixed;top:3vh;left:0;right:0;text-align:center;color:#eaf2ff;pointer-events:none;text-shadow:0 0 18px #0bf}
#cap b{font-size:2.0vw;font-weight:600;letter-spacing:.04em}
#lab{position:fixed;bottom:4vh;left:0;right:0;text-align:center;color:#bfe9ff;font-size:1.4vw;letter-spacing:.18em;
  text-transform:uppercase;pointer-events:none;text-shadow:0 0 22px #0bf;transition:opacity .5s}
#hint{position:fixed;bottom:1.4vh;left:0;right:0;text-align:center;color:#5f7596;font-size:.8vw;pointer-events:none}
#ov{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle,#06122a,#03040a);
color:#dfeaff;z-index:9;transition:opacity 1.2s}#ov h1{font-size:2.4vw;font-weight:600;margin:0;text-align:center}
#ov p{color:#8fb6d6;font-size:1.0vw;margin-top:1vh;text-align:center}</style>
<script type="importmap">{"imports":{
"three":"https://unpkg.com/three@0.160.0/build/three.module.js",
"three/addons/":"https://unpkg.com/three@0.160.0/examples/jsm/"}}</script>
</head><body>
<div id="cap"><b>Spirit in Physics</b></div>
<div id="lab"></div>
<div id="hint">click = enter · ←/→ space · space = pause tour · 1–4 = palette · m = mute</div>
<div id="ov"><div><h1>enter the spirit space</h1><p>click to begin — sound on · a tour of the shared manifold and each individual spirit</p></div></div>
<script type="module">
import * as THREE from 'three';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
const DATA=__DATA__;
const SPACES=[DATA.shared, ...DATA.individuals];
const maxN=Math.max(...SPACES.map(s=>s.n));
const maxE=Math.max(...SPACES.map(s=>s.edges.length));

// (a) palettes
const PALS={
 aurora:[[0.02,0.02,0.06],[0.05,0.11,0.23],[0.06,0.34,0.42],[0.12,0.71,0.69],[0.69,0.23,0.56],[1.0,0.91,0.69]],
 ember :[[0.02,0.01,0.01],[0.18,0.04,0.03],[0.55,0.13,0.04],[0.92,0.42,0.08],[1.0,0.74,0.27],[1.0,0.97,0.85]],
 ice   :[[0.01,0.02,0.05],[0.04,0.10,0.26],[0.10,0.40,0.66],[0.36,0.78,0.95],[0.80,0.93,1.0],[1.0,0.85,0.95]],
 verdant:[[0.01,0.03,0.02],[0.03,0.16,0.10],[0.05,0.40,0.26],[0.30,0.74,0.42],[0.78,0.92,0.30],[1.0,0.97,0.7]]};
const PKEYS=['aurora','ember','ice','verdant']; let pk=0;
function pal(t){t=Math.max(0,Math.min(1,t));const S=PALS[PKEYS[pk]];const x=t*(S.length-1),i=Math.floor(x),f=x-i;
  const a=S[i],b=S[Math.min(i+1,S.length-1)];return [a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,a[2]+(b[2]-a[2])*f];}

const renderer=new THREE.WebGLRenderer({antialias:true});
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(2,devicePixelRatio));
document.body.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x03040a,0.045);
const camera=new THREE.PerspectiveCamera(60,innerWidth/innerHeight,0.1,200);camera.position.set(0,0.3,4.4);

function glowTex(){const s=128,c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d');
  const rg=g.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);rg.addColorStop(0,'rgba(255,255,255,1)');
  rg.addColorStop(.25,'rgba(255,255,255,.6)');rg.addColorStop(.55,'rgba(255,255,255,.16)');rg.addColorStop(1,'rgba(255,255,255,0)');
  g.fillStyle=rg;g.fillRect(0,0,s,s);return new THREE.CanvasTexture(c);}
const TEX=glowTex();
function pmat(){return new THREE.ShaderMaterial({uniforms:{tex:{value:TEX}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`attribute float size;attribute vec3 color;varying vec3 vC;void main(){vC=color;vec4 mv=modelViewMatrix*vec4(position,1.0);
    gl_PointSize=size*(320.0/-mv.z);gl_Position=projectionMatrix*mv;}`,
  fragmentShader:`uniform sampler2D tex;varying vec3 vC;void main(){gl_FragColor=vec4(vC,1.0)*texture2D(tex,gl_PointCoord);}`});}

// background dust (parallax)
const BG=2200;const bp=new Float32Array(BG*3),bc=new Float32Array(BG*3),bs=new Float32Array(BG);
for(let i=0;i<BG;i++){const r=14+Math.random()*16,th=Math.random()*6.283,ph=Math.acos(2*Math.random()-1);
  bp[3*i]=r*Math.sin(ph)*Math.cos(th);bp[3*i+1]=r*Math.sin(ph)*Math.sin(th);bp[3*i+2]=r*Math.cos(ph);
  bc[3*i]=0.1;bc[3*i+1]=0.16;bc[3*i+2]=0.22;bs[3*i]=4+9*Math.random();}
const bgG=new THREE.BufferGeometry();bgG.setAttribute('position',new THREE.BufferAttribute(bp,3));
bgG.setAttribute('color',new THREE.BufferAttribute(bc,3));bgG.setAttribute('size',new THREE.BufferAttribute(bs,1));
const dust=new THREE.Points(bgG,pmat());scene.add(dust);

// nebula (data) — preallocated to maxN / maxE
const base=new Float32Array(maxN*3),pos=new Float32Array(maxN*3),col=new Float32Array(maxN*3),
      bcol=new Float32Array(maxN*3),siz=new Float32Array(maxN),en=new Float32Array(maxN);
const geo=new THREE.BufferGeometry();
geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
geo.setAttribute('color',new THREE.BufferAttribute(col,3));
geo.setAttribute('size',new THREE.BufferAttribute(siz,1));
scene.add(new THREE.Points(geo,pmat()));
const ep=new Float32Array(maxE*6),ec=new Float32Array(maxE*6);
const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.BufferAttribute(ep,3));
lg.setAttribute('color',new THREE.BufferAttribute(ec,3));
const lines=new THREE.LineSegments(lg,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:0.14,blending:THREE.AdditiveBlending,depthWrite:false}));
scene.add(lines);

let cur={n:0,ne:0,modes:[],edges:[]};
function applyPalette(){for(let i=0;i<cur.n;i++){const c=pal(0.4+0.6*en[i]);bcol[3*i]=c[0];bcol[3*i+1]=c[1];bcol[3*i+2]=c[2];}}
function loadSpace(sp){cur.n=sp.n;cur.modes=sp.modes;cur.edges=sp.edges;cur.ne=sp.edges.length;
  for(let i=0;i<sp.n;i++){base[3*i]=sp.nodes[i].p[0]*2.3;base[3*i+1]=sp.nodes[i].p[1]*2.3;base[3*i+2]=sp.nodes[i].p[2]*2.3;
    en[i]=sp.nodes[i].e;siz[i]=16+58*en[i];}
  applyPalette();
  geo.setDrawRange(0,sp.n);geo.attributes.size.needsUpdate=true;
  lg.setDrawRange(0,sp.edges.length*2);
  document.getElementById('lab').textContent=sp.label;
  if(audio)retune();}

const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth,innerHeight),1.5,0.8,0.0));

// sonification
let audio=null,voices=[],muted=false,master=null;
function startAudio(){if(audio)return;audio=new (window.AudioContext||window.webkitAudioContext)();
  master=audio.createGain();master.gain.value=0;
  const lp=audio.createBiquadFilter();lp.type='lowpass';lp.frequency.value=1400;
  const dly=audio.createDelay();dly.delayTime.value=0.42;const fb=audio.createGain();fb.gain.value=0.34;
  dly.connect(fb);fb.connect(dly);master.connect(lp);lp.connect(audio.destination);lp.connect(dly);dly.connect(audio.destination);
  for(let k=0;k<7;k++){const o=audio.createOscillator();o.type=k%2?'sine':'triangle';o.detune.value=(Math.random()-0.5)*8;
    const g=audio.createGain();g.gain.value=0;o.connect(g);g.connect(master);o.start();voices.push({o,g});}
  master.gain.linearRampToValueAtTime(0.16,audio.currentTime+3);retune();}
function retune(){const penta=[0,2,4,7,9,12,14],base=146.83;
  cur.modes.forEach((m,k)=>{if(voices[k])voices[k].o.frequency.setTargetAtTime(base*Math.pow(2,penta[k%penta.length]/12)*(0.5+m.lambda*0.5),audio.currentTime,0.3);});}

// tour state
let idx=0, paused=false, fade=1, transitioning=false, tTrans=0;
loadSpace(SPACES[0]);
function advance(dir){if(transitioning)return;transitioning=true;tTrans=0;_next=(idx+dir+SPACES.length)%SPACES.length;}
let _next=0;
function tourTick(dt){ if(paused||transitioning)return; tourT+=dt; if(tourT>14){tourT=0;advance(1);} }
let tourT=0;

let mx=0,my=0;addEventListener('mousemove',e=>{mx=e.clientX/innerWidth-0.5;my=e.clientY/innerHeight-0.5;});
addEventListener('keydown',e=>{ if(e.key==='ArrowRight')advance(1); else if(e.key==='ArrowLeft')advance(-1);
  else if(e.key===' '){paused=!paused;tourT=0;} else if(e.key==='m'){muted=!muted;if(master)master.gain.setTargetAtTime(muted?0:0.16,audio.currentTime,0.3);}
  else if(['1','2','3','4'].includes(e.key)){pk=+e.key-1;applyPalette();} });

const clock=new THREE.Clock();
function animate(){requestAnimationFrame(animate);const dt=clock.getDelta(),t=clock.elapsedTime;
  tourTick(dt);
  if(transitioning){tTrans+=dt;const half=0.7;
    if(tTrans<half){fade=1-tTrans/half;} else {if(_next!==idx){idx=_next;loadSpace(SPACES[idx]);} fade=Math.min(1,(tTrans-half)/half);}
    if(tTrans>=2*half){transitioning=false;fade=1;}}
  for(let i=0;i<cur.n;i++){let br=0;for(const m of cur.modes)br+=m.vec[i]*Math.sin(2*Math.PI*m.f*t);br*=0.5;
    const k=1+0.11*br;pos[3*i]=base[3*i]*k;pos[3*i+1]=base[3*i+1]*k;pos[3*i+2]=base[3*i+2]*k;
    const g=(0.5+0.7*(0.5+0.5*br))*fade;col[3*i]=bcol[3*i]*g;col[3*i+1]=bcol[3*i+1]*g;col[3*i+2]=bcol[3*i+2]*g;}
  geo.attributes.position.needsUpdate=true;geo.attributes.color.needsUpdate=true;
  for(let kk=0;kk<cur.ne;kk++){const e=cur.edges[kk];for(let v=0;v<2;v++){const id=e[v];for(let d=0;d<3;d++)ep[6*kk+3*v+d]=pos[3*id+d];
    ec[6*kk+3*v]=0.4*fade;ec[6*kk+3*v+1]=0.78*fade;ec[6*kk+3*v+2]=0.95*fade;}}
  lg.attributes.position.needsUpdate=true;lg.attributes.color.needsUpdate=true;
  dust.rotation.y=t*0.012;
  if(audio&&!muted){voices.forEach((v,k)=>{const m=cur.modes[k];if(!m){v.g.gain.setTargetAtTime(0,audio.currentTime,0.2);return;}
    const env=0.5+0.5*Math.sin(2*Math.PI*m.f*t);v.g.gain.setTargetAtTime(0.06*env*(0.5+0.5*m.lambda)*fade,audio.currentTime,0.2);});}
  camera.position.x+=((Math.sin(t*0.07)*0.6+mx*1.4)-camera.position.x)*0.03;
  camera.position.y+=((0.3+Math.cos(t*0.05)*0.4-my*0.9)-camera.position.y)*0.03;
  camera.lookAt(0,0,0);composer.render();}
animate();

const ov=document.getElementById('ov');
ov.addEventListener('click',()=>{startAudio();ov.style.opacity=0;setTimeout(()=>ov.style.display='none',1200);
  if(document.documentElement.requestFullscreen)document.documentElement.requestFullscreen().catch(()=>{});});
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);composer.setSize(innerWidth,innerHeight);});
</script></body></html>"""

out = os.path.join(ROOT, "arxiv_submission", "viz", "spirit_wall.html")
open(out, "w").write(HTML.replace("__DATA__", json.dumps(DATA)))
print("wrote", out)
