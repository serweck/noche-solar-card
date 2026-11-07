import { LitElement, html, nothing, type TemplateResult } from "lit";
import type { HomeAssistant } from "custom-card-helpers";
import type { Aparato, CardConfig, Hora, Noche, Tramos } from "./types";
import {
  APARATOS_POR_DEFECTO, CASI_CERO, cabecera, cifras, fecha, filas, haySol, hora, horas, kwh, leerHistorial, nocheActual, numeros, tramoSol,
  type Estadisticas,
} from "./model";
import { styles } from "./styles";

export const CARD_TAG = "noche-solar-card";
export const CARD_VERSION = "0.1.0";
export const SIN_DATOS = "Sin datos de la noche solar";
/** Barras del historial a la vista. */
export const BARRAS_HISTORIAL = 14;

export { APARATOS_POR_DEFECTO };

export function validateConfig(config: Partial<CardConfig> | undefined): CardConfig {
  if (!config?.entity) throw new Error("entity es obligatorio");
  if (config.aparatos !== undefined) {
    if (!Array.isArray(config.aparatos)) throw new Error("aparatos debe ser una lista de {slug, nombre}");
    config.aparatos.forEach((a, i) => {
      if (!a?.slug) throw new Error(`aparatos[${i}].slug es obligatorio`);
    });
  }
  if (config.energia !== undefined && (!Array.isArray(config.energia) || config.energia.length !== 3)) {
    throw new Error("energia: hacen falta los tres sensores (batería, red y sol)");
  }
  return config as CardConfig;
}

type EstadoHoras = { clave: string; cargando: boolean; datos: Hora[] | null; error: boolean };

export class NocheSolarCard extends LitElement {
  static styles = styles;
  static properties = {
    hass: { attribute: false },
    _config: { state: true },
    _abiertoHoras: { state: true },
    _abiertoHist: { state: true },
    _sel: { state: true },
    _horas: { state: true },
  };

  declare hass?: HomeAssistant;
  declare private _config?: CardConfig;
  declare private _abiertoHoras: boolean;
  declare private _abiertoHist: boolean;
  /** Noche elegida en el historial (0 = la más reciente). */
  declare private _sel: number;
  declare private _horas: EstadoHoras | null;

  constructor() {
    super();
    this._abiertoHoras = false;
    this._abiertoHist = false;
    this._sel = 0;
    this._horas = null;
  }

  setConfig(config: CardConfig): void {
    this._config = validateConfig(config);
  }

  static getStubConfig(): Partial<CardConfig> {
    return {
      entity: "sensor.noche_solar",
      historial: "sensor.noche_solar_historial",
      energia: ["sensor.noche_solar_energia_bateria", "sensor.noche_solar_energia_red", "sensor.noche_solar_energia_sol"],
    };
  }

  getCardSize(): number {
    return 7;
  }

  private get _aparatos(): Aparato[] {
    return (this._config?.aparatos ?? APARATOS_POR_DEFECTO).map((a) => ({ slug: a.slug, nombre: a.nombre ?? a.slug }));
  }

  private get _tz(): string | undefined {
    return (this.hass?.config as { time_zone?: string } | undefined)?.time_zone || undefined;
  }

  private _noche(): Noche | null {
    const st = this._config && this.hass?.states[this._config.entity];
    return nocheActual(st?.attributes as Record<string, unknown> | undefined);
  }

  private _historial() {
    const id = this._config?.historial;
    const attrs = id ? this.hass?.states[id]?.attributes : undefined;
    // Siempre con el orden fijo de APARATOS: la config solo elige, renombra y ordena las filas.
    return leerHistorial(attrs?.noches);
  }

  /** Antes de pintar (no después): así el cambio de `_horas` entra en esta misma actualización. */
  protected willUpdate(): void {
    if (this._abiertoHoras) this._pedirHoras();
  }

  /** Pide las horas de la noche de arriba si aún no están (o son de otra noche). */
  private _pedirHoras(): void {
    const n = this._noche();
    const ids = this._config?.energia;
    if (!n || !ids || !this.hass?.callWS) return;
    const clave = `${n.inicio}|${n.fin ?? ""}`;
    if (this._horas?.clave === clave) return;
    const desde = new Date(n.inicio);
    desde.setMinutes(0, 0, 0);
    const msg: Record<string, unknown> = {
      type: "recorder/statistics_during_period",
      start_time: desde.toISOString(),
      period: "hour",
      statistic_ids: ids,
      types: ["change"],
    };
    if (n.fin) msg.end_time = new Date(n.fin).toISOString();
    this._horas = { clave, cargando: true, datos: null, error: false };
    this.hass.callWS<Estadisticas>(msg as never).then(
      (r) => this._horas?.clave === clave && (this._horas = { clave, cargando: false, datos: horas(r ?? {}, ids), error: false }),
      () => this._horas?.clave === clave && (this._horas = { clave, cargando: false, datos: null, error: true }),
    );
  }

  private _toggleHoras(): void {
    this._abiertoHoras = !this._abiertoHoras;
    // En directo los datos cambian: al volver a abrir, se piden otra vez.
    if (this._abiertoHoras && this._noche()?.estado === "en_curso") this._horas = null;
  }

  private _toggleHist(): void {
    this._abiertoHist = !this._abiertoHist;
  }

  render() {
    if (!this._config || !this.hass) return nothing;
    const n = this._noche();
    if (!n) {
      return html`<ha-card>
        <div class="head"><span class="t">Noche solar</span></div>
        <div class="empty">${SIN_DATOS}</div>
        ${this._config.historial ? this._renderHistorial() : nothing}
      </ha-card>`;
    }
    const c = cabecera(n, this._tz);
    return html`<ha-card>
      <div class="head">
        <span class="t">${c.titulo}</span>
        ${c.etiqueta ? html`<span class="badge ${n.estado === "en_curso" ? "live" : ""}">${c.etiqueta}</span>` : nothing}
      </div>
      ${this._renderNoche(n)}
      ${this._config.energia ? this._renderHoras() : nothing}
      ${this._config.historial ? this._renderHistorial() : nothing}
    </ha-card>`;
  }

  /** Lo de una noche, debajo de su título: horas y batería, cifras, filas y red → batería. */
  private _renderNoche(n: Noche): TemplateResult {
    const c = cabecera(n, this._tz);
    const cs = cifras(n);
    const fs = filas(n, this._aparatos);
    const conSol = haySol(n) || fs.some(tramoSol);
    return html`
      <div class="meta">${c.horas}${c.soc ? html` · ${c.soc}` : nothing}</div>
      <div class="src ${cs.length > 3 ? "n4" : ""}" style="--ns-n:${cs.length}">
        ${cs.map((x) => html`<div class="c-${x.clase}">${x.nombre}<b>${x.valor} kWh</b></div>`)}
      </div>
      ${fs.length
        ? html`<div class="leg">
              <span><i class="bat"></i>Batería</span><span><i class="red"></i>Red</span>
              ${conSol ? html`<span><i class="sol"></i>Sol</span>` : nothing}
            </div>
            <div class="rows">
              ${fs.map((f) => html`<div class="row">
                <span class="n" title=${f.nombre}>${f.nombre}</span>
                <div class="bar" style="width:${f.ancho.toFixed(1)}%">${this._tramos(f.pct, "width")}</div>
                <span class="num">${this._num(numeros(f))}</span>
              </div>`)}
            </div>`
        : html`<div class="msg">Aún sin consumo por aparatos</div>`}
      ${n.redABateria >= CASI_CERO ? html`<div class="valle">+ Red → batería (valle): ${kwh(n.redABateria)} kWh</div>` : nothing}
    `;
  }

  /** «5,1 (3,6 + 1,5)» con el paréntesis en pequeño. */
  private _num(s: string): TemplateResult {
    const k = s.indexOf(" (");
    return k < 0 ? html`${s}` : html`${s.slice(0, k)} <small>${s.slice(k + 1)}</small>`;
  }

  /** Tramos batería/red/sol en % (los que son 0 no se pintan). */
  private _tramos(pct: Tramos, eje: "width" | "height"): TemplateResult[] {
    return (["bat", "red", "sol"] as const).flatMap((cls, k) =>
      pct[k] > 0 ? [html`<div class=${cls} style="${eje}:${pct[k].toFixed(2)}%"></div>`] : []);
  }

  /** Columna apilada de una gráfica: `alto` en % del alto disponible. */
  private _pila(t: Tramos, alto: number): TemplateResult {
    const tot = t[0] + t[1] + t[2];
    const pct: Tramos = tot > 0 ? (t.map((v) => (v / tot) * 100) as Tramos) : [0, 0, 0];
    return html`<div class="stack" style="height:calc((100% - 14px) * ${(alto / 100).toFixed(4)})">${this._tramos(pct, "height")}</div>`;
  }

  private _renderHoras(): TemplateResult {
    return html`<div class="sec">
      <button aria-expanded=${String(this._abiertoHoras)} @click=${this._toggleHoras}>Por horas de esta noche</button>
      ${this._abiertoHoras ? html`<div class="body">${this._cuerpoHoras()}</div>` : nothing}
    </div>`;
  }

  private _cuerpoHoras(): TemplateResult {
    const h = this._horas;
    if (!h || h.cargando) return html`<div class="msg">Cargando…</div>`;
    if (h.error) return html`<div class="msg">No se pudieron cargar las horas</div>`;
    const datos = h.datos ?? [];
    if (!datos.length) return html`<div class="msg">Sin datos por horas todavía</div>`;
    const max = Math.max(...datos.map((d) => d.tramos[0] + d.tramos[1] + d.tramos[2]), 0.001);
    // Etiquetas como mucho cada ~8 columnas, para que quepan en el móvil.
    const paso = Math.max(1, Math.ceil(datos.length / 8));
    const tz = this._tz;
    return html`<div class="chart horas">
      ${datos.map((d, k) => {
        const t = d.tramos[0] + d.tramos[1] + d.tramos[2];
        const etiqueta = `${hora(new Date(d.inicio).toISOString(), tz).slice(0, 2)}h`;
        return html`<div class="col" title="${etiqueta}: ${kwh(t)} kWh">
          ${this._pila(d.tramos, (t / max) * 100)}
          <div class="lab">${k % paso === 0 ? etiqueta : ""}</div>
        </div>`;
      })}
    </div>`;
  }

  private _renderHistorial(): TemplateResult {
    return html`<div class="sec">
      <button aria-expanded=${String(this._abiertoHist)} @click=${this._toggleHist}>Historial de noches</button>
      ${this._abiertoHist ? html`<div class="body">${this._cuerpoHistorial()}</div>` : nothing}
    </div>`;
  }

  private _cuerpoHistorial(): TemplateResult {
    const { noches, mensaje } = this._historial();
    if (mensaje) return html`<div class="msg">${mensaje}</div>`;
    const sel = Math.min(this._sel, noches.length - 1);
    // Ventana de 14 barras que siempre contiene la elegida; la más antigua a la izquierda.
    const desde = Math.max(0, Math.min(sel - (BARRAS_HISTORIAL - 1), noches.length - BARRAS_HISTORIAL));
    const idx = Array.from({ length: Math.min(BARRAS_HISTORIAL, noches.length) }, (_, k) => desde + k).reverse();
    const max = Math.max(...idx.map((i) => noches[i].bateria + noches[i].red + noches[i].sol), 0.001);
    const paso = idx.length > 7 ? 2 : 1;
    const elegida = noches[sel];
    const c = cabecera(elegida, this._tz);
    const tz = this._tz;
    return html`
      <div class="chart hist">
        ${idx.map((i, k) => {
          const m = noches[i];
          const t: Tramos = [m.bateria, m.red, m.sol];
          return html`<button class="col ${i === sel ? "on" : ""}" title="${fecha(m.inicio, tz)}: ${kwh(m.total)} kWh"
            aria-label="Noche del ${fecha(m.inicio, tz)}: ${kwh(m.total)} kWh" aria-pressed=${String(i === sel)}
            @click=${() => (this._sel = i)}>
            ${this._pila(t, ((t[0] + t[1] + t[2]) / max) * 100)}
            <div class="lab">${(idx.length - 1 - k) % paso === 0 ? fecha(m.inicio, tz) : ""}</div>
          </button>`;
        })}
      </div>
      <div class="nav">
        <button class="prev" aria-label="Noche anterior" ?disabled=${sel >= noches.length - 1} @click=${() => (this._sel = sel + 1)}>←</button>
        <span class="d">${c.titulo.replace("Noche solar · ", "")}${c.etiqueta ? html`<span class="badge">${c.etiqueta}</span>` : nothing}</span>
        <button class="next" aria-label="Noche siguiente" ?disabled=${sel <= 0} @click=${() => (this._sel = sel - 1)}>→</button>
      </div>
      ${this._renderNoche(elegida)}
    `;
  }
}

if (!customElements.get(CARD_TAG)) customElements.define(CARD_TAG, NocheSolarCard);

const w = window as unknown as { customCards?: unknown[] };
w.customCards = w.customCards || [];
w.customCards.push({
  type: CARD_TAG,
  name: "Noche Solar Card",
  description: "En qué se gasta la batería cada noche solar: kWh por aparato partidos en batería, red y sol",
});

/* eslint-disable no-console */
console.info(`%c NOCHE-SOLAR-CARD %c v${CARD_VERSION} `, "color:#fff;background:#29a37a;font-weight:700", "color:#29a37a");
