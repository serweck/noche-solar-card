# Noche Solar Card

Tarjeta Lovelace para Home Assistant que enseña **en qué se gasta la batería cada «noche solar»** (desde que la batería empieza a descargarse por la tarde hasta que el sol vuelve a cargarla): los kWh de cada parte de la casa, partidos en lo que salió de la **batería** (verde), de la **red** (azul) y del **sol** (ámbar).

- Cabecera con las fechas de la noche, la etiqueta «en curso» o «sin carga solar», las horas y el % de batería al empezar y al terminar.
- Tres cifras: total de la casa, de batería y de la red (y del sol si hubo).
- Una barra por aparato, de mayor a menor, con los números al lado: «5,1 (3,6 + 1,5)».
- La carga de la batería desde la red durante la noche: «+ Red → batería (valle): 8,1 kWh».
- Dos desplegables cerrados al cargar:
  - **Por horas de esta noche**: barras apiladas por hora, sacadas de las estadísticas de HA (se piden solo al abrirlo).
  - **Historial de noches**: una barra por noche (las 14 últimas a la vista) y flechas ← → para ver cualquier noche guardada entera.

Los datos los generan los sensores del paquete `noche_solar` (repo Paneles): `sensor.noche_solar`, `sensor.noche_solar_historial` y los tres contadores `sensor.noche_solar_energia_*`.

## Instalación (HACS)

1. HACS → menú ⋮ → *Repositorios personalizados* → `https://github.com/serweck/noche-solar-card`, tipo *Dashboard*.
2. Instala **Noche Solar Card** y recarga el navegador.

## Configuración

```yaml
type: custom:noche-solar-card
entity: sensor.noche_solar                       # obligatorio
historial: sensor.noche_solar_historial          # opcional: sin él no hay «Historial de noches»
energia:                                         # opcional: sin ellos no hay «Por horas»; batería, red y sol, en ese orden
  - sensor.noche_solar_energia_bateria
  - sensor.noche_solar_energia_red
  - sensor.noche_solar_energia_sol
aparatos:                                        # opcional: qué filas y con qué nombre; por defecto, todas
  - { slug: aerotermia, nombre: Aerotermia }
  - { slug: cocina, nombre: Cocina }
  - { slug: despacho, nombre: Despacho }
  - { slug: domotica, nombre: Domótica }
  - { slug: acs, nombre: ACS }
  - { slug: jacuzzi, nombre: Jacuzzi }
  - { slug: piscina, nombre: Piscina }
  - { slug: bomba_aerotermia, nombre: Bomba Aerotermia }
  - { slug: calentador_agua_2, nombre: Calentador Agua 2 }
  - { slug: subcuadro_resto, nombre: Subcuadro (resto) }
  - { slug: otros, nombre: Otros }
```

`aparatos` decide qué filas se ven y con qué nombre (salen siempre de mayor a menor consumo): se pueden quitar, renombrar o reordenar sin miedo.

> **El historial no depende de `aparatos`.** Cada noche guardada lleva los kWh de los aparatos por posición (sin el nombre, para caber en el límite de 16 KB del recorder), en el orden de `APARATOS` de `tools/noche_solar.py`. La tarjeta los lee siempre con ese orden fijo, que lleva dentro. Si algún día cambia `APARATOS` (un aparato nuevo, otro orden), hay que cambiar también `APARATOS_POR_DEFECTO` en `src/model.ts` y sacar una versión nueva.

Las horas se ven en la zona horaria de HA.

## Desarrollo

```bash
npm install
npm test          # vitest (jsdom)
npm run typecheck
npm run build     # dist/noche-solar-card.js
npm run preview   # http://localhost:8767/preview.html (?light para el tema claro)
```

## Licencia

MIT
