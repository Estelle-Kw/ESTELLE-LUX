import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const isMobile = matchMedia('(max-width:720px)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
const PR = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2);

/* ---------- Model loading (real progress) ---------- */
let gltf = null, loadError = false, pct = 0;
const subs = [];
const setPct = p => { pct = p; $('#ldFill').style.width = p + '%'; $('#ldPct').textContent = Math.round(p); };

const modelReady = new Promise(res => {
  new GLTFLoader().load('./redbull.glb',
    g => { gltf = g; res(); },
    e => { if (e.lengthComputable) setPct(Math.min(99, e.loaded / e.total * 100)); },
    err => { console.error('GLB load failed:', err); loadError = true; res(); });
});

/* ---------- Viewer ---------- */
class Viewer {
  constructor(canvas, rotSpeed = 1.2) {
    this.canvas = canvas; this.wrap = canvas.parentElement;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(PR);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; pm.dispose();
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
    // cinematic red / gold lights
    const key = new THREE.SpotLight(0xffffff, 60, 0, 0.5, 0.6); key.position.set(3, 5, 4); key.castShadow = true; key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0005;
    const red = new THREE.PointLight(0xdb0a2c, 30, 12); red.position.set(-3, 1, -2);
    const gold = new THREE.PointLight(0xc9a45c, 18, 12); gold.position.set(3, 0, -3);
    this.scene.add(key, red, gold);
    this.controls = new OrbitControls(this.camera, canvas);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: 0.07, enablePan: false, autoRotate: true, autoRotateSpeed: rotSpeed, rotateSpeed: 0.8 });
    canvas.style.touchAction = 'pan-y'; // allow vertical page scroll over the model (OrbitControls sets 'none')
    this.controls.addEventListener('start', () => this.controls.autoRotate = false);
    this.active = true; this.visible = false;
    this.anim = null;
    new IntersectionObserver(([e]) => this.visible = e.isIntersecting, { threshold: 0.01 }).observe(this.wrap);
    new ResizeObserver(() => this.resize()).observe(this.wrap);
    this.resize();
    $$('[data-act]', this.wrap).forEach(b => b.addEventListener('click', () => {
      if (b.dataset.act === 'auto') { this.controls.autoRotate = !this.controls.autoRotate; this.syncBtn(); }
      else this.reset();
    }));
    this.controls.addEventListener('start', () => this.syncBtn());
    this.loop = this.loop.bind(this); this.renderer.setAnimationLoop(this.loop);
  }
  syncBtn() { const b = $('[data-act=auto]', this.wrap); b && b.classList.toggle('active', this.controls.autoRotate); }
  resize() {
    const w = this.wrap.clientWidth, h = this.wrap.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.model) this.fit(false);
  }
  setModel(src) {
    this.model = src.clone(true);
    this.model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    // auto-scale: normalise height to 2 units, centre at origin
    const box = new THREE.Box3().setFromObject(this.model), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const s = 2 / size.y; this.model.scale.setScalar(s);
    this.model.position.sub(c.multiplyScalar(s));
    this.pivot = new THREE.Group(); this.pivot.add(this.model); this.scene.add(this.pivot);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(2.4, 48), new THREE.ShadowMaterial({ opacity: 0.45 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -1.02; floor.receiveShadow = true; this.scene.add(floor);
    this.fit(true);
  }
  fit(snap) {
    const fov = THREE.MathUtils.degToRad(this.camera.fov), a = this.camera.aspect;
    const dH = 1.35 / Math.tan(fov / 2), dW = 0.9 / (Math.tan(fov / 2) * a);
    const d = Math.max(dH, dW) * 1.05;
    this.home = { pos: new THREE.Vector3(0, 0.25, d), tgt: new THREE.Vector3(0, 0, 0) };
    this.controls.minDistance = d * 0.45; this.controls.maxDistance = d * 1.8;
    this.controls.minPolarAngle = 0.25; this.controls.maxPolarAngle = Math.PI * 0.62;
    if (snap) { this.camera.position.copy(this.home.pos); this.controls.target.copy(this.home.tgt); this.controls.update(); }
  }
  reset() {
    const from = { p: this.camera.position.clone(), t: this.controls.target.clone() }, t0 = performance.now();
    this.controls.autoRotate = false; this.syncBtn();
    this.anim = now => {
      const k = Math.min(1, (now - t0) / 900), e = 1 - Math.pow(1 - k, 3);
      this.camera.position.lerpVectors(from.p, this.home.pos, e);
      this.controls.target.lerpVectors(from.t, this.home.tgt, e);
      if (k >= 1) { this.anim = null; this.controls.autoRotate = true; this.syncBtn(); }
    };
  }
  loop(now) {
    if (!this.visible || !this.model) return;
    if (this.anim) this.anim(now);
    this.controls.update(); this.renderer.render(this.scene, this.camera);
  }
  dispose() { this.renderer.setAnimationLoop(null); this.renderer.dispose(); }
}

function initViewers() {
  const wraps = $$('.viewer-wrap');
  if (loadError || !gltf) { wraps.forEach(w => { $('.v-fallback', w).hidden = false; $('.v-ui', w).hidden = true; $('canvas', w).hidden = true; }); return; }
  try {
    const v1 = new Viewer($('#heroCanvas'), 1.2); v1.setModel(gltf.scene);
    const v2 = new Viewer($('#stageCanvas'), 1.6); v2.setModel(gltf.scene);
    addEventListener('pagehide', () => { v1.dispose(); v2.dispose(); });
    // subtle mouse parallax on hero glow
    const glow = $('.hero-glow');
    if (!isMobile) addEventListener('mousemove', e => { glow.style.translate = `${(e.clientX / innerWidth - .5) * -30}px ${(e.clientY / innerHeight - .5) * -20}px`; }, { passive: true });
  } catch (err) {
    console.error(err);
    wraps.forEach(w => { $('.v-fallback', w).hidden = false; $('.v-ui', w).hidden = true; $('canvas', w).hidden = true; });
  }
}

/* ---------- Start experience ---------- */
const intro = $('#intro'), loader = $('#loader');
$('#startBtn').addEventListener('click', async () => {
  $('#startBtn').disabled = true;
  intro.classList.add('go');
  loader.classList.add('show');
  await new Promise(r => setTimeout(r, 1300));
  await modelReady;
  // smooth count to 100
  await new Promise(r => { const t = setInterval(() => { setPct(Math.min(100, pct + 4)); if (pct >= 100) { clearInterval(t); r(); } }, 30); });
  if (loadError) { $('#ldStatus').textContent = '3D PRODUCT UNAVAILABLE — CONTINUING'; }
  else { $('#ldStatus').textContent = 'SYSTEM READY'; }
  loader.classList.add('ready');
  initViewers();
  await new Promise(r => setTimeout(r, 900));
  intro.classList.add('done'); loader.classList.remove('show');
  document.body.classList.remove('locked'); document.body.classList.add('in');
  setTimeout(() => { intro.remove(); loader.remove(); }, 1800);
});

/* ---------- Nav ---------- */
const nav = $('#nav'), menu = $('#menu'), burger = $('#burger');
const onScroll = () => nav.classList.toggle('glass', scrollY > 40);
addEventListener('scroll', onScroll, { passive: true }); onScroll();
burger.addEventListener('click', () => { const o = menu.classList.toggle('open'); burger.classList.toggle('open', o); burger.setAttribute('aria-expanded', o); });
$$('#menu a').forEach(a => a.addEventListener('click', () => { menu.classList.remove('open'); burger.classList.remove('open'); }));

/* ---------- Scroll reveal ---------- */
const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('vis'); io.unobserve(e.target); } }), { threshold: 0.15 });
$$('.reveal').forEach((el, i) => { el.style.transitionDelay = (i % 4) * 90 + 'ms'; io.observe(el); });

/* ---------- Sizes & flavor cards ---------- */
$$('.size').forEach(b => b.addEventListener('click', () => {
  $$('.size').forEach(x => x.classList.remove('active')); b.classList.add('active'); $('#sizeInfo').textContent = b.dataset.t;
}));
$$('.flv').forEach(c => c.addEventListener('click', () => { const o = c.classList.contains('open'); $$('.flv').forEach(x => x.classList.remove('open')); if (!o) c.classList.add('open'); }));
