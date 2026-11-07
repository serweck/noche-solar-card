import { describe, it, expect, vi, afterEach } from "vitest";
import "../src/noche-solar-card";
import { APARATOS, ATTRS_EJEMPLO, COMPACTA_EJEMPLO, noches } from "./fixtures";
import { REFRESCO_HORAS_MS } from "../src/noche-solar-card";

type Card = HTMLElement & { setConfig(c: unknown): void; hass: unknown; updateComplete: Promise<boolean> };

const ENERGIA = ["sensor.noche_solar_energia_bateria", "sensor.noche_solar_energia_red", "sensor.noche_solar_energia_sol"];
const CONFIG = { entity: "sensor.noche_solar", historial: "sensor.noche_solar_historial", energia: ENERGIA, aparatos: APARATOS };
const TODOS = Object.fromEntries(APARATOS.map((a, k) => [a.slug, [1 + k / 10, 0.5, 0.1]]));

function makeHass(attrs: Record<string, unknown> | null, hist: unknown[] | null = noches(3), callWS = vi.fn().mockResolvedValue({})) {
  const states: Record<string, unknown> = {};
  if (attrs) states["sensor.noche_solar"] = { state: "14.8", attributes: attrs };
  if (hist) states["sensor.noche_solar_historial"] = { state: String(hist.length), attributes: { noches: hist } };
  return { states, config: { time_zone: "Europe/Madrid" }, language: "es", callWS };
}

async function mount(hass: unknown, config: unknown = CONFIG) {
  const card = document.createElement("noche-solar-card") as Card;
  card.setConfig(config);
  card.hass = hass;
  document.body.appendChild(card);
  await card.updateComplete;
  const root = card.shadowRoot!;
  const $ = (sel: string) => root.querySelector(sel) as HTMLElement | null;
  const $$ = (sel: string) => Array.from(root.querySelectorAll(sel)) as HTMLElement[];
  const click = async (el: Element | null) => {
    (el as HTMLElement).click();
    await card.updateComplete;
  };
  return { card, root, $, $$, click };
}

describe("config", () => {
  it("registra la tarjeta y pide la entidad", () => {
    expect(customElements.get("noche-solar-card")).toBeDefined();
    const c = document.createElement("noche-solar-card") as Card;
    expect(() => c.setConfig({})).toThrow("entity es obligatorio");
    expect(() => c.setConfig({ entity: "sensor.x", aparatos: [{ nombre: "Sin slug" }] })).toThrow("aparatos[0].slug es obligatorio");
    expect(() => c.setConfig({ entity: "sensor.x", aparatos: { acs: "ACS" } })).toThrow("aparatos debe ser una lista");
  });
});

describe("vista", () => {
  it("cabecera, cifras, filas del ejemplo y la línea de red → batería", async () => {
    const { $, $$ } = await mount(makeHass(ATTRS_EJEMPLO));
    expect($(".head .t")?.textContent).toContain("Noche solar · 05-11 → 06-11");
    expect($(".head .badge")?.textContent?.trim()).toBe("sin carga solar");
    expect($(".meta")?.textContent).toContain("17:02 → 13:30");
    expect($(".meta")?.textContent).toContain("batería 100 % → 13 %");
    expect($$(".src > div b").map((b) => b.textContent?.trim())).toEqual(["14,8 kWh", "9,6 kWh", "5,2 kWh"]);
    expect($$(".rows .row .n").map((e) => e.textContent?.trim())).toEqual(["Aerotermia", "ACS", "Otros", "Jacuzzi", "Despacho", "Domótica"]);
    expect($$(".rows .row")[0].querySelector(".num")?.textContent?.replace(/\s+/g, " ").trim()).toBe("5,1 (3,6 + 1,5)");
    expect($(".valle")?.textContent).toContain("+ Red → batería (valle): 8,1 kWh");
  });

  it("como mucho 11 filas, aunque lleguen aparatos que no están en la config", async () => {
    const { $$ } = await mount(makeHass({ ...ATTRS_EJEMPLO, aparatos: { ...TODOS, layzspa: [9, 9, 9] } }));
    expect($$(".rows .row")).toHaveLength(11);
  });

  it("sin `aparatos` en la config usa los de APARATOS", async () => {
    const { $$ } = await mount(makeHass(ATTRS_EJEMPLO), { entity: "sensor.noche_solar" });
    expect($$(".rows .row .n").map((e) => e.textContent?.trim())).toEqual(["Aerotermia", "ACS", "Otros", "Jacuzzi", "Despacho", "Domótica"]);
    expect($$(".sec")).toHaveLength(0);
  });

  it("los dos desplegables empiezan cerrados", async () => {
    const { $, $$ } = await mount(makeHass(ATTRS_EJEMPLO));
    const botones = $$(".sec > button");
    expect(botones.map((b) => b.textContent?.trim())).toEqual(["Por horas de esta noche", "Historial de noches"]);
    expect(botones.every((b) => b.getAttribute("aria-expanded") === "false")).toBe(true);
    expect($(".sec .body")).toBeNull();
  });

  it("sin atributos no rompe: «Sin datos de la noche solar»", async () => {
    const sinAparatos = { ...ATTRS_EJEMPLO, aparatos: undefined };
    for (const hass of [makeHass(null), makeHass(sinAparatos), makeHass({})]) {
      const { $ } = await mount(hass);
      expect($(".empty")?.textContent).toContain("Sin datos de la noche solar");
    }
  });
});

describe("historial", () => {
  it("vacío → «Aún no hay noches guardadas»", async () => {
    const m = await mount(makeHass(ATTRS_EJEMPLO, []));
    await m.click(m.$$(".sec > button")[1]);
    expect(m.$(".sec .body")?.textContent).toContain("Aún no hay noches guardadas");
  });

  it("← desactivada en la más antigua y → en la más reciente; se ve la noche elegida entera", async () => {
    const m = await mount(makeHass(ATTRS_EJEMPLO, noches(3)));
    await m.click(m.$$(".sec > button")[1]);
    const prev = () => m.$(".nav .prev") as HTMLButtonElement;
    const next = () => m.$(".nav .next") as HTMLButtonElement;
    expect(m.$$(".hist .col")).toHaveLength(3);
    expect(next().disabled).toBe(true);
    expect(prev().disabled).toBe(false);
    expect(m.$(".nav .d")?.textContent).toContain("06-11 → 07-11");
    expect(m.$$(".sec .body .row").length).toBeGreaterThan(0);
    await m.click(prev());
    await m.click(prev());
    expect(m.$(".nav .d")?.textContent).toContain("04-11 → 05-11");
    expect(prev().disabled).toBe(true);
    expect(next().disabled).toBe(false);
    await m.click(next());
    expect(m.$(".nav .d")?.textContent).toContain("05-11 → 06-11");
  });

  it("el historial se lee siempre en el orden de APARATOS, aunque la config tenga otros aparatos u otro orden", async () => {
    const config = { ...CONFIG, aparatos: [{ slug: "otros", nombre: "Resto" }, { slug: "jacuzzi", nombre: "Jacuzzi" }, { slug: "aerotermia", nombre: "Aero" }] };
    const m = await mount(makeHass(ATTRS_EJEMPLO, [COMPACTA_EJEMPLO]), config);
    await m.click(m.$$(".sec > button")[1]);
    const filasHist = m.$$(".sec .body .row").map((r) => [r.querySelector(".n")?.textContent?.trim(), r.querySelector(".num")?.textContent?.replace(/\s+/g, " ").trim()]);
    expect(filasHist).toEqual([["Aero", "5,1 (3,6 + 1,5)"], ["Resto", "2,6 (1,3 + 1,3)"], ["Jacuzzi", "2,0 (0 + 2,0)"]]);
    expect(m.$(".hist .col")?.getAttribute("aria-label")).toContain("05-11");
  });

  it("getStubConfig da los sensores del paquete", () => {
    const cls = customElements.get("noche-solar-card") as unknown as { getStubConfig(): unknown };
    expect(cls.getStubConfig()).toEqual({ entity: "sensor.noche_solar", historial: "sensor.noche_solar_historial", energia: ENERGIA });
  });

  it("las barras son las 14 últimas noches y tocar una la elige", async () => {
    const m = await mount(makeHass(ATTRS_EJEMPLO, noches(30)));
    await m.click(m.$$(".sec > button")[1]);
    const cols = m.$$(".hist .col");
    expect(cols).toHaveLength(14);
    await m.click(cols[0]);
    expect(m.$(".nav .d")?.textContent).toContain("24-10 → 25-10");
  });

  it("la noche elegida se guarda por su inicio: si entra una noche nueva, sigue elegida la misma", async () => {
    const m = await mount(makeHass(ATTRS_EJEMPLO, noches(3)));
    await m.click(m.$$(".sec > button")[1]);
    await m.click(m.$(".nav .prev"));
    expect(m.$(".nav .d")?.textContent).toContain("05-11 → 06-11");
    const nueva = { ...noches(1)[0], i: "2026-11-07T16:30:00.000Z", f: "2026-11-08T08:30:00.000Z" };
    m.card.hass = makeHass(ATTRS_EJEMPLO, [nueva, ...noches(3)]);
    await m.card.updateComplete;
    expect(m.$$(".hist .col")).toHaveLength(4);
    expect(m.$(".nav .d")?.textContent).toContain("05-11 → 06-11");
    expect(m.$(".hist .col.on")?.getAttribute("aria-label")).toContain("05-11");
  });

  it("si la noche elegida sale del historial, se vuelve a la más reciente", async () => {
    const m = await mount(makeHass(ATTRS_EJEMPLO, noches(3)));
    await m.click(m.$$(".sec > button")[1]);
    await m.click(m.$(".nav .prev"));
    await m.click(m.$(".nav .prev"));
    expect(m.$(".nav .d")?.textContent).toContain("04-11 → 05-11");
    m.card.hass = makeHass(ATTRS_EJEMPLO, noches(2));
    await m.card.updateComplete;
    expect(m.$(".nav .d")?.textContent).toContain("06-11 → 07-11");
    expect((m.$(".nav .next") as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("por horas", () => {
  it("pide las estadísticas solo al abrir y pinta una barra por hora", async () => {
    const t0 = Date.parse("2026-11-05T16:00:00Z");
    const callWS = vi.fn().mockResolvedValue({
      [ENERGIA[0]]: [{ start: t0, change: 0.8 }, { start: t0 + 3600_000, change: 0.6 }],
      [ENERGIA[1]]: [{ start: t0 + 3600_000, change: 0.2 }],
    });
    const m = await mount(makeHass(ATTRS_EJEMPLO, noches(1), callWS));
    expect(callWS).not.toHaveBeenCalled();
    await m.click(m.$$(".sec > button")[0]);
    expect(callWS).toHaveBeenCalledTimes(1);
    expect(callWS.mock.calls[0][0]).toMatchObject({
      type: "recorder/statistics_during_period",
      start_time: "2026-11-05T16:00:00.000Z", // 17:02 de Madrid, desde el principio de esa hora
      end_time: new Date(ATTRS_EJEMPLO.fin).toISOString(),
      period: "hour",
      statistic_ids: ENERGIA,
      types: ["change"],
    });
    await new Promise((r) => setTimeout(r, 0));
    await m.card.updateComplete;
    const cols = m.$$(".horas .col");
    expect(cols).toHaveLength(2);
    expect(cols[0].textContent).toContain("17h");
  });

  it("si falla la petición, un mensaje corto", async () => {
    const callWS = vi.fn().mockRejectedValue(new Error("boom"));
    const m = await mount(makeHass(ATTRS_EJEMPLO, noches(1), callWS));
    await m.click(m.$$(".sec > button")[0]);
    await new Promise((r) => setTimeout(r, 0));
    await m.card.updateComplete;
    expect(m.$(".sec .body")?.textContent).toContain("No se pudieron cargar las horas");
  });

  describe("en curso", () => {
    afterEach(() => vi.useRealTimers());
    const EN_CURSO = { ...ATTRS_EJEMPLO, estado: "en_curso", fin: null };
    const nuevoHass = (callWS: ReturnType<typeof vi.fn>, attrs: Record<string, unknown> = EN_CURSO) => makeHass(attrs, noches(1), callWS);
    const esperar = async (m: { card: Card }) => {
      await Promise.resolve();
      await Promise.resolve();
      await m.card.updateComplete;
    };

    it("con «Por horas» abierto se refrescan las estadísticas cada ~5 min, sin tormenta de peticiones", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(Date.parse("2026-11-05T20:00:00Z"));
      const callWS = vi.fn().mockResolvedValue({});
      const m = await mount(nuevoHass(callWS));
      await m.click(m.$$(".sec > button")[0]);
      expect(callWS).toHaveBeenCalledTimes(1);
      await esperar(m);
      // muchas actualizaciones de hass seguidas: ninguna petición nueva
      for (let k = 0; k < 5; k++) {
        vi.setSystemTime(Date.now() + 30_000);
        m.card.hass = nuevoHass(callWS);
        await esperar(m);
      }
      expect(callWS).toHaveBeenCalledTimes(1);
      vi.setSystemTime(Date.parse("2026-11-05T20:00:00Z") + REFRESCO_HORAS_MS);
      m.card.hass = nuevoHass(callWS);
      await esperar(m);
      expect(callWS).toHaveBeenCalledTimes(2);
      m.card.hass = nuevoHass(callWS);
      await esperar(m);
      expect(callWS).toHaveBeenCalledTimes(2);
      expect(REFRESCO_HORAS_MS).toBe(5 * 60_000);
    });

    it("mientras refresca no enseña «Cargando…»: deja las horas de antes", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(Date.parse("2026-11-05T20:00:00Z"));
      const t0 = Date.parse("2026-11-05T16:00:00Z");
      let soltar: (v: unknown) => void = () => undefined;
      const callWS = vi.fn()
        .mockResolvedValueOnce({ [ENERGIA[0]]: [{ start: t0, change: 0.8 }] })
        .mockImplementationOnce(() => new Promise((r) => (soltar = r)));
      const m = await mount(nuevoHass(callWS));
      await m.click(m.$$(".sec > button")[0]);
      await esperar(m);
      expect(m.$$(".horas .col")).toHaveLength(1);
      vi.setSystemTime(Date.now() + REFRESCO_HORAS_MS + 1);
      m.card.hass = nuevoHass(callWS);
      await esperar(m);
      expect(callWS).toHaveBeenCalledTimes(2);
      expect(m.$$(".horas .col")).toHaveLength(1);
      expect(m.$(".sec .body")?.textContent).not.toContain("Cargando");
      // en vuelo: aunque pase el tiempo, no se pide otra vez
      vi.setSystemTime(Date.now() + 2 * REFRESCO_HORAS_MS);
      m.card.hass = nuevoHass(callWS);
      await esperar(m);
      expect(callWS).toHaveBeenCalledTimes(2);
      soltar({ [ENERGIA[0]]: [{ start: t0, change: 0.8 }, { start: t0 + 3600_000, change: 0.5 }] });
      await esperar(m);
      expect(m.$$(".horas .col")).toHaveLength(2);
    });

    it("una noche cerrada no se refresca, ni con el desplegable cerrado", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(Date.parse("2026-11-06T20:00:00Z"));
      const callWS = vi.fn().mockResolvedValue({});
      const m = await mount(nuevoHass(callWS, ATTRS_EJEMPLO));
      await m.click(m.$$(".sec > button")[0]);
      await esperar(m);
      vi.setSystemTime(Date.now() + 3 * REFRESCO_HORAS_MS);
      m.card.hass = nuevoHass(callWS, ATTRS_EJEMPLO);
      await esperar(m);
      expect(callWS).toHaveBeenCalledTimes(1);

      const callWS2 = vi.fn().mockResolvedValue({});
      const m2 = await mount(nuevoHass(callWS2));
      vi.setSystemTime(Date.now() + 3 * REFRESCO_HORAS_MS);
      m2.card.hass = nuevoHass(callWS2);
      await esperar(m2);
      expect(callWS2).not.toHaveBeenCalled();
    });
  });
});
