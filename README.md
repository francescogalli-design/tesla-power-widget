# Tesla Energy Flow Card

Custom Lovelace card (senza framework) con layout minimale stile Tesla:

- sfondo trasparente (si integra col tema HA)
- font `Inter`
- immagine centrale `home.png`
- valori con titolo + potenza e linea retta grigia da 1px verso il centro
- nessuna legenda, nessun selettore tema, nessun tracciato SVG
- versione card mostrata in piccolo in basso a destra (allineata al tag release)
- tema chiaro/scuro automatico: cambia solo il colore di testo/linee

## Installazione Home Assistant (HACS)

1. In HACS: `Frontend` -> `...` -> `Custom repositories`
2. Aggiungi: `https://github.com/dev-galli/tesla-power-widget` (categoria `Dashboard`)
3. Installa la card
4. Riavvia Home Assistant o hard refresh browser
5. Verifica risorsa:
   - `/hacsfiles/tesla-power-widget/tesla-energy-flow-card.js` (tipo `module`)

## Aggiornamenti automatici HACS

Il repository include il workflow GitHub Actions:

`/.github/workflows/hacs-release.yml`

A ogni push su `main` crea automaticamente un nuovo tag/release, così HACS può segnalare un aggiornamento disponibile senza creazione manuale della release.

## Asset richiesto

Aggiungi anche `home.png` nel repository root (stesso livello di `tesla-energy-flow-card.js`), così è disponibile su:

`/hacsfiles/tesla-power-widget/home.png`

Fallback automatici immagine:

1. `image_url` da configurazione card
2. `/hacsfiles/tesla-power-widget/home.png`
3. `/local/home.png`

## Configurazione Lovelace

Snippet pronto: [examples/lovelace.yaml](/Users/francesco/Documents/Sviluppo/Homeassistant/TeslaPW/examples/lovelace.yaml)

```yaml
type: custom:tesla-energy-flow-card
title: Tesla Energy
image_url: /hacsfiles/tesla-power-widget/home.png
title_size: 18px
value_size: 52px
title_size_mobile: 14px
value_size_mobile: 36px
entities:
  solar_power: sensor.pv_power
  home_power: sensor.home_load_power
  grid_power: sensor.grid_power
  battery_power: sensor.powerwall_power
  battery_soc: sensor.powerwall_soc
  car_power: sensor.ev_charging_power
  car_soc: sensor.ev_battery_level
```

## Entità supportate

- `entities.solar_power` (W o kW)
- `entities.home_power` (W o kW)
- `entities.grid_power` (W o kW; `+` import, `-` export)
- `entities.battery_power` (W o kW; `+` charge, `-` discharge)
- `entities.battery_soc` (%)
- `entities.car_power` (W o kW)
- `entities.car_soc` (%)

Se un valore non è disponibile, il relativo blocco viene nascosto.

## Personalizzazione stile da YAML

- `title_size` (es. `18px`)
- `value_size` (es. `52px`)
- `title_size_mobile` (es. `14px`)
- `value_size_mobile` (es. `36px`)
- `line_color` (es. `#666666`)
- `text_color` (es. `#111111` per tema chiaro)
- `text_dim_color` (es. `#555555`)

## Demo browser locale

```bash
cd /Users/francesco/Documents/Sviluppo/Homeassistant/TeslaPW
python3 -m http.server 8080
```

Apri: `http://localhost:8080/index.html`
