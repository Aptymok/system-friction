export type ProjectedPoint = {
  x: number;
  y: number;
  visible: boolean;
  depth: number;
};

const RAD = Math.PI / 180;

export function clamp01(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function orthographicProject(input: {
  lat: number;
  lon: number;
  rotation: number;
  cx: number;
  cy: number;
  radius: number;
}): ProjectedPoint {
  const lat = input.lat * RAD;
  const lon = (input.lon + input.rotation) * RAD;
  const cosLat = Math.cos(lat);
  const x = input.cx + input.radius * cosLat * Math.sin(lon);
  const y = input.cy - input.radius * Math.sin(lat);
  const depth = cosLat * Math.cos(lon);
  return { x, y, visible: depth >= -0.08, depth };
}

export function greatCircleArc(input: {
  fromLat: number;
  fromLon: number;
  toLat: number;
  toLon: number;
  rotation: number;
  cx: number;
  cy: number;
  radius: number;
  steps?: number;
}) {
  const steps = input.steps ?? 38;
  const from = toVector(input.fromLat, input.fromLon);
  const to = toVector(input.toLat, input.toLon);
  const dot = clamp(-1, 1, from.x * to.x + from.y * to.y + from.z * to.z);
  const omega = Math.acos(dot);
  const sinOmega = Math.sin(omega) || 1;

  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps;
    const a = Math.sin((1 - t) * omega) / sinOmega;
    const b = Math.sin(t * omega) / sinOmega;
    const x = a * from.x + b * to.x;
    const y = a * from.y + b * to.y;
    const z = a * from.z + b * to.z;
    const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) / RAD;
    const lon = Math.atan2(y, x) / RAD;
    return orthographicProject({ lat, lon, rotation: input.rotation, cx: input.cx, cy: input.cy, radius: input.radius });
  });
}

function clamp(min: number, max: number, value: number) {
  return Math.max(min, Math.min(max, Number.isFinite(value) ? value : min));
}

function toVector(latDeg: number, lonDeg: number) {
  const lat = latDeg * RAD;
  const lon = lonDeg * RAD;
  return {
    x: Math.cos(lat) * Math.cos(lon),
    y: Math.cos(lat) * Math.sin(lon),
    z: Math.sin(lat),
  };
}

export const roughContinents: Array<Array<[number, number]>> = [
  [[72, -168], [70, -118], [58, -92], [50, -62], [25, -80], [8, -78], [-8, -60], [-35, -70], [-55, -66], [-42, -42], [-12, -36], [10, -50], [32, -62], [52, -104], [62, -138], [72, -168]],
  [[72, -20], [63, 28], [45, 58], [20, 48], [8, 35], [-35, 20], [-35, 45], [-22, 52], [5, 46], [28, 62], [50, 88], [66, 128], [70, 170], [50, 178], [40, 125], [22, 105], [8, 78], [-8, 108], [-34, 118], [-43, 146], [-20, 154], [8, 132], [28, 100], [44, 76], [58, 42], [72, -20]],
  [[35, -18], [31, 10], [15, 24], [2, 42], [-26, 34], [-35, 18], [-26, 8], [-2, 10], [12, 0], [35, -18]],
  [[-62, -70], [-70, -20], [-66, 40], [-72, 120], [-66, 178], [-76, 150], [-78, 20], [-74, -88], [-62, -70]],
];
