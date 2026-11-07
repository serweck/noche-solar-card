import { css } from "lit";

export const styles = css`
  :host {
    --ns-bat: #29a37a;
    --ns-red: #4c9be8;
    --ns-sol: #f3a712;
    --ns-line: var(--divider-color, rgba(127, 127, 127, 0.25));
    --ns-mut: var(--secondary-text-color, #9b9b9b);
    --ns-chip: var(--secondary-background-color, rgba(127, 127, 127, 0.12));
  }
  ha-card { display: block; padding: 14px 16px 12px; font-size: 13px; }
  .bat { background: var(--ns-bat); }
  .red { background: var(--ns-red); }
  .sol { background: var(--ns-sol); }

  .head { display: flex; justify-content: space-between; align-items: baseline; gap: 8px; margin-bottom: 4px; }
  .head .t { font-weight: 600; font-size: 15px; }
  .badge { flex: none; font-size: 11px; padding: 2px 8px; border-radius: 10px; white-space: nowrap;
           background: rgba(232, 163, 61, 0.2); color: #c98314; }
  .badge.live { background: rgba(41, 163, 122, 0.18); color: var(--ns-bat); }
  .meta { font-size: 12px; color: var(--ns-mut); margin-bottom: 10px; }
  .empty { color: var(--ns-mut); padding: 6px 0; }

  .src { display: grid; grid-template-columns: repeat(var(--ns-n, 3), minmax(0, 1fr)); gap: 6px; margin-bottom: 10px; }
  .src > div { border: 1px solid var(--ns-line); border-radius: 8px; padding: 6px 8px; font-size: 12px; color: var(--ns-mut); min-width: 0;
               white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .src.n4 { gap: 4px; }
  .src.n4 > div { padding: 6px; font-size: 11px; }
  .src.n4 b { font-size: 14px; }
  .src b { display: block; font-size: 16px; color: var(--primary-text-color); white-space: nowrap; }
  .src .c-bat b { color: var(--ns-bat); }
  .src .c-red b { color: var(--ns-red); }
  .src .c-sol b { color: var(--ns-sol); }

  .leg { display: flex; gap: 12px; font-size: 11px; color: var(--ns-mut); margin: 0 0 6px; }
  .leg i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 4px; vertical-align: -1px; }

  .row { display: grid; grid-template-columns: minmax(0, 8em) minmax(0, 1fr) auto; align-items: center; gap: 8px; margin: 5px 0; font-size: 12px; }
  .row .n { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bar { display: flex; height: 14px; border-radius: 3px; overflow: hidden; min-width: 2px; }
  .num { white-space: nowrap; text-align: right; font-variant-numeric: tabular-nums; }
  .num small { color: var(--ns-mut); font-size: 11px; }
  .valle { font-size: 12px; color: var(--ns-mut); margin-top: 8px; }

  .sec { border: 1px solid var(--ns-line); border-radius: 8px; margin-top: 10px; }
  .sec > button { all: unset; box-sizing: border-box; width: 100%; cursor: pointer; padding: 8px 10px; font-weight: 600;
                  display: flex; justify-content: space-between; align-items: center; }
  .sec > button::after { content: "▸"; color: var(--ns-mut); transition: transform 0.15s; }
  .sec > button[aria-expanded="true"]::after { transform: rotate(90deg); }
  .sec > button:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); border-radius: 8px; }
  .sec .body { padding: 0 10px 10px; }
  .msg { color: var(--ns-mut); font-size: 12px; padding: 4px 0; }

  .chart { display: flex; align-items: flex-end; gap: 3px; height: 110px; margin: 6px 0 4px; }
  .col { flex: 1 1 0; min-width: 0; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: stretch; }
  .stack { display: flex; flex-direction: column-reverse; border-radius: 2px 2px 0 0; overflow: hidden; }
  .lab { font-size: 9px; color: var(--ns-mut); height: 12px; line-height: 12px; white-space: nowrap; margin-top: 2px;
         display: flex; justify-content: center; overflow: visible; }
  .hist .col { all: unset; flex: 1 1 0; min-width: 0; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; cursor: pointer; border-radius: 3px; }
  .hist .col.on .lab { color: var(--primary-text-color); font-weight: 600; }
  .hist .col.on .stack { outline: 2px solid var(--primary-text-color); outline-offset: 1px; }

  .nav { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin: 8px 0 2px; }
  .nav button { all: unset; cursor: pointer; width: 32px; height: 32px; border-radius: 50%; text-align: center; line-height: 32px;
                background: var(--ns-chip); font-size: 16px; }
  .nav button:disabled { opacity: 0.35; cursor: default; }
  .nav button:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); }
  .nav .d { text-align: center; font-weight: 600; }
  .nav .d .badge { margin-left: 6px; font-weight: 400; }
`;
