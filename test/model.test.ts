import { describe, it, expect } from "vitest";
import { cabecera, cifras, filas, horas, kwh, leerHistorial, nocheActual, nocheDeHistorial, numeros } from "../src/model";
import { APARATOS, ATTRS_EJEMPLO, COMPACTA_EJEMPLO, SLUGS } from "./fixtures";

const TZ = "Europe/Madrid";
const ejemplo = () => nocheActual(ATTRS_EJEMPLO)!;

describe("kwh", () => {
  it("una cifra decimal con coma", () => {
    expect(kwh(5.1)).toBe("5,1");
    expect(kwh(14.849)).toBe("14,8");
    expect(kwh(3)).toBe("3,0");
    expect(kwh(0.96)).toBe("1,0");
    expect(kwh(12345.6)).toBe("12345,6");
  });
  it("cero (o casi) se escribe 0", () => {
    expect(kwh(0)).toBe("0");
    expect(kwh(0.04)).toBe("0");
    expect(kwh(-0.01)).toBe("0");
  });
});

describe("nocheActual", () => {
  it("lee los atributos de sensor.noche_solar", () => {
    const n = ejemplo();
    expect(n).toMatchObject({ estado: "sin_carga_solar", total: 14.8, bateria: 9.6, red: 5.2, sol: 0, redABateria: 8.1, socInicio: 100, socFin: 13 });
    expect(n.aparatos.aerotermia).toEqual([3.6, 1.5, 0]);
  });
  it("sin atributos, sin inicio o sin aparatos no hay noche", () => {
    expect(nocheActual(undefined)).toBeNull();
    expect(nocheActual({})).toBeNull();
    expect(nocheActual({ ...ATTRS_EJEMPLO, inicio: null })).toBeNull();
    expect(nocheActual({ ...ATTRS_EJEMPLO, aparatos: null })).toBeNull();
  });
  it("números que llegan como texto o raros no rompen", () => {
    const n = nocheActual({ ...ATTRS_EJEMPLO, total: "14.8", sol: "unknown", aparatos: { acs: ["3", null] } })!;
    expect(n.total).toBe(14.8);
    expect(n.sol).toBe(0);
    expect(n.aparatos.acs).toEqual([3, 0, 0]);
  });
});

describe("nocheDeHistorial", () => {
  it("da lo mismo que nocheActual para la misma noche", () => {
    expect(nocheDeHistorial(COMPACTA_EJEMPLO, SLUGS)).toEqual(ejemplo());
  });
  it("una noche sin inicio se descarta", () => {
    expect(nocheDeHistorial({ ...COMPACTA_EJEMPLO, i: "" }, SLUGS)).toBeNull();
  });
});

describe("leerHistorial", () => {
  it("vacío o sin atributo → «Aún no hay noches guardadas»", () => {
    expect(leerHistorial(undefined, SLUGS)).toEqual({ noches: [], mensaje: "Aún no hay noches guardadas" });
    expect(leerHistorial([], SLUGS).mensaje).toBe("Aún no hay noches guardadas");
  });
  it("con noches, las lee en el mismo orden y sin mensaje", () => {
    const h = leerHistorial([COMPACTA_EJEMPLO, { ...COMPACTA_EJEMPLO, t: 3 }], SLUGS);
    expect(h.mensaje).toBeNull();
    expect(h.noches.map((n) => n.total)).toEqual([14.8, 3]);
  });
});

describe("filas", () => {
  it("de mayor a menor, sin las que están a 0, con el ancho relativo a la mayor", () => {
    const f = filas(ejemplo(), APARATOS);
    expect(f.map((x) => x.nombre)).toEqual(["Aerotermia", "ACS", "Otros", "Jacuzzi", "Despacho", "Domótica"]);
    expect(f[0].ancho).toBe(100);
    expect(f[1].ancho).toBeCloseTo((3.0 / 5.1) * 100, 5);
    expect(f[5].ancho).toBeCloseTo((1.0 / 5.1) * 100, 5);
  });
  it("los tramos de cada fila suman 100", () => {
    for (const x of filas(ejemplo(), APARATOS)) {
      expect(x.pct[0] + x.pct[1] + x.pct[2]).toBeCloseTo(100, 6);
    }
    const aero = filas(ejemplo(), APARATOS)[0];
    expect(aero.pct[0]).toBeCloseTo((3.6 / 5.1) * 100, 5);
  });
  it("solo los aparatos de la config y en su nombre", () => {
    const f = filas(ejemplo(), [{ slug: "acs", nombre: "Agua caliente" }]);
    expect(f).toHaveLength(1);
    expect(f[0].nombre).toBe("Agua caliente");
  });
  it("sin consumo en ningún aparato no hay filas", () => {
    expect(filas({ ...ejemplo(), aparatos: {} }, APARATOS)).toEqual([]);
  });
});

describe("numeros", () => {
  it("total y partes con coma; el sol solo si hay", () => {
    const f = filas(ejemplo(), APARATOS);
    expect(numeros(f[0])).toBe("5,1 (3,6 + 1,5)");
    expect(numeros(f[1])).toBe("3,0 (3,0 + 0)");
    expect(numeros(f[3])).toBe("2,0 (0 + 2,0)");
    const conSol = filas({ ...ejemplo(), aparatos: { acs: [1, 0.5, 0.4] } }, APARATOS)[0];
    expect(numeros(conSol)).toBe("1,9 (1,0 + 0,5 + 0,4)");
  });
});

describe("cifras", () => {
  it("total, batería y red; el sol solo si pasa de 0,05", () => {
    expect(cifras(ejemplo()).map((c) => [c.nombre, c.valor])).toEqual([
      ["Total casa", "14,8"], ["De batería", "9,6"], ["De la red", "5,2"],
    ]);
    expect(cifras({ ...ejemplo(), sol: 0.05 })).toHaveLength(3);
    expect(cifras({ ...ejemplo(), sol: 0.3 }).map((c) => c.nombre)).toEqual(["Total casa", "De batería", "De la red", "Del sol"]);
  });
});

describe("cabecera", () => {
  it("sin carga solar", () => {
    expect(cabecera(ejemplo(), TZ)).toEqual({
      titulo: "Noche solar · 05-11 → 06-11",
      etiqueta: "sin carga solar",
      horas: "17:02 → 13:30",
      soc: "batería 100 % → 13 %",
    });
  });
  it("cerrada: sin etiqueta y en hora local aunque venga en UTC", () => {
    const c = cabecera({ ...ejemplo(), estado: "cerrada", inicio: "2026-11-05T16:55:00+00:00", fin: "2026-11-06T08:30:00Z" }, TZ);
    expect(c.etiqueta).toBeNull();
    expect(c.horas).toBe("17:55 → 09:30");
    expect(c.titulo).toBe("Noche solar · 05-11 → 06-11");
  });
  it("en curso: sin fin", () => {
    const c = cabecera({ ...ejemplo(), estado: "en_curso", fin: null, socFin: null }, TZ);
    expect(c).toEqual({ titulo: "Noche solar · 05-11", etiqueta: "en curso", horas: "17:02 → ahora", soc: "batería 100 %" });
  });
  it("sin % de batería al empezar no hay línea de batería", () => {
    expect(cabecera({ ...ejemplo(), socInicio: null }, TZ).soc).toBeNull();
  });
});

describe("horas", () => {
  it("junta las tres estadísticas por hora, ordenadas", () => {
    const ids = ["sensor.b", "sensor.r", "sensor.s"];
    const t0 = Date.UTC(2026, 10, 5, 16);
    const t1 = t0 + 3600_000;
    const h = horas({
      "sensor.b": [{ start: t1, change: 0.5 }, { start: t0, change: 0.8 }],
      "sensor.r": [{ start: new Date(t0).toISOString(), change: 0.1 }],
    }, ids);
    expect(h).toEqual([
      { inicio: t0, tramos: [0.8, 0.1, 0] },
      { inicio: t1, tramos: [0.5, 0, 0] },
    ]);
  });
  it("sin datos, lista vacía", () => {
    expect(horas({}, ["a", "b", "c"])).toEqual([]);
  });
});
