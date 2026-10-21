/* CleanTown app logic. Vanilla JS, no build step. */
(function () {
'use strict';

/* ================= helpers ================= */
const $ = id => document.getElementById(id);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isDesktop = () => window.matchMedia('(min-width: 960px)').matches;
function escapeHTML(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function icon(name, cls) { return `<svg class="ic${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`; }
const store = {
  get(k, fallback) { try { const v = localStorage.getItem(k); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } },
  raw(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  setRaw(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } }
};
const KEYS = {
  reports: 'cleantown_sime_darby_demo_reports_v1',
  cloudFacilities: 'cleantown_shared_facilities_cache_v1',
  localFacilities: 'cleantown_local_facilities_v1',
  trucks: 'cleantown_truck_schedule_v1',
  reminders: 'cleantown_truck_reminders_enabled',
  demoBanner: 'cleantown_demo_banner_dismissed_v1'
};
const SESSION_KEY = 'cleantown_demo_session';

function toast(message, type) {
  const box = $('toasts'); if (!box) return;
  const el = document.createElement('div');
  el.className = 'toast' + (type === 'error' ? ' error' : '');
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.innerHTML = icon(type === 'error' ? 'alert' : 'check') + `<span>${escapeHTML(message)}</span>`;
  box.append(el);
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 500); }, type === 'error' ? 6500 : 3400);
}

function timeAgo(ms) {
  if (!Number.isFinite(ms)) return '';
  const mins = Math.floor((Date.now() - ms) / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

function setCount(el, value) {
  if (!el) return;
  const to = Number(value) || 0;
  const from = Number(el.dataset.v ?? el.textContent) || 0;
  el.dataset.v = String(to);
  if (from === to || reducedMotion()) { el.textContent = String(to); return; }
  const start = performance.now(), dur = 650;
  const step = now => {
    const p = Math.min(1, (now - start) / dur), eased = 1 - Math.pow(1 - p, 3);
    el.textContent = String(Math.round(from + (to - from) * eased));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function toCoord(v, max) {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && Math.abs(n) <= max ? n : null;
}
const hasCoords = x => x && Number.isFinite(x.lat) && Number.isFinite(x.lng);
function distanceM(a, b) {
  const rad = x => x * Math.PI / 180, R = 6371000;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(q));
}
const fmtDistance = m => m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1)} km`;

/* ================= domain data ================= */
const CENTER = { name: 'Sime Darby Township', lat: 3.1905, lng: 101.5105 };
const TOWNSHIP_RADIUS_M = 5000;

const BINS = {
  paper:   { label: 'Paper', long: 'Paper & cardboard', c: '#1F6FD1', ci: '#1A5BAE', ct: '#E4EEFB', icon: 'paper' },
  plastic: { label: 'Plastic & metal', long: 'Plastic & metal packaging', c: '#F08A24', ci: '#A34B05', ct: '#FDEEDD', icon: 'bottle' },
  glass:   { label: 'Glass', long: 'Glass bottles & jars', c: '#8A5A2B', ci: '#74491F', ct: '#F1E8DF', icon: 'jar' },
  general: { label: 'General', long: 'General waste', c: '#1E7B4F', ci: '#17633F', ct: '#E0F1E7', icon: 'sort' },
  organic: { label: 'Food & organic', long: 'Food & organic waste', c: '#8DB33A', ci: '#4A6E12', ct: '#EDF4DC', icon: 'leaf' },
  special: { label: 'Special drop-off', long: 'Batteries & e-waste', c: '#7B3FA0', ci: '#6A3590', ct: '#F0E6F6', icon: 'battery' },
  bulky:   { label: 'Bulky', long: 'Bulky items', c: '#6B7580', ci: '#4B5560', ct: '#ECEEF0', icon: 'sofa' }
};
const BIN_ORDER = ['paper', 'plastic', 'glass', 'general', 'organic', 'special', 'bulky'];
const binVars = key => { const b = BINS[key] || BINS.general; return `--c:${b.c};--ci:${b.ci};--ct:${b.ct}`; };

const GUIDE = [
  { name: 'Plastic bottle', icon: 'bottle', bin: 'plastic', dest: 'Plastic & metal recycling', steps: ['Empty the bottle and rinse away food or drink residue.', 'Check the recycling symbol and your local programme’s accepted plastics.', 'Place it in the designated plastic-recycling container; keep it separate from food waste.'] },
  { name: 'Drink can', icon: 'can', bin: 'plastic', dest: 'Plastic & metal recycling', steps: ['Empty the can and give it a quick rinse.', 'Keep it separate from food waste and general rubbish.', 'Put it with plastic and metal recycling, or take it to a recycling point that accepts aluminium cans.'] },
  { name: 'Cardboard box', icon: 'box', bin: 'paper', dest: 'Paper & cardboard recycling', steps: ['Remove packing materials and any plastic liners.', 'Keep the cardboard clean and dry, then flatten it to save space.', 'Put it in a paper/cardboard recycling bin or take it to a centre that accepts cardboard.'] },
  { name: 'Newspaper & magazines', icon: 'paper', bin: 'paper', dest: 'Paper & cardboard recycling', steps: ['Keep paper clean and dry, and remove plastic wrappers.', 'Stack or bundle it so it doesn’t blow away.', 'Put it in the paper recycling bin or take it to a paper collection point.'] },
  { name: 'Glass bottle', icon: 'jar', bin: 'glass', dest: 'Glass collection point', steps: ['Empty and rinse the bottle; remove caps if your local programme asks you to.', 'Keep glass separate and place it in a glass collection container or a centre that accepts bottles.', 'Never put loose broken glass into a recycling bin unless the service specifically provides safe instructions.'] },
  { name: 'Food scraps', icon: 'apple', bin: 'organic', food: true, dest: 'Food waste / compost', steps: ['Separate scraps from plastic packaging and drain excess liquid.', 'Compost suitable fruit and vegetable scraps, or use an organic-waste service if available.', 'For meat, fish, dairy or oily leftovers, check the service’s accepted-items list; otherwise use the designated general-waste route.'] },
  { name: 'Fruit and vegetable scraps', icon: 'leaf', bin: 'organic', food: true, dest: 'Compost or organic-waste collection', steps: ['Remove stickers, ties and all plastic packaging.', 'Use a suitable compost bin or community organic-waste service; mix moist scraps with dry leaves or shredded uncoated cardboard.', 'Cover fresh scraps to reduce odours and pests, and follow the service’s accepted-items list.'] },
  { name: 'Cooked food leftovers', icon: 'bowl', bin: 'organic', food: true, dest: 'Local organic-waste service or designated general waste', steps: ['Keep leftovers contained and separate from recyclables.', 'Check whether your compost or organic-waste service accepts cooked food, meat, fish, dairy and oily items.', 'If not accepted, use the designated general-waste bin according to local rules; never pour food waste into drains or leave it outdoors.'] },
  { name: 'Used tissue', icon: 'tissue', bin: 'general', dest: 'General waste', steps: ['Do not put used tissues in paper recycling because they are contaminated and fibres are unsuitable for many paper-recycling processes.', 'Put used tissues in the designated general-waste bin.', 'If contaminated with chemicals or other special waste, follow the relevant local disposal instructions.'] },
  { name: 'Used battery', icon: 'battery', bin: 'special', dest: 'Battery collection point', steps: ['Do not place batteries in ordinary rubbish or mixed recycling.', 'Keep batteries dry and prevent terminals from touching metal; do not puncture or dismantle them.', 'Take them to a dedicated battery collection point and ask the collector how to handle swollen or damaged batteries.'] },
  { name: 'Old phone or laptop', icon: 'phone', bin: 'special', ewaste: true, dest: 'Authorised e-waste collection point', steps: ['If it still works, consider reuse, repair or donation before recycling.', 'Back up your data and sign out, remove accounts and securely erase personal information where possible.', 'Take it to a DOE-registered/authorised household e-waste collector; confirm acceptance before visiting.'] },
  { name: 'Old TV or appliance', icon: 'tv', bin: 'special', ewaste: true, dest: 'Authorised e-waste collection point', steps: ['Do not leave the appliance beside a bin or dismantle it yourself.', 'Contact a DOE-registered/authorised e-waste collector or retailer take-back service.', 'Call ahead to confirm the item is accepted and whether pickup is available, especially for large appliances.'] },
  { name: 'Old furniture or mattress', icon: 'sofa', bin: 'bulky', dest: 'Bulky-waste collection', steps: ['If it is still usable, consider donating or selling it first.', 'Do not leave it beside public bins or on the roadside.', 'Arrange a bulky-waste collection with township management or your local council and follow their pickup instructions.'] }
];
const guideByName = name => GUIDE.find(g => g.name === name);

/* Server categories (server.py) mapped onto bins and a representative guide item. */
const VISION = {
  paper: { guide: 'Cardboard box' }, 'plastic-metal': { guide: 'Plastic bottle' }, glass: { guide: 'Glass bottle' },
  food: { guide: 'Fruit and vegetable scraps' }, battery: { guide: 'Used battery' }, ewaste: { guide: 'Old phone or laptop' },
  general: { guide: 'Used tissue' }, bulky: { guide: 'Old furniture or mattress' }, uncertain: null
};
const VISION_ALIASES = { cardboard: 'paper', 'paper/cardboard': 'paper', plastic: 'plastic-metal', metal: 'plastic-metal', 'plastic/metal': 'plastic-metal', 'food waste': 'food', organic: 'food', batteries: 'battery', 'e-waste': 'ewaste', electronic: 'ewaste', electronics: 'ewaste', 'electrical appliance': 'ewaste', 'general waste': 'general', 'bulky waste': 'bulky', mixed: 'uncertain', unknown: 'uncertain' };
function visionKey(raw) { const r = String(raw || '').trim().toLowerCase(); return Object.prototype.hasOwnProperty.call(VISION, r) ? r : (VISION_ALIASES[r] || 'uncertain'); }

const EWASTE = [
  { n: 'A Five Stars Metals Sdn. Bhd. — Shah Alam', a: 'Lot PT 38181, Jalan Masyhur 25/50, Taman Sri Muda, Seksyen 25, 40400 Shah Alam, Selangor', d: 'Household appliances listed include washing machines, televisions, air conditioners, refrigerators, computers and mobile phones. Mon–Sat, 8am–5pm. Call 016-2173331 / 012-2173331.', q: 'A Five Stars Metals Jalan Masyhur 25/50 Shah Alam' },
  { n: 'Acson Malaysia Sales & Service — Petaling Jaya', a: 'No. 7A, Jalan 13/4, Seksyen 13, 46200 Petaling Jaya, Selangor', d: 'DOE listing specifies air conditioners. Mon–Fri, 8am–5:30pm. Call 03-7964 8200 before visiting.', q: 'Acson Malaysia 7A Jalan 13/4 Petaling Jaya' },
  { n: '3CAT Sdn. Bhd. — Plaza Low Yat, Kuala Lumpur', a: 'Lot UG-039 & 40, UG Floor, Plaza Low Yat, Jalan Bintang, Bukit Bintang, 55100 Kuala Lumpur', d: 'Listed for computers/laptops and mobile phones. Listed hours Mon–Sun, 10am–10pm. Call 011-6953 3228 before visiting.', q: '3CAT Plaza Low Yat Kuala Lumpur' },
  { n: 'Grand Senheng Setia Alam', a: 'Setia Alam, Selangor — check exact branch address in the official directory', d: 'Named as an e-waste collection point in the DOE directory. Call the branch to confirm whether your specific appliance is accepted.', q: 'Grand Senheng Setia Alam' },
  { n: 'Grand Senheng Shah Alam 105', a: 'Shah Alam, Selangor — confirm branch address', d: 'Named as an e-waste collection point in the DOE directory. Accepted appliance types and current arrangements must be confirmed.', q: 'Grand Senheng Shah Alam 105' },
  { n: 'Grand Senheng Klang Bukit Tinggi', a: 'Bukit Tinggi, Klang, Selangor — confirm branch address', d: 'Named as an e-waste collection point in the DOE directory. Call ahead to verify appliance eligibility and drop-off arrangements.', q: 'Grand Senheng Klang Bukit Tinggi' },
  { n: 'Senheng Kelana Jaya', a: 'Kelana Jaya, Selangor — confirm branch address', d: 'Named as an e-waste collection point in the DOE directory. Confirm accepted appliance types before travel.', q: 'Senheng Kelana Jaya' },
  { n: 'Senheng Bandar Puteri Puchong', a: 'Bandar Puteri Puchong, Selangor — confirm branch address', d: 'Named as an e-waste collection point in the DOE directory. Confirm accepted appliance types before travel.', q: 'Senheng Bandar Puteri Puchong' },
  { n: 'Senheng USJ Taipan', a: 'USJ Taipan, Subang Jaya, Selangor — confirm branch address', d: 'Named as an e-waste collection point in the DOE directory. Confirm accepted appliance types before travel.', q: 'Senheng USJ Taipan' },
  { n: 'Putra Heights Recycling Centre (Tzu Chi)', a: 'Putra Heights, Selangor — check official directory for address and current details', d: 'Named as a collection centre in the DOE directory. Confirm whether electrical appliances are accepted; not every recycling centre takes bulky e-waste.', q: 'Putra Heights Recycling Centre Tzu Chi' }
];
const DOE_URL = 'https://ewaste.doe.gov.my/index.php/about/list-of-collectors/';

const ISSUES = {
  'Illegal dumping': { icon: 'bag', sev: 'red', desc: 'Waste left in a public area' },
  'Overflowing bin': { icon: 'sort', sev: 'orange', desc: 'Bin full or rubbish spilling out' },
  'Missed collection': { icon: 'clock', sev: 'yellow', desc: 'Scheduled pickup didn’t happen' },
  'Recycling issue': { icon: 'recycle', sev: 'yellow', desc: 'Problem at a sorting or recycling point' }
};
/* Severity is a state scale, kept off the bin-category hues. */
const SEV = {
  red:    { label: 'Serious', c: '#D23F3A', bg: '#FCE4E2', ink: '#A3231F', r: 16 },
  orange: { label: 'Moderate', c: '#D99A1B', bg: '#FCF0D4', ink: '#714D00', r: 14 },
  yellow: { label: 'Minor', c: '#7A8494', bg: '#ECEEF2', ink: '#434B58', r: 12 },
  green:  { label: 'Clear', c: '#23968A', bg: '#DBF2EF', ink: '#136A61', r: 11 }
};
const SEV_ORDER = ['red', 'orange', 'yellow', 'green'];
const STATUSES = ['Submitted', 'In progress', 'Resolved'];
const statusClass = s => s === 'Resolved' ? 'resolved' : s === 'In progress' ? 'progress' : 'submitted';
const severityFor = r => r.status === 'Resolved' ? 'green' : (ISSUES[r.type]?.sev || 'yellow');

const DEMO_HOTSPOTS = [
  { id: 'DEMO-01', dx: -0.012, dy: -0.008, location: 'Service road behind Precinct 2', type: 'Illegal dumping', severity: 'red', description: 'Mixed-waste bags dumped along the service road.' },
  { id: 'DEMO-02', dx: 0.005, dy: -0.006, location: 'Central Park playground', type: 'Overflowing bin', severity: 'orange', description: 'Public bin overflowing after the weekend.' },
  { id: 'DEMO-03', dx: 0.012, dy: 0.007, location: 'Riverside walk', type: 'Illegal dumping', severity: 'red', description: 'Rubbish beside the drain corridor that could wash into the river.' },
  { id: 'DEMO-04', dx: -0.008, dy: 0.010, location: 'Persiaran Utama bus stop', type: 'Overflowing bin', severity: 'yellow', description: 'Bin nearly full; waste still contained.' },
  { id: 'DEMO-05', dx: 0.002, dy: 0.014, location: 'Community Hub', type: 'Overflowing bin', severity: 'orange', description: 'Loose litter around the public bin.' },
  { id: 'DEMO-06', dx: -0.015, dy: 0.002, location: 'Lakeside recycling corner', type: 'Recycling issue', severity: 'green', description: 'Area cleared and checked.' }
];
const DEMO_FACILITIES = [
  { id: 'demo-r1', kind: 'recycling', name: 'Community Hub recycling corner', dlat: 0.004, dlng: -0.006, notes: 'Paper, plastic, metal and glass bins.' },
  { id: 'demo-r2', kind: 'recycling', name: 'Lakeside drop-off point', dlat: 0.009, dlng: 0.008, notes: 'Mixed recyclables; keep items clean and dry.' },
  { id: 'demo-r3', kind: 'recycling', name: 'Shop-lot paper & cardboard point', dlat: 0.010, dlng: -0.011, notes: 'Flatten boxes before dropping off.' },
  { id: 'demo-r4', kind: 'recycling', name: 'Precinct 2 mixed recyclables', dlat: -0.006, dlng: 0.013, notes: 'Plastics, cans and glass.' },
  { id: 'demo-b1', kind: 'bin', name: 'Central Park bin station', dlat: -0.003, dlng: 0.004, notes: 'General waste and litter bins.' },
  { id: 'demo-b2', kind: 'bin', name: 'Riverside walk bins', dlat: -0.008, dlng: -0.009, notes: 'Litter bins along the path.' },
  { id: 'demo-b3', kind: 'bin', name: 'Jalan Harmoni street bins', dlat: 0.002, dlng: 0.010, notes: 'Residential street bins.' },
  { id: 'demo-b4', kind: 'bin', name: 'Playground litter bins', dlat: -0.010, dlng: 0.005, notes: 'Small litter bins only; no bulky items.' },
  { id: 'demo-b5', kind: 'bin', name: 'Food court waste point', dlat: 0.006, dlng: -0.002, notes: 'Separate food-waste bin where labelled.' },
  { id: 'demo-b6', kind: 'bin', name: 'Persiaran Utama bus stop bin', dlat: -0.004, dlng: -0.012, notes: 'Litter bin only.' },
  { id: 'demo-b7', kind: 'bin', name: 'Community hall waste point', dlat: 0.012, dlng: -0.004, notes: 'Ask hall management about access.' },
  { id: 'demo-b8', kind: 'bin', name: 'Block A refuse room', dlat: -0.012, dlng: 0.010, notes: 'Residents only; may be access-controlled.' }
];
const DEFAULT_TRUCKS = [
  { id: 'demo-1', route: 'Lakeside Precinct', type: 'General waste', weekday: 1, time: '08:00', notes: 'Place bins out by 7:30 AM' },
  { id: 'demo-2', route: 'Central Park & Jalan Harmoni', type: 'General waste', weekday: 2, time: '08:30', notes: 'Keep collection points clear' },
  { id: 'demo-3', route: 'Precinct 2', type: 'Recycling', weekday: 3, time: '09:00', notes: 'Only accepted recyclable materials' },
  { id: 'demo-4', route: 'Riverside & Shop Lots', type: 'General waste', weekday: 4, time: '08:00', notes: 'Tie bags securely' },
  { id: 'demo-5', route: 'Whole township — bulky items', type: 'Bulky waste', weekday: 6, time: '10:00', notes: 'Book bulky items with management first' }
];
const TRUCK_BIN = { 'General waste': 'general', Recycling: 'paper', 'Green waste': 'organic', 'Bulky waste': 'bulky' };
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/* ================= state ================= */
function normaliseReport(r) {
  if (!r || typeof r !== 'object' || !r.id || !r.type) return null;
  return {
    id: String(r.id), type: String(r.type), location: String(r.location || ''), details: String(r.details || ''),
    status: STATUSES.includes(r.status) ? r.status : 'Submitted',
    created: Number(r.created) || Date.now(), updated: Number(r.updated) || null,
    lat: toCoord(r.lat, 90), lng: toCoord(r.lng, 180)
  };
}
function seedReports() {
  const n = Date.now(), c = CENTER;
  return [
    { id: 'CT-105', type: 'Overflowing bin', location: 'Lakeside Park, north entrance', details: 'Two public bins full since the weekend; litter blowing onto the path.', status: 'Submitted', created: n - 25 * 60000, lat: c.lat + 0.006, lng: c.lng + 0.004 },
    { id: 'CT-104', type: 'Illegal dumping', location: 'Community park, Block B', details: 'Rubbish bags beside the walking path.', status: 'In progress', created: n - 3 * 3600000, lat: c.lat - 0.004, lng: c.lng - 0.007 },
    { id: 'CT-103', type: 'Overflowing bin', location: 'Apartment Block A bin centre', details: 'Public bin is nearly full.', status: 'Submitted', created: n - 5 * 3600000, lat: c.lat - 0.010, lng: c.lng + 0.009 },
    { id: 'CT-102', type: 'Missed collection', location: 'Jalan Harmoni 3', details: 'Monday collection did not arrive.', status: 'Resolved', created: n - 26 * 3600000, lat: c.lat + 0.002, lng: c.lng + 0.011 },
    { id: 'CT-101', type: 'Recycling issue', location: 'Community Hub recycling corner', details: 'Paper bin mixed with food waste.', status: 'Resolved', created: n - 3 * 86400000, lat: c.lat + 0.004, lng: c.lng - 0.006 }
  ].map(normaliseReport);
}
let reports = (() => {
  const saved = store.get(KEYS.reports, null);
  return Array.isArray(saved) ? saved.map(normaliseReport).filter(Boolean) : seedReports();
})();
const sortedReports = () => [...reports].sort((a, b) => b.created - a.created);
function persistReports() { store.set(KEYS.reports, reports); }
function nextReportId(ids) {
  let max = 100;
  ids.forEach(id => { const m = /^CT-(\d{1,6})$/.exec(String(id)); if (m) max = Math.max(max, Number(m[1])); });
  return 'CT-' + (max + 1);
}

function normaliseFacility(f) {
  if (!f || typeof f !== 'object' || !f.id) return null;
  const lat = toCoord(f.lat, 90), lng = toCoord(f.lng, 180);
  if (lat === null || lng === null) return null;
  return { id: String(f.id), name: String(f.name || 'Unnamed place'), kind: f.kind === 'bin' ? 'bin' : 'recycling', lat, lng, address: String(f.address || ''), notes: String(f.notes || ''), verified: !!f.verified, updated_at: f.updated_at || null };
}
let sharedFacilities = [];
let localFacilities = (store.get(KEYS.localFacilities, []) || []).map(normaliseFacility).filter(Boolean);
const directoryFacilities = () => cloudMode ? sharedFacilities : localFacilities;

const validTruck = x => x && x.id && x.route && /^\d{2}:\d{2}$/.test(x.time) && Number.isInteger(Number(x.weekday)) && Number(x.weekday) >= 0 && Number(x.weekday) <= 6;
let truckSchedules = (() => {
  const saved = store.get(KEYS.trucks, null);
  return Array.isArray(saved) ? saved.filter(validTruck).map(x => ({ ...x, weekday: Number(x.weekday) })) : DEFAULT_TRUCKS.map(x => ({ ...x }));
})();

/* ================= cloud (Supabase) ================= */
let db = null, cloudMode = false;
function reportToRow(r) {
  return { id: r.id, type: r.type, location: r.location, details: r.details, status: r.status, time: new Date(r.updated || r.created).toLocaleString(), created: r.created, lat: r.lat, lng: r.lng };
}
async function cloudLoadReports() {
  const { data, error } = await db.from('cleantown_reports').select('*').order('created', { ascending: false });
  if (error) throw error;
  reports = (data || []).map(normaliseReport).filter(Boolean);
  persistReports();
  renderReports();
}
async function cloudCreateReport(r) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { error } = await db.from('cleantown_reports').insert(reportToRow(r));
    if (!error) return r.id;
    if (error.code !== '23505') throw error; // unique violation: another device took this number
    const { data, error: idError } = await db.from('cleantown_reports').select('id');
    if (idError) throw idError;
    r.id = nextReportId((data || []).map(x => x.id).concat(reports.filter(x => x !== r).map(x => x.id)));
  }
  throw new Error('Could not allocate a tracking number. Please try again.');
}
async function cloudUpdateStatus(r) {
  const { error } = await db.from('cleantown_reports').update({ status: r.status, time: new Date(r.updated || Date.now()).toLocaleString() }).eq('id', r.id);
  if (error) throw error;
}
async function cloudLoadFacilities() {
  const { data, error } = await db.from('cleantown_facilities').select('*').order('name');
  if (error) throw error;
  sharedFacilities = (data || []).map(normaliseFacility).filter(Boolean);
  store.set(KEYS.cloudFacilities, sharedFacilities);
  renderFacilityAdmin();
  if (facilityRecords.length) searchFacilities(false);
}
async function cloudInit() {
  const cfg = window.CLEANTOWN_SUPABASE_CONFIG || {};
  if (!cfg.url || !cfg.anonKey || !window.supabase || !window.supabase.createClient) { updateConnectionUI(); return; }
  try {
    db = window.supabase.createClient(cfg.url, cfg.anonKey);
    const { error } = await db.from('cleantown_reports').select('id').limit(1);
    if (error) throw error;
    cloudMode = true;
    updateConnectionUI();
    await cloudLoadReports();
    await cloudLoadFacilities();
    db.channel('cleantown-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleantown_reports' }, () => cloudLoadReports().catch(e => console.warn('Report refresh failed', e)))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cleantown_facilities' }, () => cloudLoadFacilities().catch(e => console.warn('Facility refresh failed', e)))
      .subscribe();
  } catch (e) {
    db = null; cloudMode = false;
    updateConnectionUI('Supabase connection failed (' + (e.message || 'unknown error') + '). Running in local-only mode.');
    console.warn('CleanTown cloud setup error', e);
  }
}
function updateConnectionUI(message) {
  $$('[data-sync-label]').forEach(el => { el.textContent = cloudMode ? 'Live sync' : 'Concept demo'; });
  $$('.chip-sync').forEach(el => el.classList.toggle('live', cloudMode));
  $('adminConnectionState').textContent = cloudMode ? 'Supabase connected · live sync' : 'Local-only mode';
  $('accountSync').textContent = cloudMode ? 'Live sync is on: reports and places are shared across devices through Supabase.' : 'Data is saved in this browser only. Connect Supabase to share it across devices.';
  const setup = $('cloudSetupMessage');
  setup.textContent = cloudMode
    ? 'Live sync is on: report and place changes reach every open device.'
    : (message ? message + ' ' : '') + 'Changes are saved in this browser only. The README explains how to turn on live sync.';
  $('facilityAdminHint').textContent = cloudMode ? 'Places you add here sync to every resident’s Bins & centres search.' : 'Places you add here appear in this browser’s Bins & centres search. Connect Supabase to share them.';
  $('resetBtn').hidden = cloudMode;
}

/* ================= navigation ================= */
const PAGES = ['home', 'report', 'track', 'map', 'sort', 'trucks', 'manage'];
let currentPage = null;
const role = () => document.documentElement.getAttribute('data-role') === 'manager' ? 'manager' : 'resident';
function pageFromHash() { const h = location.hash.replace('#', ''); return PAGES.includes(h) ? h : 'home'; }
function navigate(page, opts = {}) {
  const requested = page;
  if (!PAGES.includes(page)) page = 'home';
  if (page === 'manage' && role() !== 'manager') page = 'home';
  const changed = page !== currentPage;
  $$('.page').forEach(p => p.classList.toggle('active', p.id === page));
  $$('.nav-item').forEach(b => {
    const on = b.dataset.page === page;
    b.classList.toggle('active', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  currentPage = page;
  if (changed && opts.push !== false) history.pushState({ page }, '', '#' + page);
  else if (page !== requested || location.hash !== '#' + page) history.replaceState({ page }, '', '#' + page); // e.g. a resident opening #manage
  if (changed) window.scrollTo(0, 0);
  moveIndicator();
  onShow(page, changed);
}
function onShow(page, changed) {
  if (page === 'home') renderHome();
  if (page === 'track') renderTrack();
  if (page === 'report') {
    if (changed && !$('reportSuccess').hidden) { $('reportSuccess').hidden = true; $('reportForm').hidden = false; }
    drawMap('reportPickMap', true);
  }
  if (page === 'map') showMapView(mapView);
  if (page === 'trucks') renderTrucks();
  if (page === 'manage') { renderManage(); drawMap('facilityPickMap', true); }
}
function moveIndicator() {
  const ind = $('navInd'), active = document.querySelector('.nav-item.active');
  if (!ind) return;
  if (!active || active.offsetParent === null) { ind.style.opacity = '0'; return; }
  ind.style.opacity = '1';
  if (isDesktop()) { ind.style.width = ''; ind.style.transform = `translateY(${active.offsetTop}px)`; }
  else { ind.style.width = active.offsetWidth + 'px'; ind.style.transform = `translateX(${active.offsetLeft}px)`; }
}
window.addEventListener('popstate', e => navigate((e.state && e.state.page) || pageFromHash(), { push: false }));
window.addEventListener('resize', () => moveIndicator());
document.addEventListener('click', e => {
  const nav = e.target.closest('[data-page]'); if (nav) { navigate(nav.dataset.page); return; }
  const go = e.target.closest('[data-go]'); if (go) navigate(go.dataset.go);
});
window.cleanTownNavigate = page => navigate(page);

/* ================= reports UI ================= */
function statusPill(status) { return `<span class="pill status ${statusClass(status)}">${escapeHTML(status)}</span>`; }
function stepsHTML(status) {
  const s = Math.max(0, STATUSES.indexOf(status));
  return `<ol class="steps" aria-label="Progress: ${escapeHTML(status)}">${STATUSES.map((label, i) => `<li class="${i < s ? 'done' : i === s ? 'now s' + s : ''}">${label}</li>`).join('')}</ol>`;
}
function reportCard(r, mode) {
  const issue = ISSUES[r.type] || { icon: 'alert' };
  const sev = SEV[severityFor(r)];
  const pinned = hasCoords(r);
  const meta = `<p class="report-meta"><span>${escapeHTML(r.id)}</span><span aria-hidden="true">·</span><span>${escapeHTML(timeAgo(r.updated || r.created))}${r.updated ? ' (updated)' : ''}</span>${pinned ? `<span aria-hidden="true">·</span><span>${icon('pin')} Pinned</span>` : ''}</p>`;
  let actions = '';
  if (mode === 'admin') {
    const label = r.status === 'Submitted' ? 'Start work' : r.status === 'In progress' ? 'Mark resolved' : 'Reopen';
    actions = `<div class="report-actions"><button class="btn ${r.status === 'Resolved' ? 'ghost' : 'primary'} sm" type="button" data-advance="${escapeHTML(r.id)}">${label}</button>${pinned ? `<button class="btn ghost sm" type="button" data-show-on-map="${escapeHTML(r.id)}">${icon('map', 'sm')}Show on map</button>` : ''}</div>`;
  } else if (mode === 'track' && pinned) {
    actions = `<div class="report-actions"><button class="btn ghost sm" type="button" data-show-on-map="${escapeHTML(r.id)}">${icon('map', 'sm')}Show on map</button></div>`;
  }
  const details = mode === 'home' ? '' : `<p class="report-details">${escapeHTML(r.details)}</p>`;
  const steps = mode === 'home' ? '' : stepsHTML(r.status);
  return `<article class="report${r.id === changedReportId ? ' changed' : ''}" data-report="${escapeHTML(r.id)}" style="--sev-bg:${sev.bg};--sev-ink:${sev.ink}">
    <span class="report-ic">${icon(issue.icon)}</span>
    <div class="report-main"><div class="report-top"><h3>${escapeHTML(r.type)}</h3>${statusPill(r.status)}</div>
    <p class="report-loc">${escapeHTML(r.location)}</p>${meta}${details}${steps}${actions}</div></article>`;
}
let changedReportId = null;
const emptyHTML = (msg, ic) => `<div class="empty">${icon(ic || 'list')}<span>${escapeHTML(msg)}</span></div>`;

function renderCounts() {
  const open = reports.filter(r => r.status !== 'Resolved').length;
  const resolved = reports.filter(r => r.status === 'Resolved').length;
  const progress = reports.filter(r => r.status === 'In progress').length;
  const submitted = reports.filter(r => r.status === 'Submitted').length;
  setCount($('statOpen'), submitted); setCount($('statProgress'), progress); setCount($('statResolved'), resolved);
  setCount($('adminTotal'), reports.length); setCount($('adminOpen'), open); setCount($('adminResolved'), resolved);
}
function renderHome() {
  renderCounts();
  $('recentReports').innerHTML = sortedReports().slice(0, 3).map(r => reportCard(r, 'home')).join('') || emptyHTML('No reports yet. Be the first to report a problem.');
  renderHomeTruck();
  $('demoBanner').hidden = store.raw(KEYS.demoBanner) === '1';
}
let trackStatus = 'all';
function renderTrack() {
  const q = $('searchReports').value.trim().toLowerCase();
  const list = sortedReports().filter(r => (trackStatus === 'all' || r.status === trackStatus) && `${r.id} ${r.type} ${r.location} ${r.details}`.toLowerCase().includes(q));
  $('allReports').innerHTML = list.map(r => reportCard(r, 'track')).join('') || emptyHTML(q || trackStatus !== 'all' ? 'No reports match this search.' : 'No reports yet.', 'search');
}
function renderManage() {
  renderCounts();
  $('adminReports').innerHTML = sortedReports().map(r => reportCard(r, 'admin')).join('') || emptyHTML('No reports to manage.');
  renderTruckAdmin();
  renderFacilityAdmin();
}
function renderReports() {
  renderCounts();
  if (currentPage === 'home') renderHome();
  if (currentPage === 'track') renderTrack();
  if (currentPage === 'manage') renderManage();
  if (currentPage === 'map' && mapView === 'hotspots') renderHotspots(false);
  changedReportId = null;
}

$('searchReports').addEventListener('input', renderTrack);
$('statusFilter').addEventListener('click', e => {
  const b = e.target.closest('[data-status]'); if (!b) return;
  trackStatus = b.dataset.status;
  $$('#statusFilter [data-status]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  renderTrack();
});
document.addEventListener('click', async e => {
  const adv = e.target.closest('[data-advance]');
  if (adv) {
    const r = reports.find(x => x.id === adv.dataset.advance); if (!r) return;
    const previous = r.status;
    r.status = r.status === 'Submitted' ? 'In progress' : r.status === 'In progress' ? 'Resolved' : 'Submitted';
    r.updated = Date.now();
    changedReportId = r.id;
    persistReports(); renderReports();
    if (cloudMode) {
      try { await cloudUpdateStatus(r); toast(`${r.id} is now ${r.status} · synced`); }
      catch (err) { r.status = previous; persistReports(); renderReports(); toast('Could not sync the status change: ' + (err.message || 'unknown error'), 'error'); }
    } else toast(`${r.id} is now ${r.status}`);
    return;
  }
  const show = e.target.closest('[data-show-on-map]');
  if (show) {
    hotspotIssue = 'all'; hotspotSev = 'all'; $('mapIssueFilter').value = 'all'; renderSeverityChips();
    hotspotSel = show.dataset.showOnMap; mapView = 'hotspots';
    navigate('map');
  }
});

/* ================= schematic map ================= */
const maps = {};
let pinScale = 1;
function mapPoint(lat, lng, center) { return { x: 400 + ((Number(lng) - center.lng) / 0.03) * 330, y: 240 - ((Number(lat) - center.lat) / 0.025) * 190 }; }
function pointCoords(x, y, center) { return { lat: center.lat + ((240 - y) / 190) * 0.025, lng: center.lng + ((x - 400) / 330) * 0.03 }; }
function mapViewBox(el) {
  const w = el.clientWidth, h = el.clientHeight;
  if (!w || !h) return null;
  let vw = 800, vh = 480;
  if (w / h < 800 / 480) vw = 480 * (w / h); else vh = 800 / (w / h);
  return { x: (800 - vw) / 2, y: (480 - vh) / 2, w: vw, h: vh, u: vw / w };
}
function mapBase(u, vb, pinPoints) {
  const fs = Math.min(11 * u, 15), pad = 20 * u;
  // Keep district labels inside the visible crop on narrow screens, and fade any label a pin sits on.
  const label = (x, y, t, fill) => {
    const w = t.length * fs * 0.72, lo = vb.x + 6 * u, hi = vb.x + vb.w - w - 6 * u;
    const cx = Math.max(lo, Math.min(x, hi));
    const covered = pinPoints.some(p => p.x > cx - pad && p.x < cx + w + pad && p.y > y - fs - pad && p.y < y + pad);
    return `<text class="map-label${covered ? ' dim' : ''}" x="${cx.toFixed(1)}" y="${y}" font-size="${fs.toFixed(1)}"${fill ? ` fill="${fill}"` : ''}>${t}</text>`;
  };
  return `<rect x="-200" y="-200" width="1200" height="880" fill="#E9F0E6"/>
  <path d="M-20 70 C140 120 210 40 330 110 S570 190 830 105 L830 150 C620 240 490 160 340 155 S120 180 -20 115Z" fill="#D5E7CC"/>
  <path d="M-20 360 C140 300 240 410 360 345 S610 280 830 365" fill="none" stroke="#A9D3E6" stroke-width="34"/>
  <path d="M-20 360 C140 300 240 410 360 345 S610 280 830 365" fill="none" stroke="#C6E4F1" stroke-width="22"/>
  <g fill="#DFE8D9" stroke="#C9D7C2" stroke-width="1.5"><rect x="54" y="72" width="125" height="75" rx="8"/><rect x="205" y="60" width="105" height="85" rx="8"/><rect x="490" y="54" width="130" height="82" rx="8"/><rect x="645" y="80" width="105" height="72" rx="8"/><rect x="60" y="190" width="110" height="88" rx="8"/><rect x="212" y="190" width="125" height="82" rx="8"/><rect x="430" y="188" width="120" height="78" rx="8"/><rect x="590" y="190" width="145" height="82" rx="8"/><rect x="75" y="405" width="120" height="45" rx="8"/><rect x="245" y="408" width="100" height="42" rx="8"/><rect x="470" y="408" width="110" height="42" rx="8"/><rect x="635" y="410" width="110" height="40" rx="8"/></g>
  <g fill="none" stroke-linecap="round"><path d="M-10 166 L810 166 M-10 300 L810 300 M190 -10 L190 500 M365 -10 L365 500 M565 -10 L565 500 M780 -10 L780 500" stroke="#fff" stroke-width="18"/><path d="M-10 166 L810 166 M-10 300 L810 300 M190 -10 L190 500 M365 -10 L365 500 M565 -10 L565 500 M780 -10 L780 500" stroke="#D4D9CF" stroke-width="1.5"/><path d="M25 20 L300 465 M330 15 L650 470 M790 20 L420 470" stroke="#fff" stroke-width="11"/></g>
  ${label(66, 100, 'LAKESIDE')}${label(218, 96, 'PRECINCT 2')}${label(500, 88, 'COMMUNITY HUB')}${label(655, 112, 'PARKVIEW')}${label(72, 222, 'CENTRAL PARK')}${label(224, 222, 'SHOP LOTS')}${label(442, 218, 'SCHOOL')}${label(602, 222, 'APARTMENTS')}${label(440, 338, 'RIVER CORRIDOR', '#3E7F9C')}`;
}
function pinSVG(mk, center, u, selected, index, animate) {
  if (!hasCoords(mk)) return '';
  const p = mapPoint(mk.lat, mk.lng, center);
  if (p.x < -40 || p.x > 840 || p.y < -40 || p.y > 520) return '';
  const r = (mk.r || 13) * pinScale, g = r * 1.25;
  const cls = ['pin', selected ? 'selected' : '', mk.origin ? 'origin' : '', mk.light ? 'light' : '', mk.static ? 'static' : '', animate ? 'pin-in' : ''].filter(Boolean).join(' ');
  const a11y = mk.static ? `role="img" aria-label="${escapeHTML(mk.label)}"` : `tabindex="0" role="button" aria-label="${escapeHTML(mk.label)}"`;
  return `<g transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) scale(${u.toFixed(4)})"><g class="${cls}" data-pin="${escapeHTML(mk.id)}" ${a11y} style="--pc:${mk.color};${animate ? `animation-delay:${Math.min(index, 14) * 35}ms` : ''}"><circle class="pin-halo" r="${r + 9}"/><circle class="pin-core" r="${r}"/>${mk.glyph ? `<use class="pin-glyph" href="#i-${mk.glyph}" x="${(-g / 2).toFixed(1)}" y="${(-g / 2).toFixed(1)}" width="${g.toFixed(1)}" height="${g.toFixed(1)}"/>` : ''}</g></g>`;
}
function registerMap(id, opts) {
  const el = $(id); if (!el) return;
  const m = { id, el, center: opts.center || CENTER, markers: [], selected: null, label: opts.label, badge: opts.badge || 'Concept map · not to scale', onPick: opts.onPick, onSelect: opts.onSelect, size: '', svg: null };
  maps[id] = m;
  el.addEventListener('click', e => {
    if (!m.svg) return;
    const pin = e.target.closest('[data-pin]');
    if (pin && !pin.classList.contains('static')) { if (m.onSelect) m.onSelect(pin.dataset.pin); return; }
    if (!m.onPick) return;
    const ctm = m.svg.getScreenCTM(); if (!ctm) return;
    const pt = m.svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(ctm.inverse());
    m.onPick(pointCoords(p.x, p.y, m.center));
  });
  el.addEventListener('keydown', e => {
    const pin = e.target.closest && e.target.closest('[data-pin]');
    if (pin && !pin.classList.contains('static') && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); if (m.onSelect) m.onSelect(pin.dataset.pin); }
  });
  if ('ResizeObserver' in window) {
    let raf = 0;
    new ResizeObserver(() => {
      const size = el.clientWidth + 'x' + el.clientHeight;
      if (size === m.size || !el.clientWidth) return;
      cancelAnimationFrame(raf); raf = requestAnimationFrame(() => drawMap(id, false));
    }).observe(el);
  }
}
function drawMap(id, animate) {
  const m = maps[id]; if (!m) return;
  const vb = mapViewBox(m.el); if (!vb) return;
  m.size = m.el.clientWidth + 'x' + m.el.clientHeight;
  pinScale = Math.max(0.72, Math.min(1, m.el.clientWidth / 640)); // keep phone maps from crowding
  const pins =m.markers.map((mk, i) => pinSVG(mk, m.center, vb.u, mk.id === m.selected, i, animate && !reducedMotion())).join('');
  m.el.innerHTML = `<svg viewBox="${vb.x.toFixed(1)} ${vb.y.toFixed(1)} ${vb.w.toFixed(1)} ${vb.h.toFixed(1)}" role="group" aria-label="${escapeHTML(m.label)}">${mapBase(vb.u, vb, m.markers.filter(hasCoords).map(mk => mapPoint(mk.lat, mk.lng, m.center)))}<g>${pins}</g></svg><span class="map-badge">${escapeHTML(m.badge)}</span>`;
  m.svg = m.el.querySelector('svg');
}
function setMapSelected(id, sel) {
  const m = maps[id]; if (!m) return;
  m.selected = sel;
  if (m.svg) m.svg.querySelectorAll('.pin').forEach(g => g.classList.toggle('selected', g.dataset.pin === sel));
}
const PICK_ID = '__pick';
function pickMarker(lat, lng) { return { id: PICK_ID, lat, lng, color: '#C2410C', r: 13, glyph: 'pin', light: true, static: true, label: 'Selected position' }; }

/* ================= hotspots ================= */
let mapView = 'hotspots', hotspotSel = null, hotspotIssue = 'all', hotspotSev = 'all', pendingSpot = null;
function hotspotRecords() {
  const samples = cloudMode ? [] : DEMO_HOTSPOTS.map(h => ({ ...h, lat: CENTER.lat + h.dy, lng: CENTER.lng + h.dx, source: 'sample' }));
  const resident = reports.map(r => ({ id: r.id, source: 'resident', type: r.type, location: r.location, description: r.details, status: r.status, severity: severityFor(r), lat: r.lat, lng: r.lng, created: r.created }));
  return [...resident, ...samples];
}
const filteredHotspots = () => hotspotRecords().filter(h => (hotspotIssue === 'all' || h.type === hotspotIssue) && (hotspotSev === 'all' || h.severity === hotspotSev));
function renderSeverityChips() {
  $('mapSeverityFilter').innerHTML = [['all', 'All', null], ...SEV_ORDER.map(k => [k, SEV[k].label, SEV[k].c])]
    .map(([k, label, c]) => `<button class="chip" type="button" data-sev="${k}" aria-pressed="${hotspotSev === k}">${c ? `<span class="swatch" style="--c:${c}"></span>` : ''}${label}</button>`).join('');
}
function renderHotspots(animate) {
  const list = filteredHotspots();
  if (!list.some(h => h.id === hotspotSel)) hotspotSel = (list.find(hasCoords) || list[0] || {}).id || null;
  const m = maps.townshipMap;
  m.markers = list.filter(hasCoords).map(h => ({ id: h.id, lat: h.lat, lng: h.lng, color: SEV[h.severity].c, r: SEV[h.severity].r, glyph: (ISSUES[h.type] || {}).icon || 'alert', label: `${h.location}: ${h.type}, ${SEV[h.severity].label}` }));
  if (pendingSpot) m.markers.push(pickMarker(pendingSpot.lat, pendingSpot.lng));
  m.selected = hotspotSel;
  drawMap('townshipMap', animate);
  const residentCount = list.filter(h => h.source === 'resident').length;
  $('mapResultsCount').textContent = `${list.length} shown · ${residentCount} from residents`;
  $('mapHotspotList').innerHTML = list.map(h => `<button type="button" class="map-item${h.id === hotspotSel ? ' active' : ''}" data-map-select="${escapeHTML(h.id)}" style="--c:${SEV[h.severity].c}"><span class="dot"></span><span class="map-item-main"><strong>${escapeHTML(h.location)}</strong><small>${escapeHTML(h.type)} · ${SEV[h.severity].label}${h.source === 'sample' ? ' · sample' : ' · ' + escapeHTML(h.id)}${hasCoords(h) ? '' : ' · no map pin'}</small></span>${h.source === 'resident' ? statusPill(h.status) : ''}</button>`).join('') || emptyHTML('Nothing matches these filters.', 'search');
  renderHotspotInfo();
}
function renderHotspotInfo() {
  const box = $('mapSelectedInfo');
  if (pendingSpot) {
    box.innerHTML = `<div class="info-top"><h3>Report a problem here?</h3></div><p class="hint">Position ${pendingSpot.lat.toFixed(5)}, ${pendingSpot.lng.toFixed(5)} (approximate, schematic map).</p><div class="row-actions"><button class="btn primary sm" type="button" id="reportHereBtn">${icon('plus', 'sm')}Report here</button><button class="btn ghost sm" type="button" id="cancelSpotBtn">Cancel</button></div>`;
    $('reportHereBtn').onclick = () => { const s = pendingSpot; pendingSpot = null; prefillReport(s); navigate('report'); };
    $('cancelSpotBtn').onclick = () => { pendingSpot = null; renderHotspots(false); };
    return;
  }
  const h = hotspotRecords().find(x => x.id === hotspotSel);
  if (!h) { box.innerHTML = '<div class="info-top"><h3>Pick a hotspot</h3></div><p class="hint">Tap a marker or a list item for details, or tap an empty spot on the map to report a problem there.</p>'; return; }
  const sev = SEV[h.severity];
  box.innerHTML = `<div class="info-top"><h3>${escapeHTML(h.location)}</h3><span class="pill sev" style="--sev-bg:${sev.bg};--sev-ink:${sev.ink}">${sev.label}</span>${h.source === 'resident' ? statusPill(h.status) : '<span class="pill sample">Sample</span>'}</div>
    <p><strong>${escapeHTML(h.type)}</strong> · ${h.source === 'resident' ? 'Resident report ' + escapeHTML(h.id) + ' · ' + escapeHTML(timeAgo(h.created)) : 'Illustrative sample hotspot'}</p>
    <p class="hint">${escapeHTML(h.description || 'No description supplied.')}</p>
    ${hasCoords(h) ? '' : '<p class="hint">No map pin: this report was sent without a position.</p>'}
    <div class="row-actions"><button class="btn ghost sm" type="button" id="reportNearbyBtn">${icon('plus', 'sm')}Report nearby</button>${h.source === 'resident' ? `<button class="btn ghost sm" type="button" id="trackThisBtn">${icon('list', 'sm')}Track</button>` : ''}</div>`;
  $('reportNearbyBtn').onclick = () => { if (hasCoords(h)) prefillReport({ lat: h.lat, lng: h.lng }); navigate('report'); };
  const t = $('trackThisBtn'); if (t) t.onclick = () => { $('searchReports').value = h.id; trackStatus = 'all'; $$('#statusFilter [data-status]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.status === 'all'))); navigate('track'); };
}
function selectHotspot(id, fromList) {
  pendingSpot = null;
  hotspotSel = id;
  const m = maps.townshipMap;
  if (m.markers.some(x => x.id === PICK_ID)) renderHotspots(false);
  else {
    setMapSelected('townshipMap', id);
    $$('#mapHotspotList .map-item').forEach(b => b.classList.toggle('active', b.dataset.mapSelect === id));
    renderHotspotInfo();
  }
  revealSelection(m.el, $$('#mapHotspotList .map-item').find(b => b.dataset.mapSelect === id), fromList);
}
/* Mobile: a list tap brings the map (and its info card) into view. Desktop: a pin tap scrolls the side list to the item. */
function revealSelection(mapEl, item, fromList) {
  const behavior = reducedMotion() ? 'auto' : 'smooth';
  if (fromList && !isDesktop()) mapEl.scrollIntoView({ behavior, block: 'start' });
  else if (!fromList && item && isDesktop()) item.scrollIntoView({ behavior, block: 'nearest' });
}
$('mapIssueFilter').addEventListener('change', e => { hotspotIssue = e.target.value; renderHotspots(true); });
$('mapSeverityFilter').addEventListener('click', e => { const b = e.target.closest('[data-sev]'); if (!b) return; hotspotSev = b.dataset.sev; renderSeverityChips(); renderHotspots(true); });
$('mapHotspotList').addEventListener('click', e => { const b = e.target.closest('[data-map-select]'); if (b) selectHotspot(b.dataset.mapSelect, true); });

/* ================= facilities ================= */
let facilityOrigin = null, originNote = 'the township centre', facilityRecords = [], facilitySel = null, facilityType = 'all';
const visibleFacilities = () => facilityRecords.filter(f => facilityType === 'all' || f.kind === facilityType);
/* Recycling points are filled brand-green; rubbish bins are hollow slate rings (map pins, list dots and legend). */
const FAC_COLOR = { recycling: '#0F5132', bin: '#4B5560' };
const facilityColor = kind => FAC_COLOR[kind === 'bin' ? 'bin' : 'recycling'];
function directionsURL(f) { return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(f.lat + ',' + f.lng) + '&travelmode=' + encodeURIComponent($('facilityTravelMode').value || 'walking'); }
function searchFacilities(animate) {
  if (!facilityOrigin) facilityOrigin = { lat: CENTER.lat, lng: CENTER.lng };
  const demos = DEMO_FACILITIES.map(f => ({ ...f, lat: CENTER.lat + f.dlat, lng: CENTER.lng + f.dlng, address: 'Concept location, Sime Darby Township', demo: true }));
  const shared = directoryFacilities().map(f => ({ ...f, id: 'dir/' + f.id, shared: true }));
  facilityRecords = [...shared, ...demos].map(f => ({ ...f, distance: distanceM(facilityOrigin, f) })).sort((a, b) => a.distance - b.distance);
  const visible = visibleFacilities();
  if (!visible.some(f => f.id === facilitySel)) facilitySel = visible[0] ? visible[0].id : null;
  renderFacilities(animate !== false);
}
function renderFacilityInfo() {
  const f = facilityRecords.find(x => x.id === facilitySel);
  const box = $('facilityInfo');
  if (!f) { box.innerHTML = '<div class="info-top"><h3>Pick a place</h3></div><p class="hint">Tap a marker or a list item to see details and get directions.</p>'; return; }
  const badge = f.demo ? '<span class="tag demo">Sample spot</span>' : f.verified ? '<span class="tag ok">Verified</span>' : '<span class="tag warn">Not verified</span>';
  box.innerHTML = `<div class="info-top"><h3>${escapeHTML(f.name)}</h3>${badge}</div>
    <p><strong>${f.kind === 'bin' ? 'Rubbish bin / waste point' : 'Recycling point'}</strong> · ${fmtDistance(f.distance)} straight-line from ${escapeHTML(originNote)}</p>
    <p class="hint">${escapeHTML(f.address || 'Address not listed')}${f.notes ? ' · ' + escapeHTML(f.notes) : ''}</p>
    ${f.demo ? '<p class="hint">Sample spot on the concept map. Directions open to its illustrative position.</p>' : ''}
    <div class="row-actions"><a class="btn primary sm" href="${escapeHTML(directionsURL(f))}" target="_blank" rel="noopener noreferrer">${icon('external', 'sm')}Directions</a></div>`;
}
function renderFacilities(animate) {
  if (!facilityOrigin) { searchFacilities(animate); return; }
  const list = visibleFacilities();
  const m = maps.facilityMap;
  m.markers = [...list.map(f => ({ id: f.id, lat: f.lat, lng: f.lng, color: facilityColor(f.kind), r: 12, glyph: f.kind === 'bin' ? 'sort' : 'recycle', light: f.kind === 'bin', label: `${f.name}, ${fmtDistance(f.distance)}` })),
    { id: 'origin', lat: facilityOrigin.lat, lng: facilityOrigin.lng, color: '#C2410C', r: 12, glyph: 'user', light: true, origin: true, static: true, label: 'Your starting point' }];
  m.selected = facilitySel;
  drawMap('facilityMap', animate);
  $('facilityCount').textContent = `${list.length} place${list.length === 1 ? '' : 's'}`;
  $('facilityResults').innerHTML = list.map(f => {
    const badge = f.demo ? '<span class="tag demo">Sample</span>' : f.verified ? '<span class="tag ok">Verified</span>' : '<span class="tag warn">Not verified</span>';
    return `<button class="map-item${f.id === facilitySel ? ' active' : ''}" type="button" data-fac-select="${escapeHTML(f.id)}" style="--c:${facilityColor(f.kind)}"><span class="dot${f.kind === 'bin' ? ' ring' : ''}"></span><span class="map-item-main"><strong>${escapeHTML(f.name)}</strong><small>${f.kind === 'bin' ? 'Rubbish bin' : 'Recycling point'}${f.notes ? ' · ' + escapeHTML(f.notes) : ''}</small><small>${badge}</small></span><span class="fac-dist">${fmtDistance(f.distance)}</span></button>`;
  }).join('') || emptyHTML('No places of this type yet. Managers can add them in Manage.', 'map');
  renderFacilityInfo();
}
function selectFacility(id, fromList) {
  facilitySel = id;
  setMapSelected('facilityMap', id);
  $$('#facilityResults [data-fac-select]').forEach(el => el.classList.toggle('active', el.dataset.facSelect === id));
  renderFacilityInfo();
  revealSelection(maps.facilityMap.el, $$('#facilityResults [data-fac-select]').find(x => x.dataset.facSelect === id), fromList);
}
function setOrigin(pos, note) {
  facilityOrigin = pos; originNote = note;
  $('facilityMessage').textContent = `Starting from ${note}. Distances are straight-line; directions open in Google Maps.`;
  searchFacilities(false);
}
function useFacilityLocation() {
  const msg = $('facilityMessage');
  if (!navigator.geolocation) { msg.textContent = 'This browser can’t share your location. Tap the map to choose a starting point.'; return; }
  msg.textContent = 'Asking for your location…';
  navigator.geolocation.getCurrentPosition(pos => {
    const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    if (distanceM(here, CENTER) > TOWNSHIP_RADIUS_M) { setOrigin({ lat: CENTER.lat, lng: CENTER.lng }, 'the township centre'); msg.textContent = `You’re about ${fmtDistance(distanceM(here, CENTER))} from the concept township, so distances start from the township centre.`; }
    else setOrigin(here, 'your location');
  }, err => {
    msg.textContent = err.code === 1 ? 'Location permission was denied. Tap the map to choose a starting point.' : 'Couldn’t get your location (it needs HTTPS or localhost). Tap the map instead.';
  }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 });
}
$('facilityLocateBtn').addEventListener('click', useFacilityLocation);
$('facilityTypeSeg').addEventListener('click', e => {
  const b = e.target.closest('[data-type]'); if (!b) return;
  facilityType = b.dataset.type;
  $$('#facilityTypeSeg [data-type]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  const visible = visibleFacilities();
  if (!visible.some(f => f.id === facilitySel)) facilitySel = visible[0] ? visible[0].id : null;
  renderFacilities(true);
});
$('facilityTravelMode').addEventListener('change', () => renderFacilities(false));
$('facilityResults').addEventListener('click', e => { const b = e.target.closest('[data-fac-select]'); if (b) selectFacility(b.dataset.facSelect, true); });

function showMapView(view) {
  mapView = view === 'facilities' ? 'facilities' : 'hotspots';
  $$('#mapViewSeg [data-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.view === mapView)));
  $('hotspotsView').hidden = mapView !== 'hotspots';
  $('facilitiesView').hidden = mapView !== 'facilities';
  if (mapView === 'hotspots') renderHotspots(true);
  else searchFacilities(true);
}
$('mapViewSeg').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) showMapView(b.dataset.view); });

/* ================= report form ================= */
let reportPin = null;
function setReportPin(pos, note) {
  reportPin = pos;
  const m = maps.reportPickMap;
  m.markers = pos ? [pickMarker(pos.lat, pos.lng)] : [];
  drawMap('reportPickMap', !!pos);
  $('reportLat').value = pos ? pos.lat.toFixed(6) : '';
  $('reportLng').value = pos ? pos.lng.toFixed(6) : '';
  $('clearPinBtn').hidden = !pos;
  $('locationMessage').textContent = note || (pos ? `Pin set at ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}.` : 'Tap the map to drop a pin, or use your location.');
}
function prefillReport(pos) { if (pos && hasCoords(pos)) setReportPin({ lat: pos.lat, lng: pos.lng }, 'Pin copied from the hotspot map. Adjust it by tapping the map.'); }
function renderCategoryChoices() {
  $('categoryChoices').innerHTML = Object.entries(ISSUES).map(([name, x], i) => `<label class="choice${i === 0 ? ' checked' : ''}"><input type="radio" name="category" value="${escapeHTML(name)}"${i === 0 ? ' checked' : ''}>${icon(x.icon, 'lg')}<strong>${escapeHTML(name)}</strong><span>${escapeHTML(x.desc)}</span></label>`).join('');
}
$('categoryChoices').addEventListener('change', () => $$('#categoryChoices .choice').forEach(c => c.classList.toggle('checked', c.querySelector('input').checked)));
$('useMyLocationBtn').addEventListener('click', () => {
  if (!navigator.geolocation) { $('locationMessage').textContent = 'This browser can’t share your location. Tap the map or enter coordinates.'; return; }
  $('locationMessage').textContent = 'Asking for your location…';
  navigator.geolocation.getCurrentPosition(pos => {
    const here = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    const far = distanceM(here, CENTER) > TOWNSHIP_RADIUS_M;
    setReportPin(here, far ? 'Location captured. You’re outside the concept township, so the pin sits off this schematic map but is still saved with the report.' : 'Location captured. Check the pin, then continue.');
  }, err => {
    $('locationMessage').textContent = err.code === 1 ? 'Location permission was denied. Tap the map or enter coordinates.' : 'Couldn’t get your location (it needs HTTPS or localhost). Tap the map instead.';
  }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 });
});
$('clearPinBtn').addEventListener('click', () => setReportPin(null));
['reportLat', 'reportLng'].forEach(id => $(id).addEventListener('change', () => {
  const lat = toCoord($('reportLat').value, 90), lng = toCoord($('reportLng').value, 180);
  if (lat !== null && lng !== null) { reportPin = { lat, lng }; maps.reportPickMap.markers = [pickMarker(lat, lng)]; drawMap('reportPickMap', false); $('clearPinBtn').hidden = false; $('locationMessage').textContent = `Pin set at ${lat.toFixed(5)}, ${lng.toFixed(5)}.`; }
}));
$('details').addEventListener('input', () => { $('detailsCount').textContent = `${$('details').value.length} / 1000`; });
let reportPhotoURL = null;
$('photo').addEventListener('change', e => {
  const f = e.target.files && e.target.files[0];
  if (reportPhotoURL) { URL.revokeObjectURL(reportPhotoURL); reportPhotoURL = null; }
  if (!f || !f.type.startsWith('image/')) { $('photoChip').hidden = true; if (f) toast('Please choose an image file.', 'error'); e.target.value = ''; return; }
  reportPhotoURL = URL.createObjectURL(f);
  $('photoThumb').style.backgroundImage = `url("${reportPhotoURL}")`; $('photoName').textContent = f.name || 'Photo'; $('photoChip').hidden = false;
});
$('photoRemove').addEventListener('click', () => { $('photo').value = ''; $('photoChip').hidden = true; if (reportPhotoURL) { URL.revokeObjectURL(reportPhotoURL); reportPhotoURL = null; } });
function fieldError(fieldId, errId, msg) { $(fieldId).classList.toggle('invalid', !!msg); $(errId).textContent = msg || ''; }
$('reportForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form = e.currentTarget;
  const type = (form.querySelector('input[name=category]:checked') || {}).value || 'Illegal dumping';
  const location = $('location').value.trim(), details = $('details').value.trim();
  fieldError('locationField', 'locationErr', location ? '' : 'Tell us where the problem is.');
  fieldError('detailsField', 'detailsErr', details ? '' : 'Describe what you saw.');
  const latRaw = $('reportLat').value.trim(), lngRaw = $('reportLng').value.trim();
  let msg = '';
  if ((latRaw === '') !== (lngRaw === '')) msg = 'Enter both latitude and longitude, or leave both blank.';
  const lat = latRaw ? toCoord(latRaw, 90) : null, lng = lngRaw ? toCoord(lngRaw, 180) : null;
  if (!msg && latRaw && (lat === null || lng === null)) msg = 'Latitude must be between -90 and 90, and longitude between -180 and 180.';
  $('reportMessage').textContent = msg;
  if (!location || !details || msg) { (!location ? $('location') : !details ? $('details') : $('reportLat')).focus(); return; }
  const r = normaliseReport({ id: nextReportId(reports.map(x => x.id)), type, location, details, status: 'Submitted', created: Date.now(), lat, lng });
  reports.unshift(r); persistReports(); changedReportId = r.id; renderCounts();
  const submit = $('reportSubmit'); submit.disabled = true;
  let note = 'Saved in this browser. Connect Supabase to share reports across devices.';
  if (cloudMode) {
    try { await cloudCreateReport(r); persistReports(); note = 'Synced to the shared database. Other CleanTown devices will see it.'; }
    catch (err) { note = 'Saved in this browser, but syncing failed: ' + (err.message || 'unknown error') + '.'; toast('Report saved locally but not synced.', 'error'); }
  }
  submit.disabled = false;
  $('successId').textContent = r.id;
  $('successNote').textContent = (hasCoords(r) ? 'It’s pinned on the hotspot map. ' : '') + note;
  form.hidden = true; $('reportSuccess').hidden = false; $('reportSuccess').focus();
  form.reset(); renderCategoryChoices(); setReportPin(null); $('detailsCount').textContent = '0 / 1000'; $('photoChip').hidden = true;
  if (reportPhotoURL) { URL.revokeObjectURL(reportPhotoURL); reportPhotoURL = null; }
  window.scrollTo({ top: 0, behavior: reducedMotion() ? 'auto' : 'smooth' });
});
$('successAnother').addEventListener('click', () => { $('reportSuccess').hidden = true; $('reportForm').hidden = false; drawMap('reportPickMap', false); $('location').focus(); });
$('successTrack').addEventListener('click', () => {
  const id = $('successId').textContent;
  $('reportSuccess').hidden = true; $('reportForm').hidden = false;
  $('searchReports').value = ''; trackStatus = 'all'; $$('#statusFilter [data-status]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.status === 'all')));
  navigate('track');
  const card = $$('#allReports .report').find(x => x.dataset.report === id);
  if (card) { card.classList.add('highlight'); card.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'center' }); }
});

/* ================= sort it (guide + photo) ================= */
let sortBin = 'all';
function renderBinFilter() {
  $('binFilter').innerHTML = [['all', 'All bins'], ...BIN_ORDER.map(k => [k, BINS[k].label])]
    .map(([k, label]) => `<button class="chip" type="button" data-bin="${k}" aria-pressed="${sortBin === k}"${k !== 'all' ? ` style="${binVars(k)}"` : ''}>${k !== 'all' ? '<span class="swatch"></span>' : ''}${escapeHTML(label)}</button>`).join('');
}
function renderGuide() {
  const q = $('searchGuide').value.trim().toLowerCase();
  const groups = BIN_ORDER.filter(k => sortBin === 'all' || sortBin === k).map(k => {
    const items = GUIDE.filter(g => g.bin === k && `${g.name} ${g.dest} ${BINS[k].long}`.toLowerCase().includes(q));
    if (!items.length) return '';
    const b = BINS[k];
    return `<section class="bin-group" style="${binVars(k)}" aria-label="${escapeHTML(b.long)}"><div class="bin-group-head"><span class="bin-ic">${icon(b.icon)}</span><div><h2>${escapeHTML(b.long)}</h2><p>${items.length} item${items.length === 1 ? '' : 's'}</p></div></div>
      ${items.map(g => `<button class="guide-item" type="button" data-guide="${escapeHTML(g.name)}">${icon(g.icon)}<span>${escapeHTML(g.name)}</span>${icon('chevron', 'chev')}</button>`).join('')}</section>`;
  }).join('');
  $('guideList').innerHTML = groups || emptyHTML('No items match. Try another word, or pick a bin above.', 'search');
}
function renderHomeBins() {
  // Moulded bin bodies in their category colour; orange takes dark ink for contrast.
  $('homeBins').innerHTML = ['paper', 'plastic', 'glass', 'general'].map(k => `<button class="bin-tile${k === 'plastic' ? ' dark-ink' : ''}" type="button" data-home-bin="${k}" style="${binVars(k)}"><span class="bin-ic">${icon(BINS[k].icon, 'lg')}</span>${escapeHTML(BINS[k].label)}</button>`).join('');
}
$('homeBins').addEventListener('click', e => { const b = e.target.closest('[data-home-bin]'); if (!b) return; sortBin = b.dataset.homeBin; $('searchGuide').value = ''; renderBinFilter(); renderGuide(); navigate('sort'); });
$('binFilter').addEventListener('click', e => { const b = e.target.closest('[data-bin]'); if (!b) return; sortBin = b.dataset.bin; renderBinFilter(); renderGuide(); });
$('searchGuide').addEventListener('input', renderGuide);
$('guideList').addEventListener('click', e => { const b = e.target.closest('[data-guide]'); if (!b) return; const g = guideByName(b.dataset.guide); if (g) openGuideSheet(g); });

function binArt(binKey, itemIcon) {
  const b = BINS[binKey] || BINS.general;
  return `<svg class="bin-art" viewBox="0 0 124 150" aria-hidden="true">
    <g class="bin-item"><use href="#i-${itemIcon}" x="44" y="2" width="36" height="36"/></g>
    <path d="M24 54h76l-7.4 82.6a9 9 0 0 1-9 8.4H40.4a9 9 0 0 1-9-8.4z" fill="${b.c}"/>
    <path d="M47 74v50M62 74v50M77 74v50" stroke="rgba(255,255,255,.4)" stroke-width="4.5" stroke-linecap="round"/>
    <g class="bin-lid"><rect x="16" y="42" width="92" height="14" rx="6" fill="${b.ci}"/><rect x="50" y="35" width="24" height="9" rx="4" fill="${b.ci}"/></g>
  </svg>`;
}
function ewasteHTML() {
  return `<div class="extra"><h3>Where to take e-waste</h3><p>Old phones, computers, TVs, fridges and other electrical items should go to a registered or authorised e-waste collector, not ordinary rubbish or mixed recycling.</p>
    <p><a href="${DOE_URL}" target="_blank" rel="noopener noreferrer">Search the official DOE collector directory ${icon('external', 'sm')}</a></p>
    <div class="collectors">${EWASTE.map(c => `<div class="collector"><strong>${escapeHTML(c.n)}</strong><p>${escapeHTML(c.a)}</p><p>${escapeHTML(c.d)}</p><a href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(c.q)}" target="_blank" rel="noopener noreferrer">Find on map ${icon('external', 'sm')}</a></div>`).join('')}</div>
    <p class="hint">Source: Malaysia Department of Environment (DOE) official collector directory. Listings and accepted items can change, and entries without a full address are map searches, not verified pins. Call ahead, especially for large appliances. For swollen or damaged batteries, don’t puncture or dismantle them; ask the collection point how to transport them safely.</p></div>`;
}
function foodHTML() {
  return `<div class="extra"><h3>Handling food waste</h3><ol>
    <li><strong>Separate it:</strong> keep food scraps apart from plastics, glass and paper, and drain excess liquid.</li>
    <li><strong>Compost suitable scraps:</strong> fruit and vegetable peels, coffee grounds, tea leaves and eggshells usually suit home or community composting. Follow the service’s accepted-items list.</li>
    <li><strong>Balance and cover:</strong> mix moist scraps with dry “browns” such as dry leaves or shredded uncoated cardboard, and cover fresh scraps to deter pests and odours.</li>
    <li><strong>Avoid common problems:</strong> no plastic, packaging or liquids. Meat, fish, dairy, oily food and cooked leftovers attract pests in basic home composters; add them only if your system accepts them.</li>
    <li><strong>No compost option?</strong> Use a council or community organic-waste collection if available; otherwise use the designated general-waste bin. Never leave food waste on the ground or in drains.</li></ol></div>`;
}
let sheetItem = null;
function openGuideSheet(item, ai) {
  sheetItem = item;
  const b = BINS[item.bin];
  const aiNote = ai ? `<div class="ai-note rise d1"><strong>Photo check:</strong> ${escapeHTML(ai.item || 'item')}${Number.isFinite(ai.confidence) ? ` · ${Math.round(ai.confidence * 100)}% confidence` : ''}.${ai.advice ? ' ' + escapeHTML(ai.advice) : ''}<br><span class="hint">Model: ${escapeHTML(ai.model || 'configured model')}. Photo checks can be wrong; please confirm.</span></div>` : '';
  $('guideSheetBody').style.cssText = binVars(item.bin);
  $('guideSheetBody').innerHTML = `<div class="sheet-head">${binArt(item.bin, item.icon)}<h2 id="guideSheetTitle">${escapeHTML(item.name)}</h2><span class="bin-chip"><i></i>${escapeHTML(b.long)}</span></div>
    ${aiNote}
    <p class="dest rise d1"><strong>Where it goes:</strong> ${escapeHTML(item.dest)}</p>
    <ol class="step-list rise d2">${item.steps.map(s => `<li>${escapeHTML(s)}</li>`).join('')}</ol>
    <div class="sheet-actions rise d3"><button class="btn primary block" type="button" id="sheetFindBtn">${icon('map')}Find the nearest drop-off</button></div>
    ${item.ewaste ? ewasteHTML() : ''}${item.food ? foodHTML() : ''}
    <p class="hint" style="margin-top:16px">Guidance is general. Check your council or recycling provider’s rules before you travel.</p>`;
  $('sheetFindBtn').onclick = () => { closeSheet($('guideSheet')); openGuideDirections(item); };
  openSheet($('guideSheet'));
  const art = $('guideSheetBody').querySelector('.bin-art');
  requestAnimationFrame(() => requestAnimationFrame(() => art && art.classList.add('play')));
}
function openUncertainSheet(ai) {
  sheetItem = null;
  $('guideSheetBody').style.cssText = '';
  $('guideSheetBody').innerHTML = `<div class="sheet-head"><span class="bin-ic" style="margin:16px auto 8px;width:64px;height:64px;border-radius:18px;background:var(--surface-2)">${icon('question', 'lg')}</span><h2 id="guideSheetTitle">We couldn’t tell what this is</h2></div>
    <p class="dest">${ai && ai.item ? 'The photo checker saw: <strong>' + escapeHTML(ai.item) + '</strong>. ' : ''}Many waste types, like batteries, cardboard and tissues, aren’t in its training labels. Pick the closest bin:</p>
    <div class="pick-bins">${BIN_ORDER.map(k => `<button type="button" data-pick-bin="${k}" style="${binVars(k)}"><i></i>${escapeHTML(BINS[k].long)}</button>`).join('')}</div>`;
  $$('[data-pick-bin]', $('guideSheetBody')).forEach(btn => btn.onclick = () => { const g = GUIDE.find(x => x.bin === btn.dataset.pickBin); if (g) openGuideSheet(g); });
  openSheet($('guideSheet'));
}
function openGuideDirections(item) {
  const kind = ['paper', 'plastic', 'glass', 'special'].includes(item.bin) ? 'recycling' : 'bin';
  facilityType = kind;
  $$('#facilityTypeSeg [data-type]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.type === kind)));
  mapView = 'facilities';
  facilitySel = null;
  navigate('map');
  $('facilityMessage').textContent = `Showing ${kind === 'bin' ? 'rubbish bins and waste points' : 'recycling points'} for “${item.name}”, nearest to ${originNote}.${item.bin === 'special' ? ' For batteries and e-waste, check the point accepts them, or use the DOE collector list in Sort it.' : ''}`;
}

let selectedWastePhoto = null, wastePreviewURL = null;
function handleWastePhoto(file) {
  const msg = $('wasteVisionMessage');
  msg.classList.remove('error');
  if (wastePreviewURL) { URL.revokeObjectURL(wastePreviewURL); wastePreviewURL = null; }
  selectedWastePhoto = null; $('wastePhotoPreviewWrap').hidden = true;
  if (!file) return;
  if (!file.type.startsWith('image/')) { msg.textContent = 'Please choose an image file.'; msg.classList.add('error'); return; }
  if (file.size > 12 * 1024 * 1024) { msg.textContent = 'Please choose an image smaller than 12 MB.'; msg.classList.add('error'); return; }
  selectedWastePhoto = file;
  wastePreviewURL = URL.createObjectURL(file);
  $('wastePhotoPreview').style.backgroundImage = `url("${wastePreviewURL}")`;
  $('wastePhotoPreviewWrap').hidden = false;
  msg.textContent = 'Photo ready. Tap Check photo, or pick the item below.';
}
['wastePhoto', 'wastePhotoCamera'].forEach(id => $(id).addEventListener('change', e => { handleWastePhoto(e.target.files && e.target.files[0]); e.target.value = ''; }));
function downscaleImage(file, maxSide) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => { URL.revokeObjectURL(url); resolve(blob || file); }, 'image/jpeg', 0.88);
      } catch (e) { URL.revokeObjectURL(url); resolve(file); }
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}
async function analyseWastePhoto() {
  const msg = $('wasteVisionMessage'), btn = $('recognizeWasteBtn');
  msg.classList.remove('error');
  if (!selectedWastePhoto) { msg.textContent = 'Take or upload a photo first.'; msg.classList.add('error'); return; }
  const cfg = window.CLEANTOWN_AI_CONFIG || {};
  if (!cfg.endpoint) { msg.textContent = 'Photo checking isn’t configured in ai-config.js. Pick the item below instead.'; msg.classList.add('error'); return; }
  if (location.protocol === 'file:') { msg.textContent = 'Photo checking needs the CleanTown server. Run server.py and open http://127.0.0.1:8787, or pick the item below.'; msg.classList.add('error'); return; }
  btn.disabled = true; btn.classList.add('busy'); btn.querySelector('span').textContent = 'Checking…';
  msg.textContent = 'Checking your photo…';
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 60000);
  try {
    const blob = await downscaleImage(selectedWastePhoto, 1280);
    const form = new FormData();
    form.append('image', blob, blob === selectedWastePhoto ? (selectedWastePhoto.name || 'photo.jpg') : 'photo.jpg');
    const headers = cfg.publicToken ? { Authorization: 'Bearer ' + cfg.publicToken } : {};
    const response = await fetch(cfg.endpoint, { method: 'POST', headers, body: form, signal: controller.signal });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || ('the server returned HTTP ' + response.status));
    const key = visionKey(data.category || data.label);
    const conf = Number(data.confidence);
    const ai = { item: data.item, advice: data.advice, model: data.model, confidence: Number.isFinite(conf) ? conf : undefined };
    msg.textContent = 'Done. Please double-check the suggestion.';
    if (!VISION[key]) openUncertainSheet(ai);
    else openGuideSheet(guideByName(VISION[key].guide), ai);
  } catch (err) {
    msg.textContent = 'Couldn’t check this photo: ' + (err.name === 'AbortError' ? 'the server took too long' : (err.message === 'Failed to fetch' ? 'the CleanTown server isn’t reachable' : err.message)) + '. Pick the item below instead.';
    msg.classList.add('error');
  } finally {
    clearTimeout(timer);
    btn.disabled = false; btn.classList.remove('busy'); btn.querySelector('span').textContent = 'Check photo';
  }
}
$('recognizeWasteBtn').addEventListener('click', analyseWastePhoto);

/* ================= sheets ================= */
function openSheet(d) {
  if (d.open) { d.classList.remove('closing'); return; }
  if (typeof d.showModal === 'function') d.showModal(); else d.setAttribute('open', '');
}
function closeSheet(d) {
  if (!d.open || d.classList.contains('closing')) return;
  if (reducedMotion()) { d.close ? d.close() : d.removeAttribute('open'); return; }
  d.classList.add('closing');
  setTimeout(() => { d.classList.remove('closing'); d.style.transform = ''; if (d.close) d.close(); else d.removeAttribute('open'); }, 300);
}
$$('dialog.sheet').forEach(d => {
  d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close-sheet]')) closeSheet(d); });
  d.addEventListener('cancel', e => { e.preventDefault(); closeSheet(d); });
  // Swipe down on the grip to dismiss (phones).
  const grip = d.querySelector('.sheet-grip'); if (!grip) return;
  let startY = null, dy = 0;
  grip.addEventListener('pointerdown', e => { startY = e.clientY; dy = 0; grip.setPointerCapture(e.pointerId); d.style.transition = 'none'; });
  grip.addEventListener('pointermove', e => { if (startY === null) return; dy = Math.max(0, e.clientY - startY); d.style.transform = `translateY(${dy}px)`; });
  const end = () => {
    if (startY === null) return;
    startY = null; d.style.transition = 'transform .3s cubic-bezier(.16,1,.3,1)';
    if (dy > 90) closeSheet(d); else d.style.transform = '';
  };
  grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
});
document.addEventListener('click', e => { if (e.target.closest('[data-account]')) openSheet($('accountSheet')); });

/* ================= trucks ================= */
function nextTruckDate(item, from) {
  const now = from || new Date();
  const [h, mi] = item.time.split(':').map(Number);
  const d = new Date(now); d.setHours(h, mi, 0, 0);
  let delta = (Number(item.weekday) - now.getDay() + 7) % 7;
  if (delta === 0 && d <= now) delta = 7;
  d.setDate(d.getDate() + delta);
  return d;
}
function fmtCountdown(ms) {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `in ${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  if (h < 24) return `in ${h} h${m ? ' ' + m + ' min' : ''}`;
  const d = Math.floor(h / 24), hh = h % 24;
  return `in ${d} day${d === 1 ? '' : 's'}${hh ? ' ' + hh + ' h' : ''}`;
}
const fmtDate = d => d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
const upcomingTrucks = () => truckSchedules.map(x => ({ ...x, next: nextTruckDate(x) })).sort((a, b) => a.next - b.next);
function nextTruckCard(x) {
  const bin = TRUCK_BIN[x.type] || 'general';
  return `<div class="truck-next"><span class="k">Next collection</span><span class="when">${escapeHTML(fmtDate(x.next))} · ${escapeHTML(x.time)}</span><span class="what">${escapeHTML(x.route)} <span class="bin-chip" style="${binVars(bin)}"><i></i>${escapeHTML(x.type)}</span></span><span class="count">${escapeHTML(fmtCountdown(x.next - Date.now()))}${x.notes ? ' · ' + escapeHTML(x.notes) : ''}</span></div>`;
}
function renderHomeTruck() {
  const next = upcomingTrucks()[0];
  $('homeTruck').innerHTML = next ? nextTruckCard(next) : emptyHTML('No collection routes have been published yet.', 'truck');
}
function renderTrucks() {
  const list = upcomingTrucks();
  $('truckNext').innerHTML = list[0] ? nextTruckCard(list[0]) : '';
  $('truckScheduleList').innerHTML = list.map(x => {
    const bin = TRUCK_BIN[x.type] || 'general';
    return `<div class="tt-row" style="${binVars(bin)}"><span class="tt-day">${WEEKDAYS[x.weekday].slice(0, 3)}<b>${x.next.getDate()}</b></span><div class="tt-main"><strong>${escapeHTML(x.route)}</strong><small>${escapeHTML(x.type)} · every ${WEEKDAYS[x.weekday]}</small>${x.notes ? `<small>${escapeHTML(x.notes)}</small>` : ''}</div><span class="tt-time">${escapeHTML(x.time)}<small>${escapeHTML(fmtCountdown(x.next - Date.now()))}</small></span></div>`;
  }).join('') || emptyHTML('No collection routes have been published yet.', 'truck');
  renderReminderUI();
}
function renderTruckAdmin() {
  $('truckScheduleAdminList').innerHTML = upcomingTrucks().map(x => `<div class="admin-row"><div class="grow"><strong>${escapeHTML(x.route)}</strong><small>${escapeHTML(x.type)} · ${WEEKDAYS[x.weekday]} ${escapeHTML(x.time)}${x.notes ? ' · ' + escapeHTML(x.notes) : ''}</small></div><button class="btn danger sm" type="button" data-delete-truck="${escapeHTML(x.id)}">${icon('trash', 'sm')}Remove</button></div>`).join('') || emptyHTML('No routes yet. Add one above.', 'truck');
}
function saveTrucks() { store.set(KEYS.trucks, truckSchedules); renderTruckAdmin(); renderHomeTruck(); if (currentPage === 'trucks') renderTrucks(); }
$('truckScheduleAdminForm').addEventListener('submit', e => {
  e.preventDefault();
  const item = { id: 'route-' + Date.now().toString(36), route: $('truckRouteName').value.trim(), type: $('truckWasteType').value, weekday: Number($('truckWeekday').value), time: $('truckTime').value, notes: $('truckNotes').value.trim() };
  if (!item.route) { toast('Enter a route or neighbourhood name.', 'error'); $('truckRouteName').focus(); return; }
  if (!/^\d{2}:\d{2}$/.test(item.time)) { toast('Enter an arrival time.', 'error'); $('truckTime').focus(); return; }
  truckSchedules.push(item); saveTrucks();
  e.target.reset(); $('truckTime').value = '08:00';
  toast(`Route added: ${item.route}`);
});
$('truckScheduleAdminList').addEventListener('click', e => {
  const b = e.target.closest('[data-delete-truck]'); if (!b) return;
  const x = truckSchedules.find(t => t.id === b.dataset.deleteTruck);
  truckSchedules = truckSchedules.filter(t => t.id !== b.dataset.deleteTruck); saveTrucks();
  if (x) toast(`Route removed: ${x.route}`);
});

const notificationsSupported = () => 'Notification' in window;
const remindersOn = () => store.raw(KEYS.reminders) === '1' && notificationsSupported() && Notification.permission === 'granted';
function renderReminderUI() {
  const status = $('truckReminderStatus'), btn = $('enableTruckReminders');
  if (!notificationsSupported()) { status.textContent = 'This browser doesn’t support notifications. On iPhone, add CleanTown to your Home Screen first.'; btn.hidden = true; return; }
  btn.hidden = false;
  if (remindersOn()) { status.textContent = 'On for this device. You’ll get one reminder within 24 hours of each collection while CleanTown is open.'; btn.textContent = 'Turn off'; btn.className = 'btn ghost sm'; }
  else if (Notification.permission === 'denied') { status.textContent = 'Notifications are blocked for this site. Allow them in your browser’s site settings to get reminders.'; btn.textContent = 'Turn on'; btn.className = 'btn primary sm'; }
  else { status.textContent = 'Get a reminder on this device the day before collection.'; btn.textContent = 'Turn on'; btn.className = 'btn primary sm'; }
}
async function showNotice(title, body, tag) {
  const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', tag };
  try {
    if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
      const reg = await Promise.race([navigator.serviceWorker.ready, new Promise(r => setTimeout(() => r(null), 3000))]);
      if (reg && reg.showNotification) { await reg.showNotification(title, opts); return true; }
    }
  } catch (e) { /* fall through to the page Notification API */ }
  try { new Notification(title, opts); return true; } catch (e) { return false; }
}
$('enableTruckReminders').addEventListener('click', async () => {
  if (remindersOn()) { store.del(KEYS.reminders); renderReminderUI(); toast('Collection reminders turned off'); return; }
  if (!window.isSecureContext) { $('truckReminderStatus').textContent = 'Reminders need HTTPS (or localhost during development).'; return; }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') { renderReminderUI(); return; }
    store.setRaw(KEYS.reminders, '1');
    renderReminderUI();
    await showNotice('CleanTown reminders are on', 'We’ll remind you the day before each collection while CleanTown is open.', 'cleantown-enabled');
    checkReminders();
  } catch (err) { $('truckReminderStatus').textContent = 'Couldn’t turn on reminders: ' + (err.message || 'please try again over HTTPS.'); }
});
function checkReminders() {
  if (!remindersOn()) return;
  const now = new Date();
  truckSchedules.forEach(x => {
    const next = nextTruckDate(x, now), ms = next - now;
    if (ms <= 0 || ms > 86400000) return;
    const key = `cleantown_truck_reminded_${x.id}_${next.getFullYear()}-${next.getMonth() + 1}-${next.getDate()}`;
    if (store.raw(key)) return;
    store.setRaw(key, '1');
    const when = next.toDateString() === now.toDateString() ? 'today' : 'tomorrow';
    showNotice(`Garbage truck ${when} at ${x.time}`, `${x.route}: ${x.type}. ${x.notes || 'Please prepare your waste for collection.'}`, 'cleantown-' + x.id);
  });
}
setInterval(checkReminders, 5 * 60 * 1000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) { checkReminders(); if (currentPage === 'trucks') renderTrucks(); } });
(function truckTimezoneNote() {
  const offset = new Date().getTimezoneOffset();
  if (offset !== -480) $('truckTzNote').textContent = 'Times shown in your device’s time zone';
})();

/* ================= manage: facilities, export, reset ================= */
let editingFacilityId = null, facilityPin = null;
function renderFacilityAdmin() {
  const list = directoryFacilities();
  $('sharedFacilityAdminList').innerHTML = list.map(f => `<div class="admin-row"><div class="grow"><strong>${escapeHTML(f.name)}</strong><small>${f.kind === 'bin' ? 'Rubbish bin / waste point' : 'Recycling point'} · ${escapeHTML(f.address)}</small><small>${f.lat.toFixed(5)}, ${f.lng.toFixed(5)} · ${f.verified ? 'verified' : 'not verified'}${f.notes ? ' · ' + escapeHTML(f.notes) : ''}</small></div><div class="row-actions"><button class="btn ghost sm" type="button" data-edit-facility="${escapeHTML(f.id)}">${icon('edit', 'sm')}Edit</button><button class="btn danger sm" type="button" data-delete-facility="${escapeHTML(f.id)}">${icon('trash', 'sm')}Remove</button></div></div>`).join('') || emptyHTML('No places added yet. Add a verified bin or recycling point above.', 'map');
}
function setFacilityPin(pos) {
  facilityPin = pos;
  maps.facilityPickMap.markers = pos ? [pickMarker(pos.lat, pos.lng)] : [];
  drawMap('facilityPickMap', !!pos);
  if (pos) { $('sharedFacilityLat').value = pos.lat.toFixed(6); $('sharedFacilityLng').value = pos.lng.toFixed(6); }
}
['sharedFacilityLat', 'sharedFacilityLng'].forEach(id => $(id).addEventListener('change', () => {
  const lat = toCoord($('sharedFacilityLat').value, 90), lng = toCoord($('sharedFacilityLng').value, 180);
  if (lat !== null && lng !== null) { facilityPin = { lat, lng }; maps.facilityPickMap.markers = [pickMarker(lat, lng)]; drawMap('facilityPickMap', false); }
}));
function resetFacilityEditor() {
  editingFacilityId = null;
  $('facilityAdminForm').reset();
  $('facilitySaveButton').querySelector('span').textContent = 'Add place';
  $('facilityCancelEdit').hidden = true;
  setFacilityPin(null);
}
$('facilityCancelEdit').addEventListener('click', resetFacilityEditor);
$('facilityAdminForm').addEventListener('submit', async e => {
  e.preventDefault();
  const facility = { name: $('sharedFacilityName').value.trim(), kind: $('sharedFacilityType').value === 'bin' ? 'bin' : 'recycling', address: $('sharedFacilityAddress').value.trim(), lat: toCoord($('sharedFacilityLat').value, 90), lng: toCoord($('sharedFacilityLng').value, 180), notes: $('sharedFacilityNotes').value.trim(), verified: $('sharedFacilityVerified').checked };
  if (!facility.name || !facility.address) { toast('Enter a name and a location.', 'error'); (!facility.name ? $('sharedFacilityName') : $('sharedFacilityAddress')).focus(); return; }
  if (facility.lat === null || facility.lng === null) { toast('Tap the map or enter a valid latitude and longitude.', 'error'); $('sharedFacilityLat').focus(); return; }
  const wasEditing = !!editingFacilityId;
  const btn = $('facilitySaveButton'); btn.disabled = true;
  try {
    if (cloudMode && db) {
      const res = editingFacilityId
        ? await db.from('cleantown_facilities').update({ ...facility, updated_at: new Date().toISOString() }).eq('id', editingFacilityId).select().single()
        : await db.from('cleantown_facilities').insert(facility).select().single();
      if (res.error) throw res.error;
      const saved = normaliseFacility(res.data);
      const i = sharedFacilities.findIndex(f => f.id === saved.id);
      if (i >= 0) sharedFacilities[i] = saved; else sharedFacilities.push(saved);
    } else {
      const now = new Date().toISOString();
      if (editingFacilityId) { const i = localFacilities.findIndex(f => f.id === editingFacilityId); if (i >= 0) localFacilities[i] = normaliseFacility({ ...localFacilities[i], ...facility, updated_at: now }); }
      else localFacilities.push(normaliseFacility({ id: 'local-' + Date.now().toString(36), ...facility, updated_at: now }));
      store.set(KEYS.localFacilities, localFacilities);
    }
    resetFacilityEditor(); renderFacilityAdmin();
    if (facilityRecords.length) searchFacilities(false);
    toast(`Place ${wasEditing ? 'updated' : 'added'}${cloudMode ? ' and synced' : ''}: ${facility.name}`);
  } catch (err) { toast('Couldn’t save the place: ' + (err.message || 'unknown error'), 'error'); }
  finally { btn.disabled = false; }
});
$('sharedFacilityAdminList').addEventListener('click', async e => {
  const edit = e.target.closest('[data-edit-facility]');
  if (edit) {
    const f = directoryFacilities().find(x => x.id === edit.dataset.editFacility); if (!f) return;
    editingFacilityId = f.id;
    $('sharedFacilityName').value = f.name; $('sharedFacilityType').value = f.kind; $('sharedFacilityAddress').value = f.address;
    $('sharedFacilityNotes').value = f.notes; $('sharedFacilityVerified').checked = f.verified;
    setFacilityPin({ lat: f.lat, lng: f.lng });
    $('facilitySaveButton').querySelector('span').textContent = 'Save changes';
    $('facilityCancelEdit').hidden = false;
    $('facilityAdminForm').scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth', block: 'start' });
    return;
  }
  const del = e.target.closest('[data-delete-facility]'); if (!del) return;
  const id = del.dataset.deleteFacility, f = directoryFacilities().find(x => x.id === id);
  if (!confirm(`Remove “${f ? f.name : 'this place'}” from the directory?`)) return;
  try {
    if (cloudMode && db) { const { error } = await db.from('cleantown_facilities').delete().eq('id', id); if (error) throw error; sharedFacilities = sharedFacilities.filter(x => x.id !== id); }
    else { localFacilities = localFacilities.filter(x => x.id !== id); store.set(KEYS.localFacilities, localFacilities); }
    if (editingFacilityId === id) resetFacilityEditor();
    renderFacilityAdmin();
    if (facilityRecords.length) searchFacilities(false);
    toast('Place removed');
  } catch (err) { toast('Couldn’t remove the place: ' + (err.message || 'unknown error'), 'error'); }
});
function csvCell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // stop spreadsheet formula injection from resident-entered text
  return '"' + s.replace(/"/g, '""') + '"';
}
$('exportBtn').addEventListener('click', () => {
  const rows = [['ID', 'Category', 'Location', 'Description', 'Status', 'Created', 'Last updated', 'Latitude', 'Longitude'],
    ...sortedReports().map(r => [r.id, r.type, r.location, r.details, r.status, new Date(r.created).toISOString(), r.updated ? new Date(r.updated).toISOString() : '', r.lat ?? '', r.lng ?? ''])];
  const csv = '﻿' + rows.map(row => row.map(csvCell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'cleantown-reports.csv';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  toast(`Exported ${rows.length - 1} reports`);
});
$('resetBtn').addEventListener('click', () => {
  if (cloudMode) return;
  if (!confirm('Reset reports to the sample data? Reports created in this browser will be removed.')) return;
  reports = seedReports(); persistReports(); renderReports(); toast('Demo data reset');
});

/* ================= session (simulated login) ================= */
function getSession() { try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch (e) { return null; } }
let loginRole = 'resident';
function setLoginRole(r) {
  loginRole = r === 'manager' ? 'manager' : 'resident';
  $$('[data-login-role]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.loginRole === loginRole)));
  $('loginTitle').textContent = loginRole === 'resident' ? 'Welcome back' : 'Management sign in';
  $('loginSubtitle').textContent = loginRole === 'resident' ? 'Sign in to help keep your neighbourhood clean.' : 'Sign in to manage reports, routes and places.';
  $('loginMessage').textContent = '';
}
function applySession(s) {
  const html = document.documentElement;
  if (s) { html.classList.add('signed-in'); html.setAttribute('data-role', s.role === 'manager' ? 'manager' : 'resident'); }
  else { html.classList.remove('signed-in'); html.removeAttribute('data-role'); }
  $('app').inert = !s;
  const letter = s ? (s.email || '?').trim().charAt(0).toUpperCase() : 'R';
  $$('[data-avatar]').forEach(el => { el.textContent = letter; });
  $('accountEmail').textContent = s ? s.email : '';
  $('accountRole').textContent = s && s.role === 'manager' ? 'Management demo account: you can update reports, routes and places.' : 'Resident demo account.';
  requestAnimationFrame(moveIndicator);
}
function signIn(email, r) {
  const session = { email, role: r, at: new Date().toISOString() };
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (e) { /* private mode: session lasts for this page only */ }
  const overlay = $('loginOverlay');
  const finish = () => { overlay.classList.remove('leaving'); applySession(session); navigate(r === 'manager' ? 'manage' : 'home'); toast(`Signed in to the ${r === 'manager' ? 'management' : 'resident'} demo`); };
  if (reducedMotion()) finish(); else { overlay.classList.add('leaving'); setTimeout(finish, 380); }
}
$$('[data-login-role]').forEach(b => b.addEventListener('click', () => setLoginRole(b.dataset.loginRole)));
$('togglePassword').addEventListener('click', () => {
  const pw = $('loginPassword'), reveal = pw.type === 'password';
  pw.type = reveal ? 'text' : 'password';
  $('togglePassword').textContent = reveal ? 'Hide' : 'Show';
  $('togglePassword').setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
  $('togglePassword').setAttribute('aria-pressed', String(reveal));
});
$('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const email = $('loginEmail'), pw = $('loginPassword');
  if (!email.value.trim() || !email.validity.valid) { $('loginMessage').textContent = 'Enter a valid email address.'; email.focus(); return; }
  if (pw.value.length < 4) { $('loginMessage').textContent = 'Use a password with at least 4 characters.'; pw.focus(); return; }
  signIn(email.value.trim(), loginRole);
});
$$('[data-demo-role]').forEach(b => b.addEventListener('click', () => signIn(b.dataset.demoRole === 'manager' ? 'manager@cleantown.demo' : 'resident@cleantown.demo', b.dataset.demoRole === 'manager' ? 'manager' : 'resident')));
$('logoutBtn').addEventListener('click', () => {
  try { sessionStorage.removeItem(SESSION_KEY); } catch (e) { /* ignore */ }
  closeSheet($('accountSheet'));
  $('loginForm').reset(); setLoginRole('resident');
  $('togglePassword').textContent = 'Show'; $('loginPassword').type = 'password';
  applySession(null);
  navigate('home', { push: false });
  history.replaceState({ page: 'home' }, '', '#home');
});
$('dismissDemoBanner').addEventListener('click', () => { store.setRaw(KEYS.demoBanner, '1'); $('demoBanner').hidden = true; });

/* ================= boot ================= */
registerMap('townshipMap', { label: 'Schematic township map with hotspot markers', onSelect: id => selectHotspot(id, false), onPick: pos => { pendingSpot = pos; renderHotspots(false); } });
registerMap('facilityMap', { label: 'Schematic map of recycling points and rubbish bins', onSelect: id => selectFacility(id), onPick: pos => setOrigin(pos, 'the point you tapped') });
registerMap('reportPickMap', { label: 'Tap to place the report pin', badge: 'Tap to drop a pin', onPick: pos => setReportPin(pos, `Pin dropped at ${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)} (approximate, schematic map).`) });
registerMap('facilityPickMap', { label: 'Tap to place the facility', badge: 'Tap to place it', onPick: pos => setFacilityPin(pos) });

renderCategoryChoices();
renderHomeBins();
renderBinFilter();
renderGuide();
renderSeverityChips();
$('hotspotLegend').innerHTML = SEV_ORDER.map(k => `<span><i style="background:${SEV[k].c}"></i>${SEV[k].label}${k === 'green' ? ' / resolved' : ''}</span>`).join('');
updateConnectionUI();
const session = getSession();
applySession(session && session.email && session.role ? session : null);
const startPage = pageFromHash();
history.replaceState({ page: startPage }, '', '#' + startPage);
navigate(startPage, { push: false });
checkReminders();
cloudInit();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveIndicator);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(err => console.warn('Service worker registration failed', err)));
}
})();
