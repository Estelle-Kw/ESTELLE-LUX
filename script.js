import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const NA = '<span class="na">ข้อมูลไม่พบการยืนยันสำหรับประเทศไทย</span>';
const $ = s => document.querySelector(s);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width:820px)').matches || 'ontouchstart' in window;

/* ---------- CONTENT (Thailand only — fill in once verified) ---------- */
const SRC = 'Red Bull international labeling';
const DATA = {
  overview: [
    ['Product', 'Red Bull Energy Drink (Austrian brand, carbonated)'],
    ['Category', 'Energy drink with caffeine, taurine and B-group vitamins (B3, B5, B6, B12)'],
    ['Pack format', 'Slim aluminium can, 100% recyclable'],
    ['Volume', '250 ml standard; 355 ml and 473 ml in some markets'],
    ['Variants', 'Original, Sugarfree, Zero, 25% less sugar and colored Editions'],
    ['Highlight', 'Launched 1 April 1987 in Austria; tagline “Red Bull gives you wiiings”']
  ],
  sizes: [
    ['250 ML', 'Standard can. 80 mg caffeine.', 'Variant: Original and Editions. Approx. price in Thailand: ' + NA],
    ['355 ML', 'Larger can. 38 g sugars (Original, retailer label).', 'Variant: Original. Approx. price in Thailand: ' + NA],
    ['473 ML (16 FL OZ)', 'Largest can seen. 151 mg caffeine, 210 kcal.', 'Sold in the USA; Thailand availability: ' + NA]
  ],
  flavors: [
    { n: 'Original', t: 'Classic', c: '#c9ccd3', d: 'The original formula with taurine, caffeine and B vitamins.', s: '250 / 355 / 473 ml' },
    { n: 'Sugarfree', t: 'Zero sugar', c: '#6aa6ff', d: 'The classic taste without sugar.', s: '250 ml and up' },
    { n: 'Yellow Edition', t: 'Tropical', c: '#f2c230', d: 'Tropical fruit flavor.', s: '250 ml' },
    { n: 'Red Edition', t: 'Watermelon', c: '#e5254b', d: 'Watermelon flavor, also in sugarfree.', s: '355 ml (12 fl oz)' },
    { n: 'Pink Edition', t: 'Wild Berries', c: '#ff7fb0', d: 'Wild berries flavor, 114 mg caffeine per 12 fl oz.', s: '355 ml (12 fl oz)' },
    { n: 'Amber Edition', t: 'Strawberry Apricot', c: '#e8913a', d: 'Strawberry and apricot flavor.', s: '250 ml (8.4 fl oz)' }
  ],
  price: [
    ['Red Bull Original', '250 ML', NA],
    ['Red Bull Original', '355 ML', NA],
    ['Red Bull Editions', '250 ML', NA]
  ],
  channels: [
    ['CONVENIENCE STORE', 'Energy drinks are stocked in Thai convenience-store chillers such as 7-Eleven. Red Bull availability: ' + NA],
    ['SUPERMARKET', 'Lotus’s · Big C · Tops. Red Bull availability: ' + NA],
    ['ONLINE', 'Shopee Thailand · Lazada Thailand. Listings: ' + NA]
  ],
  facts: [
    ['Caffeine · 250 ml', '80 mg (about a cup of coffee)'],
    ['Caffeine · 473 ml', '151 mg'],
    ['Taurine', 'Yes, amount per can not stated on retailer pages'],
    ['B-Group Vitamins', 'B3 (niacin), B5, B6, B12'],
    ['Sugar · 250 ml', '27 g (Summer Edition label)'],
    ['Sugar · 355 ml / 473 ml', '38 g / 50 g'],
    ['Calories · 250 ml / 473 ml', '110 kcal (Yellow Edition) / 210 kcal'],
    ['Note', 'Figures are from Canadian and US retailer labels, not Thai labels']
  ]
};

const card = (h, p, extra = '', c = '') => `<article class="card reveal" tabindex="0" ${c ? `style="--c:${c}"` : ''}><h4>${c ? '<i class="dot"></i>' : ''}${h}</h4><p>${p}</p>${extra ? `<div class="more"><p>${extra}</p></div>` : ''}</article>`;
$('#overview').innerHTML = DATA.overview.map(([h, p]) => card(h.toUpperCase(), p)).join('');
$('#sizes').innerHTML = DATA.sizes.map(([h, p]) => card(h.toUpperCase(), p, 'Variant & approx. price: ' + NA)).join('');
$('#flavorCards').innerHTML = DATA.flavors.map(f => card(f.n.toUpperCase(), `${f.t} — ${f.d}`, 'Size: ' + f.s + '. Approx. price in Thailand: ' + NA, f.c)).join('');
$('#channels').innerHTML = DATA.channels.map(([h, p]) => card(h, p)).join('');
const rows = (head, list) => `<div class="row head">${head.map(h => `<span>${h}</span>`).join('')}</div>` + list.map(r => `<div class="row">${r.map(x => `<span>${x}</span>`).join('')}</div>`).join('');
$('#priceTable').innerHTML = rows(['PRODUCT', 'SIZE', 'APPROX. PRICE (THB)'], DATA.price);
$('#factsTable').innerHTML = rows(['FACT', 'VALUE'], DATA.facts).replace(/row/g, 'row').replace(/<div class="row/g, '<div style="grid-template-columns:1fr 2fr" class="row');

/* ---------- Reveal / nav ---------- */
const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && e.target.classList.add('in')), { threshold: .15 });
const observe = () => document.querySelectorAll('.reveal').forEach(el => io.observe(el));
observe();
addEventListener('scroll', () => $('#nav').classList.toggle('glass', scrollY > 40), { passive: true });
$('#burger').onclick = () => $('#menu').classList.toggle('open');
$('#menu').onclick = () => $('#menu').classList.remove('open');

/* ---------- 3D ---------- */
let source = null, modelFailed = false;
const viewers = [];

function makeViewer(host) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; // subtle reflections
  scene.environmentIntensity = .6;
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100);
  const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 5);
  const rim = new THREE.DirectionalLight(0xdb0a2f, 1.4); rim.position.set(-4, 2, -4);
  const fill = new THREE.HemisphereLight(0xaab8ff, 0x110008, .5);
  scene.add(key, rim, fill);
  const controls = new OrbitControls(camera, renderer.domElement);
  Object.assign(controls, { enableDamping: true, dampingFactor: .07, enablePan: false, minDistance: 2.2, maxDistance: 9, autoRotate: !reduce, autoRotateSpeed: 1.6 });
  const v = { host, renderer, scene, camera, controls, visible: true, home: new THREE.Vector3(0, .2, 5.2) };
  camera.position.copy(v.home);
  const resize = () => { const w = host.clientWidth, h = host.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.position.z = Math.max(v.home.z, v.home.z * (1.1 / camera.aspect)) * (camera.aspect < .9 ? 1 : 1); camera.updateProjectionMatrix(); };
  v.resize = resize; new ResizeObserver(resize).observe(host); resize();
  new IntersectionObserver(([e]) => v.visible = e.isIntersecting).observe(host);
  host.parentElement.querySelectorAll('[data-act]').forEach(b => b.onclick = () => {
    if (b.dataset.act === 'auto') controls.autoRotate = !controls.autoRotate;
    else { camera.position.copy(v.home); controls.target.set(0, 0, 0); controls.update(); }
  });
  viewers.push(v); return v;
}

function addModel(v) {
  if (modelFailed || !source) {
    v.host.insertAdjacentHTML('beforeend', '<div class="err"><h4>3D PRODUCT UNAVAILABLE</h4><p>Please check the model file and try again.</p></div>');
    return;
  }
  const m = source.clone(true);
  v.scene.add(m);
  v.model = m;
}

function prepareModel(gltf) {
  const m = gltf.scene;
  // Measure real bounds: normalise to ~2.6 units tall, centre pivot on bbox centre
  const box = new THREE.Box3().setFromObject(m);
  const size = box.getSize(new THREE.Vector3()), centre = box.getCenter(new THREE.Vector3());
  const s = 2.6 / Math.max(size.y, size.x, size.z);
  const wrap = new THREE.Group();
  m.position.sub(centre); wrap.add(m); wrap.scale.setScalar(s);
  m.traverse(o => { if (o.isMesh && o.material) { o.material.envMapIntensity = .8; } });
  source = wrap;
}

const views = [makeViewer($('#stageHero')), makeViewer($('#stageBig'))];
(function loop() {
  requestAnimationFrame(loop);
  const t = scrollY;
  views.forEach(v => {
    if (!v.visible) return;
    if (v.model && v.host.id === 'stageHero' && !reduce) v.model.position.y = Math.sin(performance.now() / 1200) * .04 - t * .0004; // slight float + parallax
    v.controls.update(); v.renderer.render(v.scene, v.camera);
  });
})();

/* ---------- Start → Loading → Main ---------- */
const stages = [[20, 'INITIALIZING SYSTEM'], [40, 'LOADING ASSETS'], [60, 'PREPARING 3D ENVIRONMENT'], [80, 'LOADING PRODUCT MODEL'], [95, 'OPTIMIZING EXPERIENCE'], [99, 'FINALIZING']];
const sleep = ms => new Promise(r => setTimeout(r, ms));
let modelReady = false, glbProgress = 0;

new GLTFLoader().load('./redbull.glb',
  g => { try { prepareModel(g); } catch (e) { modelFailed = true; console.error(e); } modelReady = true; },
  e => { if (e.total) glbProgress = e.loaded / e.total; },
  err => { console.error(err); modelFailed = true; modelReady = true; });

$('#startBtn').onclick = async () => {
  $('#start .center').classList.add('fade');
  await sleep(700);
  $('#start').classList.add('hidden');
  $('#loader').classList.remove('hidden');
  let p = 0, last = performance.now();
  const total = reduce ? 1500 : 4500; // minimum animation length
  await new Promise(done => {
    (function tick(now) {
      const dt = now - last; last = now;
      // animation advances on its own clock, but holds at 99 until the GLB is ready
      p += (100 / total) * dt;
      const cap = modelReady ? 100 : 99;
      const shown = Math.min(Math.floor(p), cap);
      $('#pct').textContent = shown + '%';
      $('#barFill').style.width = shown + '%';
      $('#status').textContent = shown >= 100 ? 'SYSTEM READY' : (stages.find(s => shown <= s[0]) || stages[5])[1];
      if (shown >= 100) return done();
      requestAnimationFrame(tick);
    })(performance.now());
  });
  await sleep(800);
  $('#loaderLogo').style.opacity = 0; $('#loaderLogo').style.animation = 'none';
  await sleep(400);
  $('#loader').classList.add('out');
  views.forEach(addModel);
  document.body.classList.remove('is-locked');
  await sleep(500);
  $('#nav').classList.add('on'); $('main').classList.add('on');
  views.forEach(v => v.resize());
  setTimeout(() => $('#loader').remove(), 1200);
};
