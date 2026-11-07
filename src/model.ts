import type { Aparato, Cabecera, EstadoNoche, Fila, Hora, Noche, NocheCompacta, Tramos } from "./types";

/** Por debajo de esto (kWh) algo se considera 0: se escribe «0», no se pinta la fila ni la cifra del sol. */
export const CASI_CERO = 0.05;
export const SIN_NOCHES = "Aún no hay noches guardadas";

/**
 * APARATOS de Paneles/tools/noche_solar.py, en su orden. El historial guarda los tramos de cada noche por posición
 * en este orden, así que se lee siempre con él (nunca con el de la config).
 */
export const APARATOS_POR_DEFECTO: Aparato[] = [
  { slug: "aerotermia", nombre: "Aerotermia" },
  { slug: "cocina", nombre: "Cocina" },
  { slug: "despacho", nombre: "Despacho" },
  { slug: "domotica", nombre: "Domótica" },
  { slug: "acs", nombre: "ACS" },
  { slug: "jacuzzi", nombre: "Jacuzzi" },
  { slug: "piscina", nombre: "Piscina" },
  { slug: "bomba_aerotermia", nombre: "Bomba Aerotermia" },
  { slug: "calentador_agua_2", nombre: "Calentador Agua 2" },
  { slug: "subcuadro_resto", nombre: "Subcuadro (resto)" },
  { slug: "otros", nombre: "Otros" },
];
/** Slugs en el orden del historial. */
export const SLUGS_HISTORIAL = APARATOS_POR_DEFECTO.map((a) => a.slug);

const ESTADOS: EstadoNoche[] = ["en_curso", "cerrada", "sin_carga_solar"];

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : 0;
};
const numONulo = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? parseFloat(v) : NaN;
  return Number.isFinite(n) ? n : null;
};
const tramos = (v: unknown): Tramos => {
  const l = Array.isArray(v) ? v : [];
  return [num(l[0]), num(l[1]), num(l[2])];
};
const texto = (v: unknown): string | null => (typeof v === "string" && v ? v : null);
const estado = (v: unknown): EstadoNoche => (ESTADOS.includes(v as EstadoNoche) ? (v as EstadoNoche) : "cerrada");

/** kWh con una cifra decimal y coma: 5.1 → «5,1»; lo que redondea a 0 (o es negativo) → «0». */
export function kwh(x: number): string {
  const r = Math.round(x * 10) / 10;
  if (r <= 0) return "0";
  return r.toFixed(1).replace(".", ",");
}

/** La noche de los atributos de sensor.noche_solar, o null si falta lo imprescindible. */
export function nocheActual(attrs: Record<string, unknown> | undefined | null): Noche | null {
  if (!attrs) return null;
  const inicio = texto(attrs.inicio);
  const ap = attrs.aparatos;
  if (!inicio || !ap || typeof ap !== "object" || Array.isArray(ap)) return null;
  const aparatos: Record<string, Tramos> = {};
  for (const [slug, v] of Object.entries(ap as Record<string, unknown>)) aparatos[slug] = tramos(v);
  return {
    estado: estado(attrs.estado),
    inicio,
    fin: texto(attrs.fin),
    socInicio: numONulo(attrs.soc_inicio),
    socFin: numONulo(attrs.soc_fin),
    total: num(attrs.total),
    bateria: num(attrs.bateria),
    red: num(attrs.red),
    sol: num(attrs.sol),
    redABateria: num(attrs.red_a_bateria),
    aparatos,
  };
}

/** Una noche del historial; `a` va por posición, en el orden de `slugs` (el de APARATOS). */
export function nocheDeHistorial(c: NocheCompacta | null | undefined, slugs: string[]): Noche | null {
  if (!c || !texto(c.i)) return null;
  const a = Array.isArray(c.a) ? c.a : [];
  const aparatos: Record<string, Tramos> = {};
  slugs.forEach((slug, k) => (aparatos[slug] = tramos(a[k])));
  return {
    estado: estado(c.e),
    inicio: c.i,
    fin: texto(c.f),
    socInicio: numONulo(c.si),
    socFin: numONulo(c.sf),
    total: num(c.t),
    bateria: num(c.b),
    red: num(c.r),
    sol: num(c.s),
    redABateria: num(c.rb),
    aparatos,
  };
}

/** Las noches del atributo `noches` del historial (la más reciente primero). */
export function leerHistorial(noches: unknown, slugs: string[] = SLUGS_HISTORIAL): { noches: Noche[]; mensaje: string | null } {
  const l = (Array.isArray(noches) ? noches : [])
    .map((c) => nocheDeHistorial(c as NocheCompacta, slugs))
    .filter((n): n is Noche => n !== null);
  return { noches: l, mensaje: l.length ? null : SIN_NOCHES };
}

/** Una fila por aparato de la config con consumo, de mayor a menor. */
export function filas(n: Noche, aparatos: Aparato[]): Fila[] {
  const l = aparatos
    .map(({ slug, nombre }) => {
      const t = n.aparatos[slug] ?? [0, 0, 0];
      const pos: Tramos = [Math.max(0, t[0]), Math.max(0, t[1]), Math.max(0, t[2])];
      return { slug, nombre, tramos: pos, total: pos[0] + pos[1] + pos[2] };
    })
    .filter((f) => f.total >= CASI_CERO)
    .sort((x, y) => y.total - x.total);
  const max = l[0]?.total ?? 0;
  return l.map((f) => ({
    ...f,
    ancho: (f.total / max) * 100,
    pct: f.tramos.map((v) => (v / f.total) * 100) as Tramos,
  }));
}

/** La noche tiró del sol: la cifra «Del sol» solo sale por encima de CASI_CERO. */
export const haySol = (n: Noche): boolean => n.sol > CASI_CERO;
/** El aparato tiró del sol: su tramo se escribe si no redondea a 0 (≥ CASI_CERO, como las filas). */
export const tramoSol = (f: Fila): boolean => f.tramos[2] >= CASI_CERO;

/** «5,1 (3,6 + 1,5)», y «+ sol» si el aparato tiró del sol. */
export function numeros(f: Fila): string {
  const partes = [kwh(f.tramos[0]), kwh(f.tramos[1])];
  if (tramoSol(f)) partes.push(kwh(f.tramos[2]));
  return `${kwh(f.total)} (${partes.join(" + ")})`;
}

export interface Cifra {
  nombre: string;
  valor: string;
  clase: "total" | "bat" | "red" | "sol";
}

/** Total casa · De batería · De la red (· Del sol, si hubo). */
export function cifras(n: Noche): Cifra[] {
  const l: Cifra[] = [
    { nombre: "Total casa", valor: kwh(n.total), clase: "total" },
    { nombre: "De batería", valor: kwh(n.bateria), clase: "bat" },
    { nombre: "De la red", valor: kwh(n.red), clase: "red" },
  ];
  if (haySol(n)) l.push({ nombre: "Del sol", valor: kwh(n.sol), clase: "sol" });
  return l;
}

const partes = (iso: string, tz: string | undefined, opts: Intl.DateTimeFormatOptions): Record<string, string> => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return {};
  const out: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat("es-ES", { ...opts, timeZone: tz }).formatToParts(d)) out[p.type] = p.value;
  return out;
};
/** «05-11» en la zona horaria dada (por defecto, la del navegador). */
export const fecha = (iso: string, tz?: string): string => {
  const p = partes(iso, tz, { day: "2-digit", month: "2-digit" });
  return p.day ? `${p.day.padStart(2, "0")}-${p.month.padStart(2, "0")}` : "?";
};
/** «17:02» en la zona horaria dada. */
export const hora = (iso: string, tz?: string): string => {
  const p = partes(iso, tz, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  return p.hour ? `${p.hour.padStart(2, "0")}:${p.minute.padStart(2, "0")}` : "?";
};
const pct = (v: number) => `${Math.round(v)} %`;

export function cabecera(n: Noche, tz?: string): Cabecera {
  const ini = fecha(n.inicio, tz);
  const fin = n.fin ? fecha(n.fin, tz) : null;
  return {
    titulo: `Noche solar · ${fin && fin !== ini ? `${ini} → ${fin}` : ini}`,
    etiqueta: n.estado === "en_curso" ? "en curso" : n.estado === "sin_carga_solar" ? "sin carga solar" : null,
    horas: `${hora(n.inicio, tz)} → ${n.fin ? hora(n.fin, tz) : "ahora"}`,
    soc: n.socInicio === null ? null : `batería ${pct(n.socInicio)}${n.socFin === null ? "" : ` → ${pct(n.socFin)}`}`,
  };
}

/** Resultado de recorder/statistics_during_period: {statistic_id: [{start, change}]}. */
export type Estadisticas = Record<string, { start: number | string; change?: number | null }[] | undefined>;

/** kWh por hora de batería, red y sol (ids en ese orden), ordenados por hora. */
export function horas(stats: Estadisticas, ids: string[]): Hora[] {
  const porHora = new Map<number, Tramos>();
  ids.slice(0, 3).forEach((id, k) => {
    for (const p of stats[id] ?? []) {
      const t = new Date(p.start).getTime();
      if (isNaN(t)) continue;
      const fila = porHora.get(t) ?? [0, 0, 0];
      fila[k] += Math.max(0, num(p.change));
      porHora.set(t, fila);
    }
  });
  return [...porHora.entries()].sort((a, b) => a[0] - b[0]).map(([inicio, tramos]) => ({ inicio, tramos }));
}
