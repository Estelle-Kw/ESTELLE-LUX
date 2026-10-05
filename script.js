import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const MODEL_URL = './redbull.glb';

/* ---------- Loading state (real GLB progress, never stuck) ---------- */
let realProgress = 0;       // 0..1 from GLTFLoader
let modelDone = false;      // true on success OR failure
let gltfData = null;
let modelFailed = false;

/* ---------- Viewer factory ---------- */
function createViewer(canvas) {
  const wrap = canvas.parentElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 200);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.1;
  controls.enablePan = false;

  // Cinematic lights: key (white), red rim, blue fill, red glow
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.bias = -0.0004;
  scene.add(key);
  const rim = new THREE.PointLight(0xff2d46, 40, 20, 2); rim.position.set(-3, 2, -3); scene.add(rim);
  const fill = new THREE.PointLight(0x3a5bff, 18, 20, 2); fill.position.set(3, 1, -2); scene.add(fill);
  const glow = new THREE.PointLight(0xe3122c, 10, 10, 2); glow.position.set(0, -0.2, 1.5); scene.add(glow);

  // Floor: shadow catcher + faint reflective ring
  const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.45 }));
  shadowFloor.rotation.x = -Math.PI / 2; shadowFloor.receiveShadow = true; scene.add(shadowFloor);
  const mirror = new THREE.Mesh(
    new THREE.CircleGeometry(1.6, 64),
    new THREE.MeshStandardMaterial({ color: 0x0a0a10, metalness: 1, roughness: 0.18, transparent: true, opacity: 0.55 })
  );
  mirror.rotation.x = -Math.PI / 2; mirror.position.y = -0.002; scene.add(mirror);

  const v = { renderer, scene, camera, controls, wrap, canvas, key, mirror, shadowFloor, visible: true, model: null, home: null };

  v.setModel = (obj) => {
    // auto-fit: center, put base on floor, scale to target height
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const target = 2.4;
    const s = target / (Math.max(size.x, size.y, size.z) || 1);
    obj.scale.multiplyScalar(s);
    const b2 = new THREE.Box3().setFromObject(obj);
    const c2 = b2.getCenter(new THREE.Vector3());
    obj.position.x -= c2.x; obj.position.z -= c2.z; obj.position.y -= b2.min.y;
    obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; if (o.material) o.material.envMapIntensity = 1.3; } });
    scene.add(obj);
    v.model = obj;
    const h = b2.getSize(new THREE.Vector3());
    const hh = h.y, radius = Math.max(h.x, h.z) / 2;
    key.shadow.camera.left = key.shadow.camera.bottom = -3; key.shadow.camera.right = key.shadow.camera.top = 3;
    key.shadow.camera.far = 20;
    mirror.scale.setScalar(Math.max(0.6, radius * 1.8));
    controls.target.set(0, hh * 0.5, 0);
    v.fit();
    controls.minDistance = v.dist * 0.45; controls.maxDistance = v.dist * 2.2;
    controls.minPolarAngle = 0.25; controls.maxPolarAngle = Math.PI / 2 + 0.15;
    v.height = hh;
  };

  v.fit = () => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    const hh = v.height || 2.4;
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const aspect = w / h;
    const distV = (hh * 0.75) / Math.tan(fov / 2);
    const distH = (hh * 0.45) / (Math.tan(fov / 2) * aspect);
    v.dist = Math.max(distV, distH);
    camera.position.set(v.dist * 0.35, hh * 0.62, v.dist);
    camera.lookAt(controls.target);
    controls.update();
    controls.saveState();
  };

  v.resize = () => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  };
  v.resize();

  // UI buttons
  const [btnRot, btnReset] = [$('[data-act=rotate]', wrap), $('[data-act=reset]', wrap)];
  btnRot.addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; btnRot.classList.toggle('on', controls.autoRotate); });
  btnReset.addEventListener('click', () => { controls.reset(); controls.autoRotate = true; btnRot.classList.add('on'); });

  // pause rotation briefly while interacting
  controls.addEventListener('start', () => { v.interacting = true; });
  controls.addEventListener('end', () => { v.interacting = false; });

  new IntersectionObserver(([e]) => { v.visible = e.isIntersecting; }, { threshold: 0.01 }).observe(wrap);
  new ResizeObserver(() => { v.resize(); if (v.model) { const keepAuto = controls.autoRotate; v.fit(); controls.autoRotate = keepAuto; } }).observe(wrap);

  return v;
}

const viewers = [];
function showError(v) { $('.v-err', v.wrap).hidden = false; }

try {
  viewers.push(createViewer($('#cv1')), createViewer($('#cv2')));
} catch (e) {
  console.error('WebGL unavailable', e);
  $$('.v-err').forEach(el => el.hidden = false);
  modelFailed = true;
}

/* ---------- Load GLB once (starts immediately; loader screen shows progress) ---------- */
function loadModel() {
  if (modelFailed) { modelDone = true; return; }
  new GLTFLoader().load(
    MODEL_URL,
    (gltf) => {
      gltfData = gltf;
      try {
        viewers.forEach((v, i) => v.setModel(i === 0 ? gltf.scene : gltf.scene.clone(true)));
      } catch (e) { console.error(e); modelFailed = true; viewers.forEach(showError); }
      realProgress = 1; modelDone = true;
    },
    (xhr) => { if (xhr.lengthComputable && xhr.total) realProgress = Math.min(0.99, xhr.loaded / xhr.total); else realProgress = Math.min(0.9, realProgress + 0.05); },
    (err) => { console.error('GLB load failed', err); modelFailed = true; modelDone = true; viewers.forEach(showError); }
  );
}
loadModel();

/* ---------- Render loop ---------- */
const clock = new THREE.Clock();
function tick() {
  requestAnimationFrame(tick);
  clock.getDelta();
  viewers.forEach(v => {
    if (!v.visible || !v.model) return;
    v.controls.update();
    v.renderer.render(v.scene, v.camera);
  });
}
tick();

/* ---------- Opening → Loading → Site ---------- */
const opening = $('#opening'), loader = $('#loader'), flash = $('#flash');
const ldNum = $('#ldNum'), ldFill = $('#ldFill'), ldLabel = $('#ldLabel'), ldReady = $('#ldReady');

$('#startBtn').addEventListener('click', () => {
  opening.classList.add('leaving');
  flash.classList.add('go');
  setTimeout(() => { loader.classList.remove('hidden'); opening.classList.add('hidden'); runLoader(); }, 650);
});

function runLoader() {
  const t0 = performance.now();
  let shown = 0, last = t0, finished = false;
  const MIN_MS = 2600, MAX_MS = 9000; // never hang: force-complete after MAX_MS
  const labels = [[0, 'INITIALIZING EXPERIENCE'], [30, 'LOADING 3D ASSET'], [65, 'CALIBRATING LIGHTS'], [92, 'FINALIZING']];

  function frame(now) {
    const dt = Math.min(now - last, 64); last = now;
    const elapsed = now - t0;
    // target: real progress mixed with a time-based floor so it always advances
    const timeTarget = Math.min(0.9, elapsed / MAX_MS);
    let target = Math.max(realProgress * 100, timeTarget * 100 * (modelDone ? 1 : 0.85));
    if (modelDone && elapsed >= MIN_MS) target = 100;
    if (elapsed >= MAX_MS) target = 100;
    if (!modelDone && target > 96) target = 96;
    shown += Math.min(target - shown, dt * 0.055 + (target - shown) * 0.04); // smooth ease
    if (shown > 99.6 && target >= 100) shown = 100;
    const n = Math.floor(shown);
    ldNum.textContent = String(n).padStart(2, '0');
    ldFill.style.width = shown + '%';
    for (const [p, t] of labels) if (n >= p) ldLabel.textContent = t;
    if (shown >= 100 && !finished) { finished = true; ldLabel.textContent = 'COMPLETE'; ldReady.classList.add('show'); setTimeout(enterSite, 900); return; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function enterSite() {
  loader.classList.add('hidden');
  document.body.classList.remove('locked');
  window.scrollTo(0, 0);
  viewers.forEach(v => { v.resize(); if (v.model) v.fit(); });
  setTimeout(() => $$('.hero .reveal').forEach((el, i) => setTimeout(() => el.classList.add('in'), i * 140)), 250);
}

/* ---------- Nav ---------- */
const nav = $('#nav'), burger = $('#burger'), menu = $('#menu');
const onScroll = () => nav.classList.toggle('glass', window.scrollY > 40);
window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
burger.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  burger.setAttribute('aria-expanded', open);
});
$$('a', menu).forEach(a => a.addEventListener('click', () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', 'false'); }));

/* ---------- Scroll reveal ---------- */
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.12 });
$$('.reveal').forEach(el => { if (!el.closest('.hero')) io.observe(el); });

/* ---------- Flavor cards (tap on touch) ---------- */
$$('.card').forEach(c => {
  c.addEventListener('click', () => { const was = c.classList.contains('open'); $$('.card.open').forEach(o => o.classList.remove('open')); if (!was) c.classList.add('open'); });
  c.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); c.click(); } });
});

/* ---------- Facts tabs ---------- */
const FACTS = {
  orig: { caf: '75–80', tau: '1,000', sug: '27', en: '≈117' },
  free: { caf: '75–80', tau: '1,000', sug: '0', en: '≈8' }
};
$$('.tabs button').forEach(b => b.addEventListener('click', () => {
  $$('.tabs button').forEach(x => x.classList.remove('on')); b.classList.add('on');
  const d = FACTS[b.dataset.f];
  $('#fCaf').textContent = d.caf; $('#fTau').textContent = d.tau; $('#fSug').textContent = d.sug; $('#fEn').textContent = d.en;
}));
