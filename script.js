/* Red Bull Interactive Product Showcase
   NOTE: run via a web server / GitHub Pages (ES modules + GLB fetch do not work from file://). */

/* ---------- PRODUCT DATA (every entry has a source; unknown = null) ---------- */
// Reference rates for COMPARISON ONLY (THB per 1 unit). Update before presenting.
const RATES = { SGD: 25, JPY: 0.23, USD: 33 };
const TH_YES = 'AVAILABLE IN THAILAND', TH_NO = 'NOT CONFIRMED IN THAILAND';
const PRODUCTS = [
  { id: 'sg-classic', name: 'Red Bull Energy Drink — Classic', flavor: 'Classic (original)', type: 'Energy drink, can', size: '6 × 250 ml pack', unit: '250 ml', country: 'Singapore', cur: 'SGD', price: 6.9, thai: false, thRetail: null, variant: 'silver',
    source: 'FairPrice Singapore', url: 'https://www.fairprice.com.sg/product/red-bull-energy-drink-classic-6s-x-250ml-10621847',
    notes: 'Promotional price shown on the listing until 1 Aug 2026 (regular S$7.35). Pack price, not per can. Listing states country of origin: Thailand; this is a Singapore retail price, not a Thai one.' },
  { id: 'sg-less-sugar', name: 'Red Bull Energy Drink — 25% Less Sugar', flavor: '25% Less Sugar', type: 'Energy drink, can (reduced sugar)', size: '250 ml per serving (pack size not stated)', unit: '250 ml', country: 'Singapore', cur: 'SGD', price: null, thai: false, thRetail: null, variant: 'silver',
    source: 'FairPrice Singapore', url: 'https://www.fairprice.com.sg/product/red-bull-energy-can-drink---25-less-sugar-12707510',
    notes: 'Listing shows an older offer (S$25.90, till 1 May 2024) without a clear pack size, so no price is used here. Listing nutrition per 250 ml: 125 kcal, sugars 30.7 g.' },
  { id: 'au-kd-150', name: 'Krating Daeng Original (Thai edition)', flavor: 'Original Thai formula', type: 'Energy drink, non-carbonated per retailer', size: '150 ml', unit: '150 ml', country: 'Australia', cur: 'AUD', price: null, thai: true, thRetail: null, variant: 'gold',
    source: 'Arc Asian Grocer (retailer) + Gigazine (Thailand sale)', url: 'https://www.arcasiangrocer.com.au/products/red-bull-thai-krating-daeng-original-energy-drink-150ml',
    notes: 'Retailer lists caffeine 50 mg/100 ml and origin Thailand. Thailand sale of Krating Daeng is stated by Gigazine (gigazine.net/gsc_news/en/20160506-redbull-thailand-austria). Not an official Red Bull source.' },
  { id: 'us-473', name: 'Red Bull Energy Drink — Large can', flavor: 'Classic (original)', type: 'Energy drink, can', size: '16 fl oz (473 ml)', unit: '473 ml', country: 'USA', cur: 'USD', price: null, thai: false, thRetail: null, variant: 'silver',
    source: 'Gigazine (2016 article)', url: 'https://gigazine.net/gsc_news/en/20160506-redbull-thailand-austria',
    notes: 'Article states the 16 fl oz size is sold in the USA alongside 250 ml. Price not confirmed.' },
  { id: 'us-weee', name: 'Red Bull Energy Drink — 1 can', flavor: 'Classic (original)', type: 'Energy drink, can', size: '250 ml', unit: '250 ml', country: 'USA', cur: 'USD', price: null, thai: false, thRetail: null, variant: 'silver',
    source: 'Weee! (US grocery listing)', url: 'https://sayweee.com/en/product/Redbull-Enegry-Drink/2189947',
    notes: 'Listing says made in Thailand. No price captured. Listing is a US retailer, not Thai retail confirmation.' },
  { id: 'jp-250', name: 'Red Bull Energy Drink — Classic', flavor: 'Classic (original)', type: 'Energy drink, can', size: '250 ml', unit: '250 ml', country: 'Japan', cur: 'JPY', price: 275, thai: false, thRetail: null, variant: 'silver',
    source: 'Gigazine (2006 article, Seven-Eleven Japan)', url: 'https://gigazine.net/gsc_news/en/20060411_red_bull',
    notes: 'HISTORICAL price from 2006 and not current. Shown only as a dated reference.' }
];
const FACTS = [
  ['Krating Daeng sizes & caffeine', '150 ml, caffeine 50 mg/100 ml, non-carbonated (retailer description).', 'Arc Asian Grocer', PRODUCTS[2].url],
  ['Global can sizes', '250 ml widely listed; 16 fl oz (473 ml) listed for USA.', 'Gigazine, 2016', PRODUCTS[3].url],
  ['Reduced-sugar nutrition (per 250 ml)', '125 kcal, 30.7 g sugars, per the retailer’s data table.', 'FairPrice Singapore', PRODUCTS[1].url],
  ['Packaging in Singapore listings', 'Sold as 6 × 250 ml packs; listing marks halal and origin Thailand.', 'FairPrice Singapore', PRODUCTS[0].url],
  ['Ingredients (global)', 'Data not confirmed — varies by country and edition.', '—', null]
];
const BUY = [['Singapore', 'FairPrice (online/in-store)', PRODUCTS[0].url], ['USA', 'Weee! (online grocery)', PRODUCTS[4].url], ['Australia', 'Arc Asian Grocer (online)', PRODUCTS[2].url]];

const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const thb = p => (p != null && RATES[p.cur]) ? `≈ ${Math.round(p.price * RATES[p.cur]).toLocaleString()} THB` : 'Data not confirmed';
const orig = p => p.price != null ? `${p.cur} ${p.price.toFixed(2)}` : 'Data not confirmed';
const thLabel = p => p.thai ? TH_YES : TH_NO;
const thTh = p => p.thai ? 'มีข้อมูลยืนยันว่าจำหน่ายในประเทศไทย' : 'ไม่พบข้อมูลยืนยันว่าจำหน่ายในประเทศไทย';

/* ---------- NAV ---------- */
const nav = $('#nav'), menu = $('#menu'), burger = $('#burger');
addEventListener('scroll', () => nav.classList.toggle('solid', scrollY > 40), { passive: true });
burger.onclick = () => { const o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o); };
$$('#menu a').forEach(a => a.onclick = () => { menu.classList.remove('open'); burger.setAttribute('aria-expanded', false); });

/* ---------- PRODUCT UI ---------- */
$('#sizeTable tbody').innerHTML = PRODUCTS.map(p => `<tr><td>${esc(p.name)}</td><td>${esc(p.unit)}</td><td>${esc(p.country)}</td><td><a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.source.split(' (')[0])}</a></td><td>${p.thai ? TH_YES : TH_NO}</td></tr>`).join('');
$('#factList').innerHTML = FACTS.map(f => `<li><b>${esc(f[0])}</b><small>${esc(f[1])} — ${f[3] ? `<a href="${esc(f[3])}" target="_blank" rel="noopener">${esc(f[2])}</a>` : 'Data not confirmed'}</small></li>`).join('');
$('#buyList').innerHTML = BUY.map(b => `<li><b style="color:#fff;font-weight:400">${esc(b[0])}</b><small><a href="${esc(b[2])}" target="_blank" rel="noopener">${esc(b[1])}</a></small></li>`).join('');

const MAIN = ['THAILAND', 'USA', 'JAPAN', 'UK', 'GERMANY', 'INDIA', 'SINGAPORE'];
const state = { country: 'ALL', status: 'ALL PRODUCTS', q: '' };
const CSTAT = ['ALL PRODUCTS', 'CONFIRMED IN THAILAND', 'NOT CONFIRMED IN THAILAND'];
function chips(el, list, key) {
  el.innerHTML = list.map(l => `<button class="chip${state[key] === l ? ' on' : ''}" data-v="${l}">${l}</button>`).join('');
  el.onclick = e => { const b = e.target.closest('.chip'); if (!b) return; state[key] = b.dataset.v; chips(el, list, key); render(); };
}
chips($('#countryChips'), ['ALL', ...MAIN, 'OTHER'], 'country');
chips($('#statusChips'), CSTAT, 'status');
$('#search').oninput = e => { state.q = e.target.value.trim().toLowerCase(); render(); };

function render() {
  const list = PRODUCTS.filter(p => {
    const c = p.country.toUpperCase();
    if (state.country !== 'ALL' && (state.country === 'OTHER' ? MAIN.includes(c) : c !== state.country)) return false;
    if (state.status === CSTAT[1] && !p.thai) return false;
    if (state.status === CSTAT[2] && p.thai) return false;
    return !state.q || (p.name + ' ' + p.flavor).toLowerCase().includes(state.q);
  });
  $('#grid').innerHTML = list.map(p => `<article class="card"><div class="can ${p.variant}"></div>
    <h3>${esc(p.name)}</h3><p class="meta">${esc(p.flavor)} · ${esc(p.size)}</p><p class="meta">${esc(p.country)}</p>
    <p class="price">${esc(orig(p))}<br><em>${p.price != null ? esc(thb(p)) + ' (estimated)' : 'Estimated THB: Data not confirmed'}</em></p>
    <span class="badge ${p.thai ? 'ok' : ''}">${thLabel(p)}</span>
    <button class="btn small" data-id="${p.id}">VIEW DETAILS</button></article>`).join('');
  $('#empty').hidden = list.length > 0;
}
render();
$('#grid').onclick = e => {
  const b = e.target.closest('[data-id]'); if (!b) return;
  const p = PRODUCTS.find(x => x.id === b.dataset.id);
  const row = (k, v) => `<div><span>${k}</span><b style="font-weight:300">${v}</b></div>`;
  $('#modalBody').innerHTML = `<h3>${esc(p.name)}</h3>` +
    row('Flavor', esc(p.flavor)) + row('Size', esc(p.size)) + row('Country', esc(p.country)) +
    row('Original price', esc(orig(p))) + row('Estimated THB price', p.price != null ? esc(thb(p)) + '<br><small>ราคาโดยประมาณเมื่อแปลงเป็นเงินบาท ไม่ใช่ราคาขายในไทย</small>' : 'Data not confirmed') +
    row('Thailand availability', thLabel(p) + '<br><small>' + thTh(p) + '</small>') +
    row('Thailand retail price', p.thRetail ? esc(p.thRetail) : 'Not Confirmed<br><small>ไม่พบข้อมูลราคาจำหน่ายในประเทศไทยที่ยืนยันได้</small>') +
    row('Source', `<a href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.source)}</a>`) + row('Notes', esc(p.notes));
  const m = $('#modal'); m.showModal ? m.showModal() : m.setAttribute('open', '');
};
$('#closeModal').onclick = () => $('#modal').close();
$('#modal').addEventListener('click', e => { if (e.target.id === 'modal') e.target.close(); });

const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && (e.target.classList.add('in'), io.unobserve(e.target))), { threshold: .08 });
$$('.sec').forEach(s => { s.classList.add('reveal'); io.observe(s); });

/* ---------- AMBIENT PARTICLES (only while overlay is visible) ---------- */
function fx(canvas) {
  const ctx = canvas.getContext('2d'), ov = canvas.parentElement; let w, h, ps = [];
  const size = () => { w = canvas.width = ov.clientWidth; h = canvas.height = ov.clientHeight; };
  size(); addEventListener('resize', size);
  for (let i = 0; i < 45; i++) ps.push({ x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + .3, v: Math.random() * .0004 + .0001 });
  (function loop() {
    if (!ov.classList.contains('hidden')) {
      ctx.clearRect(0, 0, w, h);
      ps.forEach(p => { p.y -= p.v; if (p.y < 0) p.y = 1; ctx.fillStyle = `rgba(219,10,48,${.15 + p.r * .2})`; ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r, 0, 7); ctx.fill(); });
    }
    if (ov.isConnected && !ov.dataset.done) requestAnimationFrame(loop);
  })();
}
$$('[data-fx]').forEach(fx);

/* ---------- THREE.JS (loaded defensively so the rest of the site never breaks) ---------- */
let T = null, GLTFLoader, OrbitControls, RoomEnvironment;
const libP = Promise.all([import('three'), import('three/addons/loaders/GLTFLoader.js'), import('three/addons/controls/OrbitControls.js'), import('three/addons/environments/RoomEnvironment.js')])
  .then(m => { T = m[0]; GLTFLoader = m[1].GLTFLoader; OrbitControls = m[2].OrbitControls; RoomEnvironment = m[3].RoomEnvironment; return true; })
  .catch(err => { console.error('Three.js failed to load', err); return false; });

class Viewer {
  constructor(el) {
    this.el = el; this.msg = $('.viewer-msg', el); this.visible = false; this.auto = true; this.ok = false;
    this.renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.toneMapping = T.ACESFilmicToneMapping; this.renderer.toneMappingExposure = .9;
    this.renderer.outputColorSpace = T.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(pointer:coarse)').matches ? 1.5 : 2));
    el.prepend(this.renderer.domElement);
    this.scene = new T.Scene();
    const pm = new T.PMREMGenerator(this.renderer); this.scene.environment = pm.fromScene(new RoomEnvironment(), .04).texture; pm.dispose();
    this.camera = new T.PerspectiveCamera(32, 1, .05, 100);
    const key = new T.DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 4);
    const rim = new T.DirectionalLight(0xbcd0ff, 2.2); rim.position.set(-4, 2, -3);
    const red = new T.PointLight(0xdb0a30, 14, 12); red.position.set(1.8, -.4, -2);
    this.scene.add(key, rim, red, new T.AmbientLight(0x202838, .5));
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    Object.assign(this.controls, { enableDamping: true, dampingFactor: .06, rotateSpeed: .7, zoomSpeed: .6, enablePan: false, autoRotate: true, autoRotateSpeed: 1.6 });
    this.controls.addEventListener('start', () => this.controls.autoRotate = false, { once: false });
    $$('[data-act]', el).forEach(b => b.onclick = () => this[b.dataset.act === 'auto' ? 'toggleAuto' : 'reset']());
    this.sync();
    new ResizeObserver(() => this.resize()).observe(el);
    new IntersectionObserver(es => this.visible = es[0].isIntersecting).observe(el);
    this.resize(); this.loop = this.loop.bind(this); requestAnimationFrame(this.loop);
  }
  sync() { const b = $('[data-act=auto]', this.el); b && b.classList.toggle('on', this.controls.autoRotate); }
  toggleAuto() { this.controls.autoRotate = !this.controls.autoRotate; this.sync(); }
  dist() { const t = Math.tan(T.MathUtils.degToRad(this.camera.fov / 2)); return Math.max(1.1 / t, (.42 / this.camera.aspect) / t) * 1.25; }
  reset() {
    const d = this.dist(), dir = new T.Vector3(.35, .14, .93).normalize();
    this.camera.position.copy(dir.multiplyScalar(d)); this.controls.target.set(0, 0, 0);
    this.controls.minDistance = d * .35; this.controls.maxDistance = d * 2.2;
    this.controls.autoRotate = true; this.controls.update(); this.sync();
  }
  resize() {
    const w = this.el.clientWidth, h = this.el.clientHeight; if (!w || !h) return;
    this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    if (this.ok && !this.userMoved) { const d = this.dist(); this.controls.minDistance = d * .35; this.controls.maxDistance = d * 2.2; }
  }
  setModel(root) {
    // Inspect bounding box -> fix orientation (tallest axis -> Y), centre, normalise to height 2
    const b = new T.Box3().setFromObject(root), s = b.getSize(new T.Vector3());
    if (s.x > s.y && s.x >= s.z) root.rotation.z = Math.PI / 2; else if (s.z > s.y && s.z > s.x) root.rotation.x = Math.PI / 2;
    root.updateMatrixWorld(true);
    b.setFromObject(root); b.getSize(s); const c = b.getCenter(new T.Vector3());
    root.position.sub(c);
    const g = new T.Group(); g.add(root); g.scale.setScalar(2 / Math.max(s.x, s.y, s.z));
    this.scene.add(g); this.ok = true; this.reset();
  }
  fail() { this.msg.hidden = false; this.msg.innerHTML = '<b>3D PRODUCT UNAVAILABLE</b><small>Please check the model file and try again.</small>'; $('.hint', this.el).hidden = true; $('.ctrls', this.el).hidden = true; }
  loop() {
    requestAnimationFrame(this.loop);
    if (!this.visible || document.hidden) return;
    this.controls.update(); this.renderer.render(this.scene, this.camera);
  }
  dispose() { this.renderer.dispose(); this.scene.traverse(o => { o.geometry?.dispose(); [].concat(o.material || []).forEach(m => { for (const k in m) m[k]?.isTexture && m[k].dispose(); m.dispose(); }); }); }
}

let viewers = [], modelState = { done: false, ok: false, progress: 0 };
function loadModel() {
  return libP.then(ok => new Promise(res => {
    const fail = e => { console.error('GLB error', e); modelState.done = true; modelState.ok = false; viewers.forEach(v => v.fail()); res(); };
    if (!ok) { // Three.js CDN unreachable
      $$('.viewer').forEach(el => { $('.viewer-msg', el).hidden = false; $('.viewer-msg', el).innerHTML = '<b>3D PRODUCT UNAVAILABLE</b><small>Please check the model file and try again.</small>'; });
      modelState.done = true; return res();
    }
    try { viewers = $$('.viewer').map(el => new Viewer(el)); } catch (e) { return fail(e); }
    new GLTFLoader().load('./redbull.glb', gltf => {
      try {
        viewers.forEach((v, i) => v.setModel(i === 0 ? gltf.scene : gltf.scene.clone(true)));
        modelState.ok = true;
      } catch (e) { return fail(e); }
      modelState.done = true; res();
    }, e => { if (e.lengthComputable) modelState.progress = e.loaded / e.total; }, fail);
  }));
}
addEventListener('pagehide', () => viewers.forEach(v => v.dispose()));

/* ---------- START + LOADING SEQUENCE ---------- */
const start = $('#start'), loader = $('#loader');
const STAGES = [[20, 'INITIALIZING SYSTEM'], [40, 'LOADING ASSETS'], [60, 'PREPARING 3D ENVIRONMENT'], [80, 'LOADING PRODUCT MODEL'], [95, 'OPTIMIZING EXPERIENCE'], [99, 'FINALIZING'], [100, 'SYSTEM READY']];
$('#startBtn').onclick = () => {
  $('#startBtn').disabled = true; start.classList.add('hidden');
  setTimeout(() => { loader.classList.remove('hidden'); runLoader(); }, 700);
  loadModel();
};
function runLoader() {
  const DUR = 5500, t0 = performance.now(); let shown = 0, ready = false;
  const set = p => { shown = p; $('#pct').textContent = p + '%'; $('#barFill').style.width = p + '%'; $('#status').textContent = STAGES.find(s => p <= s[0])[1]; };
  (function tick(now) {
    if (ready) return;
    const t = Math.min((now - t0) / DUR, 1), eased = 1 - Math.pow(1 - t, 2.2);
    let p = Math.min(Math.floor(eased * 99), 99);
    if (t >= 1 && !modelState.done) p = 98 + (Math.floor(now / 1500) % 2); // hold at 98–99 until GLB resolves
    if (t >= 1 && modelState.done) { ready = true; set(100); setTimeout(finish, 800); return; }
    if (p > shown) set(p);
    requestAnimationFrame(tick);
  })(t0);
}
function finish() {
  loader.classList.add('hidden'); loader.dataset.done = 1; start.dataset.done = 1;
  document.body.classList.remove('locked'); scrollTo(0, 0);
  setTimeout(() => viewers.forEach(v => v.resize()), 50);
}
