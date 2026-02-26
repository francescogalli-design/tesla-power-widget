/* Tesla Energy Flow Card - dependency free custom Lovelace card */
class TeslaEnergyFlowCard extends HTMLElement {
  static version = "0.1.0";

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._demoData = null;
    this._themeMode = "auto";
    this._weatherState = { isDay: null, cloud: null };
    this._initialized = false;
    this._elements = {};
  }

  setConfig(config) {
    this._config = {
      title: "Energy",
      theme_mode: "auto",
      show_header: true,
      show_theme_toggle: false,
      entities: {},
      ...config,
    };

    this._themeMode = this._config.theme_mode || "auto";

    if (!this._initialized) {
      this._renderBase();
      this._initialized = true;
    }

    this._setupThemeControls();
    this._applyTheme();
    this._renderFromState();
  }

  set hass(hass) {
    this._hass = hass;
    this._renderFromState();
  }

  getCardSize() {
    return 6;
  }

  setDemoData(payload) {
    this._demoData = payload;
    this._renderFromState();
  }

  _renderBase() {
    const root = document.createElement("div");
    root.className = "card-root";

    root.innerHTML = `
      <style>
        :host {
          --tef-bg-top: #1f2b3a;
          --tef-bg-mid: #121b2a;
          --tef-bg-bot: #090f17;
          --tef-text-main: #f3f7ff;
          --tef-text-dim: rgba(232, 239, 252, 0.68);
          --tef-wire-idle: rgba(255, 255, 255, 0.2);
          --tef-solar: #f7be2e;
          --tef-grid: #79c8ff;
          --tef-battery: #69df8c;
          --tef-car: #c8a5ff;
          --tef-panel-bg: rgba(7, 13, 22, 0.52);
          --tef-panel-border: rgba(255, 255, 255, 0.14);
          --tef-font-main: "Montserrat", "Avenir Next", "Segoe UI", sans-serif;
          display: block;
          min-height: 510px;
        }

        * { box-sizing: border-box; }

        .card-root {
          position: relative;
          width: 100%;
          min-height: 510px;
          border-radius: 0;
          overflow: hidden;
          background: transparent;
          color: var(--tef-text-main);
          font-family: var(--tef-font-main);
        }

        .sky {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            radial-gradient(760px 260px at 20% 16%, rgba(210, 223, 244, 0.11), transparent 70%),
            radial-gradient(760px 280px at 76% 12%, rgba(212, 230, 255, 0.12), transparent 70%);
          opacity: 0.58;
          transition: opacity .35s ease;
        }

        .moon {
          position: absolute;
          right: 11%;
          top: 8%;
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: radial-gradient(circle at 43% 43%, #f6faff 0%, #dce8ff 45%, rgba(201, 220, 255, 0.08) 70%, rgba(181, 208, 255, 0) 76%);
          box-shadow: 0 0 24px rgba(213, 230, 255, 0.44);
          opacity: 0;
          transition: opacity .35s ease;
          pointer-events: none;
          display: none;
        }

        .header {
          position: absolute;
          left: 12px;
          right: 12px;
          top: 12px;
          z-index: 3;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 7px 10px;
          border-radius: 10px;
          border: 1px solid var(--tef-panel-border);
          background: var(--tef-panel-bg);
          backdrop-filter: blur(7px);
          font-size: 11px;
          letter-spacing: .03em;
          text-transform: uppercase;
          color: #dce8fb;
        }

        .header.hidden { display: none; }

        .left-group,
        .right-group {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .title {
          font-size: 12px;
          font-weight: 700;
          white-space: nowrap;
        }

        .weather,
        .updated {
          color: rgba(223, 235, 252, 0.82);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 200px;
        }

        .seg {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          border: 1px solid rgba(255,255,255,0.14);
          border-radius: 8px;
          background: rgba(14, 22, 34, 0.75);
          padding: 2px;
        }

        .seg.hidden { display: none; }

        .seg button {
          border: 0;
          background: transparent;
          color: #d5e3fa;
          font: inherit;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          border-radius: 6px;
          padding: 4px 7px;
          cursor: pointer;
        }

        .seg button.active {
          background: rgba(255,255,255,0.16);
          color: #ffffff;
        }

        .layer {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .wire-idle {
          stroke: var(--tef-wire-idle);
          stroke-width: 1.8;
          stroke-linecap: square;
          fill: none;
        }

        .flow-main {
          stroke-width: 3.6;
          stroke-linecap: square;
          fill: none;
          stroke-dasharray: 7 11;
          animation: tefFlow 1.2s linear infinite;
          filter: drop-shadow(0 0 6px rgba(255,255,255,0.22));
          opacity: 0;
        }

        .flow-core {
          stroke-width: 1.2;
          stroke-linecap: square;
          fill: none;
          stroke: rgba(255,255,255,0.86);
          stroke-dasharray: 2 14;
          animation: tefFlow .72s linear infinite;
          opacity: 0;
        }

        @keyframes tefFlow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -36; }
        }

        .cube-wrap {
          position: absolute;
          left: 50%;
          top: 57%;
          transform: translate(-50%, -50%);
          width: 172px;
          height: 172px;
          perspective: 850px;
          pointer-events: none;
          display: none;
        }

        .cube {
          position: absolute;
          width: 172px;
          height: 172px;
          transform-style: preserve-3d;
          transform: rotateX(-21deg) rotateY(34deg);
        }

        .face {
          position: absolute;
          width: 172px;
          height: 172px;
          border: 1px solid rgba(214, 232, 255, 0.34);
          background: #182233;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.06);
        }

        .face.front { transform: translateZ(86px); }
        .face.back { transform: rotateY(180deg) translateZ(86px); }
        .face.right { transform: rotateY(90deg) translateZ(86px); }
        .face.left { transform: rotateY(-90deg) translateZ(86px); }
        .face.bottom { transform: rotateX(-90deg) translateZ(86px); background: #121a27; }

        .face.top {
          transform: rotateX(90deg) translateZ(86px);
          background: #25354d;
        }

        .base-glow {
          position: absolute;
          left: 50%;
          top: calc(57% + 100px);
          width: 280px;
          height: 12px;
          transform: translateX(-50%);
          background: transparent;
          filter: none;
          pointer-events: none;
          display: none;
        }

        .node {
          position: absolute;
          transform: translate(-50%, -50%);
          min-width: 84px;
          text-align: center;
          pointer-events: none;
          transition: opacity .18s ease;
        }

        .node.hidden { opacity: 0; }

        .name {
          font-size: 12px;
          font-weight: 600;
          line-height: 1.1;
          color: var(--tef-text-dim);
        }

        .value {
          margin-top: 2px;
          font-size: 29px;
          font-weight: 700;
          line-height: 1;
          letter-spacing: -0.018em;
          text-shadow: 0 1px 8px rgba(0,0,0,.34);
        }

        .meta {
          margin-top: 5px;
          display: inline-block;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .07em;
          text-transform: uppercase;
          color: rgba(245,251,255,0.82);
          border: 1px solid rgba(255,255,255,0.18);
          border-radius: 999px;
          padding: 3px 6px;
          background: rgba(10,16,26,0.5);
        }

        .ground {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 36%;
          pointer-events: none;
          background: linear-gradient(180deg, rgba(4,8,12,0) 0%, rgba(4,8,12,.76) 32%, #04070d 100%);
          display: none;
        }

        .legend {
          position: absolute;
          right: 12px;
          bottom: 12px;
          z-index: 3;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5px 9px;
          font-size: 9px;
          letter-spacing: .05em;
          text-transform: uppercase;
          padding: 8px 9px;
          border-radius: 9px;
          border: 1px solid var(--tef-panel-border);
          background: var(--tef-panel-bg);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          box-shadow: 0 0 6px rgba(255,255,255,.24);
        }

        .dot.solar { background: var(--tef-solar); }
        .dot.grid { background: var(--tef-grid); }
        .dot.battery { background: var(--tef-battery); }
        .dot.car { background: var(--tef-car); }

        @media (max-width: 768px) {
          :host { min-height: 540px; }
          .header { font-size: 10px; }
          .value { font-size: 24px; }
          .legend { grid-template-columns: 1fr; }
          .cube-wrap { width: 148px; height: 148px; }
          .cube, .face { width: 148px; height: 148px; }
          .face.front { transform: translateZ(74px); }
          .face.back { transform: rotateY(180deg) translateZ(74px); }
          .face.right { transform: rotateY(90deg) translateZ(74px); }
          .face.left { transform: rotateY(-90deg) translateZ(74px); }
          .face.bottom { transform: rotateX(-90deg) translateZ(74px); }
          .face.top { transform: rotateX(90deg) translateZ(74px); }
        }
      </style>

      <div class="sky" id="sky"></div>
      <div class="moon" id="moon"></div>

      <div class="header" id="header">
        <div class="left-group">
          <div class="title" id="title"></div>
          <div class="weather" id="weather">--</div>
        </div>
        <div class="right-group">
          <div class="updated" id="updated">--</div>
          <div class="seg" id="themeSwitch">
            <button data-theme="auto" class="active">Auto</button>
            <button data-theme="day">Day</button>
            <button data-theme="night">Night</button>
          </div>
        </div>
      </div>

      <svg class="layer" viewBox="0 0 1000 620" preserveAspectRatio="none" aria-hidden="true">
        <g id="wiresLayer"></g>
        <g id="flowsMainLayer"></g>
        <g id="flowsCoreLayer"></g>
      </svg>

      <div class="cube-wrap" aria-hidden="true">
        <div class="cube">
          <div class="face front"></div>
          <div class="face back"></div>
          <div class="face right"></div>
          <div class="face left"></div>
          <div class="face top"></div>
          <div class="face bottom"></div>
        </div>
      </div>

      <div class="base-glow" aria-hidden="true"></div>

      <div class="node" id="n-solar">
        <div class="name">Solar Panels</div>
        <div class="value" data-k="solar">--</div>
        <div class="meta" data-m="solar">--</div>
      </div>

      <div class="node" id="n-home">
        <div class="name">Home</div>
        <div class="value" data-k="home">--</div>
        <div class="meta" data-m="home">Load</div>
      </div>

      <div class="node" id="n-grid">
        <div class="name">Grid</div>
        <div class="value" data-k="grid">--</div>
        <div class="meta" data-m="grid">Import</div>
      </div>

      <div class="node" id="n-battery">
        <div class="name">Powerwall</div>
        <div class="value" data-k="battery">--</div>
        <div class="meta" data-m="battery">--%</div>
      </div>

      <div class="node" id="n-car">
        <div class="name">EV</div>
        <div class="value" data-k="car">--</div>
        <div class="meta" data-m="car">Standby</div>
      </div>

      <div class="legend">
        <div class="legend-item"><span class="dot solar"></span>Solar</div>
        <div class="legend-item"><span class="dot grid"></span>Grid</div>
        <div class="legend-item"><span class="dot battery"></span>Battery</div>
        <div class="legend-item"><span class="dot car"></span>Car</div>
      </div>

      <div class="ground"></div>
    `;

    this.shadowRoot.innerHTML = "";
    this.shadowRoot.appendChild(root);

    this._elements = {
      root,
      header: root.querySelector("#header"),
      title: root.querySelector("#title"),
      weather: root.querySelector("#weather"),
      updated: root.querySelector("#updated"),
      themeSwitch: root.querySelector("#themeSwitch"),
      sky: root.querySelector("#sky"),
      moon: root.querySelector("#moon"),
      wiresLayer: root.querySelector("#wiresLayer"),
      flowsMainLayer: root.querySelector("#flowsMainLayer"),
      flowsCoreLayer: root.querySelector("#flowsCoreLayer"),
      nodes: {
        solar: root.querySelector("#n-solar"),
        home: root.querySelector("#n-home"),
        grid: root.querySelector("#n-grid"),
        battery: root.querySelector("#n-battery"),
        car: root.querySelector("#n-car"),
      },
    };

    this._bindThemeSwitch();
    this._placeNodes();
    this._drawIdleWires();
  }

  _setupThemeControls() {
    if (!this._elements.themeSwitch) return;
    const show = !!this._config.show_theme_toggle;
    this._elements.themeSwitch.classList.toggle("hidden", !show);
    this._elements.header.classList.toggle("hidden", this._config.show_header === false);

    this._elements.title.textContent = this._config.title || "Energy";
  }

  _bindThemeSwitch() {
    const sw = this._elements.themeSwitch;
    if (!sw) return;

    sw.querySelectorAll("button").forEach((btn) => {
      btn.addEventListener("click", () => {
        this._themeMode = btn.dataset.theme || "auto";
        sw.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b === btn));
        this._applyTheme();
      });
    });
  }

  _placeNodes() {
    const layout = {
      solar: { x: 52, y: 18 },
      home: { x: 73, y: 38 },
      grid: { x: 73, y: 80 },
      battery: { x: 50, y: 80 },
      car: { x: 28, y: 38 },
    };

    Object.entries(layout).forEach(([key, pos]) => {
      const n = this._elements.nodes[key];
      if (!n) return;
      n.style.left = `${pos.x}%`;
      n.style.top = `${pos.y}%`;
    });
  }

  _wireConfig() {
    return {
      "solar->home": { from: [520, 132], to: [670, 236], type: "solar" },
      "solar->battery": { from: [500, 132], to: [500, 350], type: "solar" },
      "solar->grid": { from: [540, 132], to: [670, 350], type: "solar" },
      "solar->car": { from: [460, 132], to: [330, 236], type: "solar" },
      "battery->home": { from: [500, 350], to: [670, 236], type: "battery" },
      "grid->home": { from: [670, 350], to: [670, 236], type: "grid" },
      "grid->battery": { from: [670, 350], to: [500, 350], type: "grid" },
      "battery->grid": { from: [500, 350], to: [670, 350], type: "battery" },
      "grid->car": { from: [670, 350], to: [330, 236], type: "grid" },
      "battery->car": { from: [500, 350], to: [330, 236], type: "battery" },
      "home->car": { from: [670, 236], to: [330, 236], type: "car" },
    };
  }

  _orthogonalPath(from, to) {
    const [x1, y1] = from;
    const [x2, y2] = to;

    if (x1 === x2 || y1 === y2) {
      return `M ${x1} ${y1} L ${x2} ${y2}`;
    }

    const mx = x1;
    const my = y2;
    return `M ${x1} ${y1} L ${mx} ${my} L ${x2} ${y2}`;
  }

  _drawIdleWires() {
    this._elements.wiresLayer.innerHTML = "";
    const map = this._wireConfig();

    Object.values(map).forEach((cfg) => {
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("class", "wire-idle");
      p.setAttribute("d", this._orthogonalPath(cfg.from, cfg.to));
      this._elements.wiresLayer.appendChild(p);
    });
  }

  _applyTheme() {
    const mode = this._themeMode || this._config.theme_mode || "auto";
    const isDayAuto = this._deriveIsDay();
    const isDay = mode === "day" ? true : mode === "night" ? false : isDayAuto;

    const cloud = this._weatherState.cloud;
    const heavyCloud = cloud !== null && cloud > 70;

    const rootStyle = this._elements.root.style;

    if (isDay) {
      rootStyle.setProperty("--tef-bg-top", heavyCloud ? "#2c394a" : "#263445");
      rootStyle.setProperty("--tef-bg-mid", heavyCloud ? "#1a2534" : "#151f2e");
      rootStyle.setProperty("--tef-bg-bot", "#0a1018");
      this._elements.sky.style.opacity = heavyCloud ? "0.62" : "0.46";
      this._elements.moon.style.opacity = "0";
    } else {
      rootStyle.setProperty("--tef-bg-top", "#1d2a38");
      rootStyle.setProperty("--tef-bg-mid", "#121b29");
      rootStyle.setProperty("--tef-bg-bot", "#090f17");
      this._elements.sky.style.opacity = heavyCloud ? "0.56" : "0.38";
      this._elements.moon.style.opacity = "0.78";
    }
  }

  _deriveIsDay() {
    if (this._weatherState.isDay !== null) return this._weatherState.isDay;

    if (this._hass) {
      const sun = this._hass.states?.[this._config.sun_entity || "sun.sun"];
      if (sun) {
        return sun.state === "above_horizon";
      }
    }

    const hour = new Date().getHours();
    return hour >= 7 && hour < 19;
  }

  _toNumber(v, fallback = null) {
    if (v === undefined || v === null || v === "" || v === "unknown" || v === "unavailable") return fallback;
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  _powerToKw(stateObj) {
    if (!stateObj) return null;
    const value = this._toNumber(stateObj.state, null);
    if (value === null) return null;
    const uom = String(stateObj.attributes?.unit_of_measurement || "").toLowerCase();
    if (uom === "w") return value / 1000;
    return value;
  }

  _stateNum(entityId) {
    if (!this._hass || !entityId) return null;
    return this._toNumber(this._hass.states?.[entityId]?.state, null);
  }

  _readData() {
    if (this._demoData) return { ...this._demoData };

    const entities = this._config.entities || {};

    const solar = this._powerToKw(this._hass?.states?.[entities.solar_power]);
    const home = this._powerToKw(this._hass?.states?.[entities.home_power]);
    const grid = this._powerToKw(this._hass?.states?.[entities.grid_power]);
    const batteryPower = this._powerToKw(this._hass?.states?.[entities.battery_power]);
    const carPower = this._powerToKw(this._hass?.states?.[entities.car_power]);

    const batterySoc = this._stateNum(entities.battery_soc);
    const carSoc = this._stateNum(entities.car_soc);

    const weatherEntity = entities.weather || this._config.weather_entity;
    const weatherState = this._hass?.states?.[weatherEntity];
    if (weatherState) {
      const state = String(weatherState.state || "").toLowerCase();
      if (state.includes("night")) this._weatherState.isDay = false;
      if (state.includes("sunny") || state.includes("clear") || state.includes("cloud") || state.includes("rain")) this._weatherState.isDay = !state.includes("night");
      this._weatherState.cloud = this._toNumber(weatherState.attributes?.cloud_coverage, null);
      const temp = this._toNumber(weatherState.attributes?.temperature, null);
      this._elements.weather.textContent = `${weatherEntity} ${temp !== null ? `• ${temp.toFixed(1)}°` : ""}`;
    } else {
      this._elements.weather.textContent = "No weather entity";
    }

    return {
      solar: Math.max(0, solar ?? 0),
      home: Math.max(0, home ?? 0),
      grid,
      batteryPower,
      batterySoc,
      carPower,
      carSoc,
    };
  }

  _computeFlows(input) {
    const solar = Math.max(0, this._toNumber(input.solar, 0));
    const home = Math.max(0, this._toNumber(input.home, 0));
    const batteryPower = this._toNumber(input.batteryPower, null);
    const grid = this._toNumber(input.grid, null);
    const carPower = this._toNumber(input.carPower, null);

    const carLoad = carPower !== null ? Math.max(0, carPower) : 0;
    const demand = home + carLoad;

    const batteryCharge = batteryPower !== null ? Math.max(0, batteryPower) : 0;
    const batteryDischarge = batteryPower !== null ? Math.max(0, -batteryPower) : 0;

    const solarToDemand = Math.min(solar, demand);
    let demandLeft = demand - solarToDemand;

    const batteryToDemand = Math.min(demandLeft, batteryDischarge);
    demandLeft -= batteryToDemand;

    const gridToDemand = Math.max(0, demandLeft);

    let solarExcess = Math.max(0, solar - solarToDemand);
    const solarToBattery = Math.min(solarExcess, batteryCharge);
    solarExcess -= solarToBattery;
    const solarToGrid = Math.max(0, solarExcess);

    const gridToBattery = Math.max(0, batteryCharge - solarToBattery);
    const batteryToGrid = Math.max(0, batteryDischarge - batteryToDemand);

    const s = demand > 0 ? solarToDemand / demand : 0;
    const b = demand > 0 ? batteryToDemand / demand : 0;
    const g = demand > 0 ? gridToDemand / demand : 0;

    return {
      "solar->home": home * s,
      "solar->car": carLoad * s,
      "solar->battery": solarToBattery,
      "solar->grid": solarToGrid,
      "battery->home": home * b,
      "battery->car": carLoad * b,
      "grid->home": home * g,
      "grid->car": carLoad * g,
      "grid->battery": gridToBattery,
      "battery->grid": batteryToGrid,
      "home->car": 0,
      derivedGrid: grid !== null ? grid : (gridToDemand + gridToBattery - solarToGrid - batteryToGrid),
    };
  }

  _formatPower(v) {
    if (!Number.isFinite(v)) return "--";
    return `${Math.abs(v).toFixed(1)} kW`;
  }

  _showNode(key, visible) {
    this._elements.nodes[key].classList.toggle("hidden", !visible);
  }

  _setNode(key, power, meta) {
    this.shadowRoot.querySelector(`[data-k='${key}']`).textContent = this._formatPower(power);
    if (meta) this.shadowRoot.querySelector(`[data-m='${key}']`).textContent = meta;
  }

  _drawFlows(flows) {
    const colors = {
      solar: "var(--tef-solar)",
      grid: "var(--tef-grid)",
      battery: "var(--tef-battery)",
      car: "var(--tef-car)",
    };

    this._elements.flowsMainLayer.innerHTML = "";
    this._elements.flowsCoreLayer.innerHTML = "";

    const map = this._wireConfig();
    Object.entries(flows).forEach(([id, kw]) => {
      const cfg = map[id];
      if (!cfg || !Number.isFinite(kw) || kw <= 0.02) return;

      const intensity = Math.max(0.2, Math.min(1, kw / 7.5));
      const d = this._orthogonalPath(cfg.from, cfg.to);

      const main = document.createElementNS("http://www.w3.org/2000/svg", "path");
      main.setAttribute("class", "flow-main");
      main.setAttribute("d", d);
      main.style.stroke = colors[cfg.type] || "#fff";
      main.style.opacity = String(0.3 + intensity * 0.6);
      main.style.strokeWidth = String(2.8 + intensity * 2.2);
      main.style.animationDuration = `${1.7 - intensity * 1.0}s`;
      this._elements.flowsMainLayer.appendChild(main);

      const core = document.createElementNS("http://www.w3.org/2000/svg", "path");
      core.setAttribute("class", "flow-core");
      core.setAttribute("d", d);
      core.style.opacity = String(0.18 + intensity * 0.62);
      core.style.animationDuration = `${0.9 - intensity * 0.45}s`;
      this._elements.flowsCoreLayer.appendChild(core);
    });
  }

  _renderFromState() {
    if (!this._initialized) return;

    const data = this._readData();
    const flows = this._computeFlows(data);

    const solar = Math.max(0, this._toNumber(data.solar, 0));
    const home = Math.max(0, this._toNumber(data.home, 0));
    const grid = this._toNumber(data.grid, flows.derivedGrid);
    const batteryPower = this._toNumber(data.batteryPower, null);
    const batterySoc = this._toNumber(data.batterySoc, null);
    const carPower = this._toNumber(data.carPower, null);
    const carSoc = this._toNumber(data.carSoc, null);

    const localDemand = home + (carPower !== null ? Math.max(0, carPower) : 0);
    const localCoverage = localDemand > 0 ? Math.round((Math.min(localDemand, solar) / localDemand) * 100) : 0;

    this._showNode("solar", true);
    this._setNode("solar", solar, `${localCoverage}% local`);

    this._showNode("home", true);
    this._setNode("home", home, "Load");

    const showGrid = grid !== null;
    this._showNode("grid", showGrid);
    if (showGrid) this._setNode("grid", grid, grid >= 0 ? "Import" : "Export");

    const showBattery = batteryPower !== null || batterySoc !== null;
    this._showNode("battery", showBattery);
    if (showBattery) {
      const meta = batterySoc !== null ? `${Math.max(0, Math.min(100, Math.round(batterySoc)))}%` : (batteryPower >= 0 ? "Charging" : "Discharging");
      this._setNode("battery", batteryPower || 0, meta);
    }

    const showCar = carPower !== null || carSoc !== null;
    this._showNode("car", showCar);
    if (showCar) {
      const meta = carSoc !== null ? `${Math.max(0, Math.min(100, Math.round(carSoc)))}%` : ((carPower || 0) > 0 ? "Charging" : "Standby");
      this._setNode("car", carPower || 0, meta);
    }

    this._elements.updated.textContent = new Date().toLocaleTimeString("it-IT");

    this._applyTheme();
    this._drawFlows(flows);
  }
}

customElements.define("tesla-energy-flow-card", TeslaEnergyFlowCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "tesla-energy-flow-card",
  name: "Tesla Energy Flow Card",
  description: "Tesla-like animated energy flow card with minimal dependencies",
});
