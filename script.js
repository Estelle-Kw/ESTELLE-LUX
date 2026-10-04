import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const MODEL_URL = './redbull.glb';
const canvas = document.getElementById('viewer');
const holder = canvas.parentElement;
const isMobile = matchMedia('(max-width:820px)').matches;

/* ---------- Renderer / Scene ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.9;

const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
const HOME_POS = new THREE.Vector3(0, 0.25, 6.2);
const HOME_TARGET = new THREE.Vector3(0, 0, 0);
camera.position.copy(HOME_POS);

/* ---------- Lights ---------- */
const key = new THREE.SpotLight(0xffffff, 120, 20, 0.5, 0.6, 2);
key.position.set(3, 5, 4); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024); key.shadow.bias = -0.0003;
scene.add(key);
const rim = new THREE.PointLight(0xe10600, 14, 12); rim.position.set(-3.5, 1.5, -2.5); scene.add(rim);
const gold = new THREE.PointLight(0xd4af37, 10, 12); gold.position.set(3.5, -0.5, -2.5); scene.add(gold);
scene.add(new THREE.AmbientLight(0xffffff, 0.15));

/* ---------- Ground shadow ---------- */
const ground = new THREE.Mesh(new THREE.CircleGeometry(4, 48), new THREE.ShadowMaterial({ opacity: 0.45 }));
ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

/* ---------- Controls ---------- */
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.dampingFactor = 0.07;
controls.enablePan = false;
controls.minDistance = 3.2; controls.maxDistance = 9;
controls.minPolarAngle = 0.35; controls.maxPolarAngle = Math.PI - 0.5;
controls.autoRotate = true; controls.autoRotateSpeed = 1.6;
controls.target.copy(HOME_TARGET);
canvas.style.touchAction = 'pan-y';

/* ---------- Model ---------- */
const floatGroup = new THREE.Group(); scene.add(floatGroup);

const manager = new THREE.LoadingManager();
const fill = document.getElementById('loader-fill');
const text = document.getElementById('loader-text');
const loaderEl = document.getElementById('loader');
const setProgress = p => { p = Math.min(100, Math.round(p)); fill.style.width = p + '%'; text.textContent = `LOADING ${p}%`; };

new GLTFLoader(manager).load(
  MODEL_URL,
  gltf => {
    const model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const s = 2.2 / size.y;
    model.scale.setScalar(s);
    box.setFromObject(model);
    model.position.sub(box.getCenter(new THREE.Vector3()));
    model.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        if (o.material.map) o.material.map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      }
    });
    floatGroup.add(model);
    ground.position.y = -size.y * s / 2 - 0.02;
    setProgress(100);
    setTimeout(() => { loaderEl.classList.add('done'); document.body.classList.add('ready'); revealHero(); }, 350);
  },
  evt => { if (evt.lengthComputable && evt.total) setProgress(evt.loaded / evt.total * 100); },
  err => {
    console.error(err);
    text.hidden = true; document.querySelector('.loader-bar').hidden = true;
    document.getElementById('loader-error').hidden = false;
  }
);

/* ---------- Resize ---------- */
let userMoved = false;
controls.addEventListener('start', () => (userMoved = true));
function resize() {
  const w = holder.clientWidth, h = holder.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const fit = camera.aspect < 0.9 ? 1.25 : 1;
  controls.maxDistance = 9 * fit;
  if (!userMoved) { HOME_POS.set(0, 0.25, 6.2 * fit); camera.position.copy(HOME_POS); }
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(holder);
resize();

/* ---------- UI buttons ---------- */
const btnAuto = document.getElementById('btn-auto');
btnAuto.addEventListener('click', () => {
  controls.autoRotate = !controls.autoRotate;
  btnAuto.classList.toggle('active', controls.autoRotate);
  btnAuto.setAttribute('aria-pressed', controls.autoRotate);
});
let resetting = null;
document.getElementById('btn-reset').addEventListener('click', () => {
  resetting = { t: 0, from: camera.position.clone(), fromT: controls.target.clone() };
});

/* ---------- Render loop ---------- */
const clock = new THREE.Clock();
let visible = true;
new IntersectionObserver(([e]) => { visible = e.isIntersecting; }, { threshold: 0 }).observe(holder);

function tick() {
  requestAnimationFrame(tick);
  if (!visible) { clock.getDelta(); return; }
  const dt = clock.getDelta(), t = clock.elapsedTime;
  floatGroup.position.y = Math.sin(t * 1.2) * 0.04;
  if (resetting) {
    resetting.t = Math.min(1, resetting.t + dt / 0.9);
    const k = 1 - Math.pow(1 - resetting.t, 3);
    camera.position.lerpVectors(resetting.from, HOME_POS, k);
    controls.target.lerpVectors(resetting.fromT, HOME_TARGET, k);
    if (resetting.t >= 1) { resetting = null; userMoved = false; }
  }
  controls.update();
  renderer.render(scene, camera);
}
tick();

/* ---------- Reveal on scroll ---------- */
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
}, { threshold: 0.2 });
document.querySelectorAll('.reveal').forEach(el => { if (!el.closest('.hero-text')) io.observe(el); });
function revealHero() { document.querySelectorAll('.hero-text .reveal').forEach(el => el.classList.add('in')); }

/* ---------- 4P: active section + progress indicator ---------- */
const pItems = [...document.querySelectorAll('.p-item')];
const progress = document.getElementById('progress');
const dots = [...progress.querySelectorAll('li')];
const countEl = document.getElementById('progress-count');

function setActive(i) {
  pItems.forEach((el, n) => el.classList.toggle('active', n === i));
  dots.forEach((el, n) => el.classList.toggle('on', n === i));
  countEl.textContent = `0${i + 1} / 04`;
}
setActive(0);

// ถือว่า section ที่อยู่ตรงกลางจอคือ section ที่กำลังอ่าน
const pio = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) setActive(+e.target.dataset.index); });
}, { rootMargin: '-45% 0px -45% 0px' });
pItems.forEach(el => pio.observe(el));

// แสดง progress เฉพาะตอนอยู่ในส่วน 4P
const secIO = new IntersectionObserver(([e]) => progress.classList.toggle('show', e.isIntersecting), { rootMargin: '-30% 0px -30% 0px' });
secIO.observe(document.getElementById('product'));