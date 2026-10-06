/**
 * Regenerate src/data/worldCoastlineData.ts from Natural Earth 1:50m land polygons.
 *
 *   node scripts/generate_coastline.cjs
 *
 * Renderer context: Globe3D bakes an equirectangular texture at TEX_W x TEX_H,
 * so we simplify in degrees with a tolerance that stays well under one texel and
 * drop polygons too small to occupy a visible number of texels. Keep TEX_W/TEX_H
 * in step with createWorldTexture() in src/components/globe/Globe3D.tsx.
 *
 * The GLOBAL_TECH_LIGHTS block at the end of the data file is hand-maintained and
 * is carried over verbatim, so editing it there is safe.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const TEX_W = 4096;
const TEX_H = 2048;
const DEG_PER_PX = 360 / TEX_W;            // 0.0879 deg per texel
const RDP_TOLERANCE = DEG_PER_PX * 0.35;   // ~1/3 texel -> visually lossless
const MIN_PIXEL_AREA = 6;                  // drop islands under ~6 texels

const SOURCE_URL =
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson';
const CACHE = path.join(__dirname, '.ne_50m_land.geojson');
const OUT_FILE = path.join(__dirname, '..', 'src', 'data', 'worldCoastlineData.ts');

if (!fs.existsSync(CACHE)) {
  console.log(`downloading ${SOURCE_URL}`);
  execFileSync('curl', ['-sSL', '-o', CACHE, SOURCE_URL], { stdio: 'inherit' });
}
const src = JSON.parse(fs.readFileSync(CACHE, 'utf8'));

// --- Ramer-Douglas-Peucker -------------------------------------------------
function perpDist(p, a, b) {
  let dx = b[0] - a[0];
  let dy = b[1] - a[1];
  if (dx === 0 && dy === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
  const cl = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - (a[0] + cl * dx), p[1] - (a[1] + cl * dy));
}

function rdp(points, eps) {
  if (points.length < 3) return points.slice();
  let maxD = 0;
  let idx = 0;
  const a = points[0];
  const b = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDist(points[i], a, b);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= eps) return [a, b];
  const left = rdp(points.slice(0, idx + 1), eps);
  const right = rdp(points.slice(idx), eps);
  return left.slice(0, -1).concat(right);
}

// Simplify a closed ring without collapsing it: split at the two most distant
// anchor points so RDP can't shortcut the whole loop into a line.
function simplifyRing(ring, eps) {
  let pts = ring.slice();
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) pts.pop();
  if (pts.length < 4) return pts;

  let far = 0;
  let maxD = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[0][0], pts[i][1] - pts[0][1]);
    if (d > maxD) { maxD = d; far = i; }
  }
  const halfA = rdp(pts.slice(0, far + 1), eps);
  const halfB = rdp(pts.slice(far).concat([pts[0]]), eps);
  return halfA.slice(0, -1).concat(halfB.slice(0, -1));
}

// --- geometry helpers ------------------------------------------------------
function shoelaceArea(ring) {
  let s = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    s += (ring[j][0] * ring[i][1]) - (ring[i][0] * ring[j][1]);
  }
  return Math.abs(s) / 2; // in deg^2
}

// deg^2 -> texel^2 at equirectangular TEX_W x TEX_H
const PX_PER_DEG_X = TEX_W / 360;
const PX_PER_DEG_Y = TEX_H / 180;
const pixelArea = (ring) => shoelaceArea(ring) * PX_PER_DEG_X * PX_PER_DEG_Y;

function bbox(ring) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of ring) {
    if (x < minX) minX = x; if (x > maxX) maxX = x;
    if (y < minY) minY = y; if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

function pointInRing(pt, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
    if ((yi > pt[1]) !== (yj > pt[1]) &&
        pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

// Sites the app pins on the globe - never drop the landmass under them.
const KEEP_SITES = [
  [103.8198, 1.3521],  [121.5654, 25.0330], [139.6917, 35.6895],
  [130.7079, 32.8031], [126.9780, 37.5665], [114.0579, 22.5431],
  [121.4737, 31.2304], [77.5946, 12.9716],  [-97.7431, 30.2672],
  [-121.9552, 37.3541],[-112.0740, 33.4484],[-74.0060, 40.7128],
  [13.7373, 51.0504],  [-6.4908, 53.3623],  [5.3780, 51.4416],
  [-0.1278, 51.5074],  [151.2093, -33.8688],
];

// --- naming ----------------------------------------------------------------
// Label the notable landmasses by centroid proximity so the dataset stays
// readable/debuggable; everything else is a generic landmass.
// Natural Earth keeps Africa joined to Eurasia at Suez and the Americas joined
// at Panama, so those land on one ring each and are named accordingly.
const NAMED = [
  ['Afro-Eurasia', 90, 55], ['Americas', -100, 45], ['Antarctica', 0, -82],
  ['Australia', 134, -25],
  ['Greenland', -42, 74], ['New Guinea', 141, -5], ['Borneo', 114, 0],
  ['Madagascar', 47, -19], ['Baffin Island', -70, 68], ['Sumatra', 102, -2],
  ['Honshu', 138, 36], ['Great Britain', -2, 54], ['Victoria Island', -110, 71],
  ['Ellesmere Island', -80, 79], ['Sulawesi', 121, -2], ['South Island (NZ)', 170, -44],
  ['Java', 110, -7], ['North Island (NZ)', 176, -39], ['Cuba', -79, 22],
  ['Newfoundland', -56, 48], ['Luzon', 121, 16], ['Iceland', -18, 65],
  ['Mindanao', 125, 8], ['Ireland', -8, 53], ['Hokkaido', 143, 43],
  ['Hispaniola', -71, 19], ['Sakhalin', 143, 51], ['Tasmania', 147, -42],
  ['Sri Lanka', 81, 8], ['Taiwan', 121, 24], ['Hainan', 110, 19],
];

// A landmass is whichever reference point actually falls inside it - exact,
// unlike centroid proximity (a ring's vertex mean can sit off the landmass).
function nameFor(ring, used) {
  for (const [n, nx, ny] of NAMED) {
    if (used.has(n)) continue;
    if (pointInRing([nx, ny], ring)) return n;
  }
  return null;
}

// --- build -----------------------------------------------------------------
const rings = [];
for (const f of src.features) {
  const geom = f.geometry;
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates;
  for (const poly of polys) rings.push(poly[0]); // outer ring
}

let kept = [];
let droppedTiny = 0;
for (const ring of rings) {
  const area = pixelArea(ring);
  const hasSite = KEEP_SITES.some((s) => pointInRing(s, ring));
  if (area < MIN_PIXEL_AREA && !hasSite) { droppedTiny++; continue; }

  const simp = simplifyRing(ring, RDP_TOLERANCE);
  if (simp.length < 3) { droppedTiny++; continue; }
  kept.push({ ring: simp, area, bb: bbox(simp) });
}

// Largest first so big continents paint under small islands.
kept.sort((a, b) => b.area - a.area);

// Thresholds in texel^2: the three joined continental masses dwarf everything
// else, and major islands sit well above the islet noise floor.
// (Hainan, the smallest named island, measures ~375; the 90th percentile of all
// rings is ~73, so 250 cleanly separates real islands from coastal specks.)
const categoryFor = (area) =>
  area > 2.0e5 ? 'continent' : area > 250 ? 'island' : 'islet';

const usedNames = new Set();
let totalPts = 0;
const entries = kept.map((k, i) => {
  totalPts += k.ring.length;
  const found = nameFor(k.ring, usedNames);
  if (found) usedNames.add(found);
  const nm = found || `Landmass ${i + 1}`;
  const coords = k.ring
    .map(([x, y]) => `[${(+x).toFixed(3)},${(+y).toFixed(3)}]`)
    .join(',');
  return `  { name: ${JSON.stringify(nm)}, category: '${categoryFor(k.area)}', points: [${coords}] },`;
});

const header = `/**
 * Accurate world coastline vector dataset.
 *
 * Source: Natural Earth 1:50m physical land polygons (public domain),
 * https://github.com/nvkelso/natural-earth-vector -> geojson/ne_50m_land.geojson
 *
 * Generated, not hand-authored. Outer rings only, simplified with
 * Ramer-Douglas-Peucker at ${RDP_TOLERANCE.toFixed(4)} deg (~1/3 of a texel on the
 * ${TEX_W}x${TEX_H} equirectangular globe texture, i.e. visually lossless), with
 * polygons under ${MIN_PIXEL_AREA} texels dropped unless they carry a fab site.
 *
 * ${kept.length} polygons / ${totalPts} points. Coordinates are [longitude, latitude]
 * in WGS84, ordered largest landmass first so continents paint beneath islands.
 */

export interface DetailedLandPolygon {
  name: string;
  category: 'continent' | 'island' | 'islet';
  points: [number, number][];
}

export const HIGH_RES_WORLD_POLYGONS: DetailedLandPolygon[] = [
`;

// Carry over the hand-maintained tech-hub block from the existing file so this
// script only ever owns the coastline half.
const LIGHTS_ANCHOR = '// Major tech hub light clusters';
const existing = fs.existsSync(OUT_FILE) ? fs.readFileSync(OUT_FILE, 'utf8') : '';
const anchorAt = existing.indexOf(LIGHTS_ANCHOR);
if (anchorAt === -1) {
  console.error(
    `refusing to write: could not find the "${LIGHTS_ANCHOR}" block in ${OUT_FILE}.\n` +
    'That block is hand-maintained and would be lost.'
  );
  process.exit(1);
}
const lightsBlock = existing.slice(anchorAt);

fs.writeFileSync(OUT_FILE, header + entries.join('\n') + '\n];\n\n' + lightsBlock);

console.log(`wrote             : ${path.relative(path.join(__dirname, '..'), OUT_FILE)}`);
console.log(`source rings      : ${rings.length}`);
console.log(`dropped (tiny)    : ${droppedTiny}`);
console.log(`kept polygons     : ${kept.length}`);
console.log(`points after RDP  : ${totalPts} (was ${rings.reduce((a, r) => a + r.length, 0)})`);
console.log(`rdp tolerance     : ${RDP_TOLERANCE.toFixed(4)} deg`);
