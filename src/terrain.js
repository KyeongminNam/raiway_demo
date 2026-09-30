export const RES = 0.02;
export const X_RANGE = [-3.0, 13.0];
export const Y_RANGE = [-4.0, 4.0];
const STAIR_MAX_SLOPE = 35 * Math.PI / 180;
const SPAWN_HALF_LENGTH = 0.75;
const HOLE_LANE_WIDTH = 3.0;

export class Terrain {
  constructor(heights, nx, ny, res = RES, x0 = X_RANGE[0], y0 = Y_RANGE[0]) {
    Object.assign(this, { h: heights, nx, ny, res, x0, y0 });
  }

  height(x, y) {
    const fx = Math.min(Math.max((x - this.x0) / this.res, 0), this.nx - 1.000001);
    const fy = Math.min(Math.max((y - this.y0) / this.res, 0), this.ny - 1.000001);
    const ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy;
    const h = this.h, nx = this.nx, i = iy * nx + ix;
    return (1 - tx) * (1 - ty) * h[i] + tx * (1 - ty) * h[i + 1]
      + (1 - tx) * ty * h[i + nx] + tx * ty * h[i + nx + 1];
  }

  inside(x, y, margin) {
    return x > this.x0 + margin && x < this.x0 + (this.nx - 1) * this.res - margin
      && y > this.y0 + margin && y < this.y0 + (this.ny - 1) * this.res - margin;
  }
}

function makeGrid(fn) {
  const nx = Math.round((X_RANGE[1] - X_RANGE[0]) / RES) + 1;
  const ny = Math.round((Y_RANGE[1] - Y_RANGE[0]) / RES) + 1;
  const h = new Float64Array(nx * ny);
  for (let iy = 0; iy < ny; iy++)
    for (let ix = 0; ix < nx; ix++)
      h[iy * nx + ix] = fn(X_RANGE[0] + ix * RES, Y_RANGE[0] + iy * RES, ix);
  return new Terrain(h, nx, ny);
}

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function flat() {
  return makeGrid(() => 0);
}

export function stairs(level, { nSteps = 8, start = SPAWN_HALF_LENGTH, topLength = 2.0 } = {}) {
  const stepHeight = 0.02 + 0.28 * level;
  const stepWidth = Math.max(stepHeight / Math.tan(STAIR_MAX_SLOPE), 0.3) + 0.1;
  const downStart = start + nSteps * stepWidth + topLength;
  const clampSteps = (k) => Math.min(Math.max(k, 0), nSteps);
  return makeGrid((x) => {
    const k = x >= downStart
      ? clampSteps(nSteps - Math.floor((x - downStart) / stepWidth) - 1)
      : clampSteps(Math.floor((x - start) / stepWidth) + 1);
    return k * stepHeight;
  });
}

export function holes(level, { seed = 0 } = {}) {
  const depth = 0.05 + 0.75 * level * level;
  const rand = mulberry32(seed + 1);
  const nx = Math.round((X_RANGE[1] - X_RANGE[0]) / RES) + 1;
  const lanes = [0, 1].map(() => {
    const lane = new Float64Array(nx).fill(-depth);
    let start = X_RANGE[0] - 0.6 + 1.3 * rand();
    while (start < X_RANGE[1]) {
      const end = start + 0.3 + 0.3 * rand();
      const top = -0.1 + 0.2 * rand();
      const i0 = Math.max(0, Math.ceil((start - X_RANGE[0]) / RES - 1e-9));
      const i1 = Math.min(nx - 1, Math.floor((end - X_RANGE[0]) / RES + 1e-9));
      for (let i = i0; i <= i1; i++) lane[i] = top;
      start = end + 0.4 + 0.3 * rand();
    }
    return lane;
  });
  return makeGrid((x, y, ix) => {
    if (Math.abs(x) <= SPAWN_HALF_LENGTH && Math.abs(y) <= HOLE_LANE_WIDTH) return 0;
    if (Math.abs(y) > HOLE_LANE_WIDTH) return -depth;
    if (Math.abs(y) <= RES / 2 + 1e-9) return Math.min(lanes[0][ix], lanes[1][ix]);
    return lanes[y > 0 ? 0 : 1][ix];
  });
}

export function hurdles(level, { thickness = 0.05, spacing = 1.5, start = 1.0 } = {}) {
  const height = 0.02 + 0.28 * level;
  return makeGrid((x) => {
    const phase = (((x - start + thickness / 2) % spacing) + spacing) % spacing;
    return x >= start - thickness / 2 && phase < thickness ? height : 0;
  });
}

export const TERRAINS = { flat, stairs, holes, hurdles };

export function describe(name, level) {
  const cm = (m) => `${(100 * m).toFixed(0)} cm`;
  if (name === 'stairs') return `step ${cm(0.02 + 0.28 * level)}`;
  if (name === 'holes') return `depth ${cm(0.05 + 0.75 * level * level)}`;
  if (name === 'hurdles') return `height ${cm(0.02 + 0.28 * level)}`;
  return '';
}
