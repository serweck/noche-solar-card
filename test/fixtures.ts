import type { Aparato, NocheCompacta } from "../src/types";

/** Mismo orden que APARATOS en Paneles/tools/noche_solar.py. */
export const APARATOS: Aparato[] = [
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
export const SLUGS = APARATOS.map((a) => a.slug);

/** Ejemplo del spec y de la maqueta: 14,8 kWh, 9,6 de batería y 5,2 de la red. */
export const APARATOS_EJEMPLO: Record<string, [number, number, number]> = {
  aerotermia: [3.6, 1.5, 0],
  cocina: [0, 0, 0],
  despacho: [0.9, 0.2, 0],
  domotica: [0.8, 0.2, 0],
  acs: [3.0, 0, 0],
  jacuzzi: [0, 2.0, 0],
  piscina: [0, 0, 0],
  bomba_aerotermia: [0, 0, 0],
  calentador_agua_2: [0, 0, 0],
  subcuadro_resto: [0, 0, 0],
  otros: [1.3, 1.3, 0],
};

export const ATTRS_EJEMPLO = {
  estado: "sin_carga_solar",
  inicio: "2026-11-05T17:02:00+01:00",
  fin: "2026-11-06T13:30:00+01:00",
  soc_inicio: 100.0,
  soc_fin: 13.0,
  base: {},
  ultimo: {},
  muestras: {},
  aparatos: APARATOS_EJEMPLO,
  total: 14.8,
  bateria: 9.6,
  red: 5.2,
  sol: 0.0,
  red_a_bateria: 8.1,
  acum: [120.5, 60.2, 1.1],
};

export const COMPACTA_EJEMPLO: NocheCompacta = {
  i: "2026-11-05T17:02:00+01:00",
  f: "2026-11-06T13:30:00+01:00",
  e: "sin_carga_solar",
  si: 100.0,
  sf: 13.0,
  t: 14.8,
  b: 9.6,
  r: 5.2,
  s: 0.0,
  rb: 8.1,
  a: SLUGS.map((s) => APARATOS_EJEMPLO[s]),
};

/** `n` noches cerradas, la más reciente primero (como el historial). */
export function noches(n: number): NocheCompacta[] {
  return Array.from({ length: n }, (_, k) => {
    const d = new Date(Date.UTC(2026, 10, 6 - k, 16, 30));
    const f = new Date(d.getTime() + 16 * 3600_000);
    return { ...COMPACTA_EJEMPLO, i: d.toISOString(), f: f.toISOString(), e: "cerrada", t: 10 + k, b: 6 + k, r: 4 };
  });
}
