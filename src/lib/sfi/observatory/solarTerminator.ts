// Terminador día/noche calculado con la posición solar real (no decorativo).
// El mapa base (codex-operational-reference.png) es una proyección equirectangular
// estándar: x en [0,100] -> longitud [-180,180], y en [0,100] -> latitud [90,-90].
// Los nodos del Observatorio ya usan ese mismo sistema (worldInterfaceState.ts),
// así que el terminador se calcula en las mismas unidades para superponerse
// exactamente sobre el mapa y los nodos sin transformación adicional.
//
// Precisión: ~0.5-1° — suficiente para una lectura visual honesta de qué zona
// del planeta está en luz solar en este momento. No usa APIs externas ni
// dependencias: es geometría solar estándar (declinación + ecuación de tiempo
// aproximada), determinista y verificable.

export type LonLat = { lon: number; lat: number };
export type MapPoint = { x: number; y: number };

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

function dayOfYear(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const diff = date.getTime() - start;
  return Math.floor(diff / 86400000);
}

/**
 * Declinación solar (grados) para una fecha dada. Aproximación estándar
 * (Cooper, 1969), error < 0.5°.
 */
function solarDeclination(date: Date): number {
  const n = dayOfYear(date);
  return 23.44 * Math.sin(toRad((360 / 365) * (n - 81)));
}

/**
 * Ecuación de tiempo en minutos — corrige la diferencia entre el mediodía
 * solar real y el mediodía de reloj (excentricidad orbital + oblicuidad).
 */
function equationOfTimeMinutes(date: Date): number {
  const n = dayOfYear(date);
  const b = toRad((360 / 365) * (n - 81));
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/**
 * Punto subsolar: la latitud/longitud donde el sol está exactamente en el
 * cenit en este instante. La longitud subsolar se deriva del mediodía solar
 * real en UTC (12:00 UTC + corrección de ecuación de tiempo -> longitud 0).
 */
export function subsolarPoint(date: Date = new Date()): LonLat {
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const eot = equationOfTimeMinutes(date);
  const solarNoonUtc = 720 - eot;
  const lon = ((solarNoonUtc - utcMinutes) / 4 + 540) % 360 - 180;

  return {
    lon: Number(lon.toFixed(4)),
    lat: Number(solarDeclination(date).toFixed(4)),
  };
}

export function lonLatToMapPoint(point: LonLat): MapPoint {
  const x = ((point.lon + 180) / 360) * 100;
  const y = ((90 - point.lat) / 180) * 100;
  return { x, y };
}

export function mapPointToLonLat(point: MapPoint): LonLat {
  const lon = (point.x / 100) * 360 - 180;
  const lat = 90 - (point.y / 100) * 180;
  return { lon, lat };
}

/**
 * Curva del terminador en coordenadas del mapa (0-100). Devuelve una polilínea
 * de oeste a este. La UI rellena el lado nocturno a partir de esta curva.
 */
export function terminatorMapPoints(date: Date = new Date(), samples = 180): MapPoint[] {
  const sub = subsolarPoint(date);
  const subLat = sub.lat;
  const subLonRad = toRad(sub.lon);
  const subLatRad = toRad(subLat);
  const points: MapPoint[] = [];

  for (let i = 0; i <= samples; i += 1) {
    const lon = -180 + (360 * i) / samples;
    const lonRad = toRad(lon);
    // Latitud del terminador para esta longitud: el punto donde el ángulo
    // cenital solar es exactamente 90°. Se resuelve la ecuación del círculo
    // máximo perpendicular al punto subsolar.
    const deltaLon = lonRad - subLonRad;
    const tanLat = -Math.cos(deltaLon) / Math.tan(subLatRad || 1e-9);
    let lat = toDeg(Math.atan(tanLat));
    if (!Number.isFinite(lat)) lat = subLat >= 0 ? -90 : 90;
    points.push(lonLatToMapPoint({ lon, lat }));
  }

  return points;
}

/** true si el punto de mapa dado está actualmente en el lado nocturno. */
export function isMapPointInNight(point: MapPoint, date: Date = new Date()): boolean {
  const { lon, lat } = mapPointToLonLat(point);
  const sub = subsolarPoint(date);
  const cosZenith =
    Math.sin(toRad(lat)) * Math.sin(toRad(sub.lat)) +
    Math.cos(toRad(lat)) * Math.cos(toRad(sub.lat)) * Math.cos(toRad(lon - sub.lon));
  return cosZenith < 0;
}
