/** kWh de batería, red y sol, en ese orden. */
export type Tramos = [number, number, number];

export type EstadoNoche = "en_curso" | "cerrada" | "sin_carga_solar";

export interface Aparato {
  slug: string;
  nombre: string;
}

export interface CardConfig {
  type?: string;
  /** sensor.noche_solar */
  entity: string;
  /** sensor.noche_solar_historial */
  historial?: string;
  /** Contadores acumulados de batería, red y sol (en ese orden) para el gráfico por horas. */
  energia?: string[];
  /** Aparatos en el orden de APARATOS: el historial guarda sus tramos por posición. */
  aparatos?: Aparato[];
}

/** Una noche ya leída, venga de sensor.noche_solar o del historial. */
export interface Noche {
  estado: EstadoNoche;
  inicio: string;
  fin: string | null;
  socInicio: number | null;
  socFin: number | null;
  total: number;
  bateria: number;
  red: number;
  sol: number;
  redABateria: number;
  aparatos: Record<string, Tramos>;
}

/** Noche tal y como la guarda sensor.noche_solar_historial. */
export interface NocheCompacta {
  i: string;
  f: string | null;
  e: string;
  si: number | null;
  sf: number | null;
  t: number;
  b: number;
  r: number;
  s: number;
  rb: number;
  a: number[][];
}

export interface Fila {
  slug: string;
  nombre: string;
  total: number;
  tramos: Tramos;
  /** Ancho de la barra en % del aparato que más gasta. */
  ancho: number;
  /** Cada tramo en % de su barra (suman 100). */
  pct: Tramos;
}

export interface Cabecera {
  titulo: string;
  etiqueta: string | null;
  horas: string;
  soc: string | null;
}

export interface Hora {
  /** Inicio de la hora (ms). */
  inicio: number;
  tramos: Tramos;
}
