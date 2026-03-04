class TeslaEnergyFlowCard extends HTMLElement {
  static version = "0.2.5";
  static _assetBaseUrl = null;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
    this._demoData = null;
    this._initialized = false;
    this._elements = {};
  }

  static _guessAssetBaseUrl() {
    if (TeslaEnergyFlowCard._assetBaseUrl) return TeslaEnergyFlowCard._assetBaseUrl;

    // Try to derive base path from the script URL used by Home Assistant resources.
    const scripts = Array.from(document.querySelectorAll("script[src]"));
    const match = scripts.find((s) => {
      const src = String(s.getAttribute("src") || "");
      return src.endsWith("/tesla-energy-flow-card.js") || src.includes("tesla-energy-flow-card.js");
    });

    if (match) {
      try {
        const u = new URL(match.src, window.location.href);
        u.pathname = u.pathname.replace(/\/[^/]*$/, "");
        u.search = "";
        u.hash = "";
        TeslaEnergyFlowCard._assetBaseUrl = u.toString().replace(/\/$/, "");
        return TeslaEnergyFlowCard._assetBaseUrl;
      } catch {
        // ignore and fall back below
      }
    }

    // Fallback to the original default path (common HACS layout).
    TeslaEnergyFlowCard._assetBaseUrl = `${window.location.origin}/hacsfiles/tesla-power-widget`;
    return TeslaEnergyFlowCard._assetBaseUrl;
  }

  static _assetUrl(fileName) {
    const base = TeslaEnergyFlowCard._guessAssetBaseUrl();
    return `${base}/${String(fileName).replace(/^\//, "")}`;
  }

  setConfig(config) {
    const defaultImageUrl = TeslaEnergyFlowCard._assetUrl("home.png");
    this._config = {
      title: "Energy",
      entities: {},
      image_url: defaultImageUrl,
      title_size: "18px",
      value_size: "52px",
      title_size_mobile: "14px",
      value_size_mobile: "36px",
      line_color: null,
      text_color: null,
      text_dim_color: null,
      labels: {
        home: "Casa",
        solar: "Pannelli Solari",
        grid: "Rete",
        battery: "Batteria",
        car: "Auto",
      },
      ...config,
    };

    if (!this._initialized) {
      this._renderBase();
      this._initialized = true;
    }

    this._setImageSource(this._config.image_url);
    this._applyStyleConfig();
    this._applyLabels();
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

  _applyLabels() {
    const labels = this._config.labels || {};
    const titleEls = this.shadowRoot?.querySelectorAll("[data-title]");
    if (!titleEls) return;
    titleEls.forEach((el) => {
      const k = el.getAttribute("data-title");
      if (!k) return;
      const next = labels[k];
      if (typeof next === "string") el.textContent = next;
    });
  }

  _renderBase() {
    const root = document.createElement("div");
    root.className = "tec-card";
    root.setAttribute("part", "card");

    root.innerHTML = `
      <style>
        :host {
          display: block;
          min-height: 560px;
        }

        * { box-sizing: border-box; }

        ha-card {
          margin: 0;
          padding: 0;
          background: transparent !important;
          box-shadow: none !important;
          border: 0 !important;
          overflow: hidden;
        }

        .tec-card {
          position: relative;
          width: 100%;
          min-height: 560px;
          background: transparent;
          color: var(--text-main, #f2f2f2);
          font-family: var(--font, "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif);
          overflow: hidden;
        }

        .tec-card__center {
          position: absolute;
          left: 50%;
          top: 56%;
          transform: translate(-50%, -50%);
          width: min(74%, 820px);
          max-height: 70%;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .tec-card__image {
          width: 100%;
          max-width: var(--image-max-width, 820px);
          max-height: var(--image-max-height, 420px);
          object-fit: contain;
          display: block;
        }

        .tec-card__image-fallback {
          width: min(100%, 820px);
          height: 320px;
          border: 1px solid #2b2b2b;
          background: #121212;
          color: #8f8f8f;
          display: none;
          align-items: center;
          justify-content: center;
          font-size: 14px;
          letter-spacing: .02em;
        }

        .tec-card__node {
          position: absolute;
          transform: translate(-50%, -50%);
          min-width: 150px;
          text-align: center;
          pointer-events: none;
        }

        .tec-card__node.hidden { opacity: 0; }

        .tec-card__title {
          font-size: var(--title-size, 18px);
          line-height: 1.2;
          font-weight: var(--title-weight, 400);
          color: var(--text-dim, #b9b9b9);
          margin-bottom: 5px;
        }

        .tec-card__value {
          font-size: var(--value-size, 52px);
          line-height: 1;
          font-weight: var(--value-weight, 700);
          letter-spacing: -0.02em;
          color: var(--text-main, #f2f2f2);
        }

        .tec-card__line {
          position: absolute;
          left: 50%;
          width: var(--line-width, 1px);
          background: var(--line, #6f6f6f);
          transform: translateX(-50%);
          opacity: 0.95;
        }

        .tec-card__line--down {
          top: calc(100% + 10px);
          height: var(--line-len, 180px);
        }

        .tec-card__line--up {
          bottom: calc(100% + 10px);
          height: var(--line-len, 180px);
        }

        .tec-card__line.hidden { display: none; }

        .tec-card__version {
          position: absolute;
          right: 10px;
          bottom: 8px;
          font-size: 10px;
          line-height: 1;
          color: var(--version-color, #7f7f7f);
          letter-spacing: .02em;
        }

        :host {
          --text-main: var(--tef-text-main, var(--primary-text-color, #f2f2f2));
          --text-dim: var(--tef-text-dim, color-mix(in srgb, var(--text-main) 72%, transparent));
          --line: var(--tef-line, color-mix(in srgb, var(--text-main) 46%, transparent));
          --version-color: var(--tef-version, color-mix(in srgb, var(--text-main) 40%, transparent));
        }

        @media (max-width: 960px) {
          :host { min-height: 620px; }
          .tec-card { min-height: 620px; }
          .tec-card__center { top: 58%; width: min(92%, 820px); }
          .tec-card__node { min-width: 100px; }
          .tec-card__title { font-size: var(--title-size-mobile, var(--title-size, 14px)); }
          .tec-card__value { font-size: var(--value-size-mobile, var(--value-size, 36px)); }
        }
      </style>

      <ha-card part="ha-card">
        <div class="tec-card">
          <div class="tec-card__center" part="center" aria-hidden="true">
            <img class="tec-card__image" part="image" id="homeImage" alt="Home" />
            <div class="tec-card__image-fallback" part="image-fallback" id="homeFallback">home.png non trovato</div>
          </div>

          <div class="tec-card__node" part="node node-home" id="n-home" style="left: 26%; top: 22%; --line-len: 238px;">
            <div class="tec-card__title" part="title title-home" data-title="home">Casa</div>
            <div class="tec-card__value" part="value value-home" data-k="home">--</div>
            <div class="tec-card__line tec-card__line--down" part="line line-home line-down"></div>
          </div>

          <div class="tec-card__node" part="node node-solar" id="n-solar" style="left: 66%; top: 20%; --line-len: 206px;">
            <div class="tec-card__title" part="title title-solar" data-title="solar">Pannelli Solari</div>
            <div class="tec-card__value" part="value value-solar" data-k="solar">--</div>
            <div class="tec-card__line tec-card__line--down" part="line line-solar line-down"></div>
          </div>

          <div class="tec-card__node" part="node node-grid" id="n-grid" style="left: 84%; top: 66%; --line-len: 125px;">
            <div class="tec-card__title" part="title title-grid" data-title="grid">Rete</div>
            <div class="tec-card__value" part="value value-grid" data-k="grid">--</div>
            <div class="tec-card__line tec-card__line--up" part="line line-grid line-up"></div>
          </div>

          <div class="tec-card__node" part="node node-battery" id="n-battery" style="left: 50%; top: 86%; --line-len: 124px;">
            <div class="tec-card__title" part="title title-battery" data-title="battery">Batteria</div>
            <div class="tec-card__value" part="value value-battery" data-k="battery">--</div>
            <div class="tec-card__line tec-card__line--up" part="line line-battery line-up"></div>
          </div>

          <div class="tec-card__node" part="node node-car" id="n-car" style="left: 16%; top: 66%; --line-len: 125px;">
            <div class="tec-card__title" part="title title-car" data-title="car">Auto</div>
            <div class="tec-card__value" part="value value-car" data-k="car">--</div>
            <div class="tec-card__line tec-card__line--up" part="line line-car line-up"></div>
          </div>

          <div class="tec-card__version" id="cardVersion">v${TeslaEnergyFlowCard.version}</div>
        </div>
      </ha-card>
    `;

    this.shadowRoot.innerHTML = "";
    this.shadowRoot.appendChild(root);

    this._elements = {
      image: root.querySelector("#homeImage"),
      fallback: root.querySelector("#homeFallback"),
      version: root.querySelector("#cardVersion"),
      nodes: {
        home: root.querySelector("#n-home"),
        solar: root.querySelector("#n-solar"),
        grid: root.querySelector("#n-grid"),
        battery: root.querySelector("#n-battery"),
        car: root.querySelector("#n-car"),
      },
    };

    if (this._elements.version) {
      this._elements.version.textContent = `v${TeslaEnergyFlowCard.version}`;
    }
  }

  _setImageSource(primaryUrl) {
    const urls = [
      primaryUrl,
      TeslaEnergyFlowCard._assetUrl("home.png"),
      `${window.location.origin}/local/home.png`,
    ].filter(Boolean);

    const unique = [...new Set(urls)];
    let idx = 0;
    const img = this._elements.image;

    const tryNext = () => {
      if (idx >= unique.length) {
        img.onload = null;
        img.onerror = null;
        img.style.display = "none";
        this._elements.fallback.style.display = "flex";
        return;
      }

      const url = unique[idx++];
      img.onload = () => {
        img.onload = null;
        img.onerror = null;
        img.style.display = "block";
        this._elements.fallback.style.display = "none";
      };
      img.onerror = () => {
        tryNext();
      };
      img.src = url;
    };

    tryNext();
  }

  _applyStyleConfig() {
    const host = this.style;
    const cfg = this._config || {};

    host.setProperty("--title-size", cfg.title_size || "18px");
    host.setProperty("--value-size", cfg.value_size || "52px");
    host.setProperty("--title-size-mobile", cfg.title_size_mobile || "14px");
    host.setProperty("--value-size-mobile", cfg.value_size_mobile || "36px");

    if (cfg.line_color) host.setProperty("--tef-line", cfg.line_color);
    else host.removeProperty("--tef-line");

    if (cfg.text_color) host.setProperty("--tef-text-main", cfg.text_color);
    else host.removeProperty("--tef-text-main");

    if (cfg.text_dim_color) host.setProperty("--tef-text-dim", cfg.text_dim_color);
    else host.removeProperty("--tef-text-dim");
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

    const e = this._config.entities || {};

    return {
      solar: this._powerToKw(this._hass?.states?.[e.solar_power]),
      home: this._powerToKw(this._hass?.states?.[e.home_power]),
      grid: this._powerToKw(this._hass?.states?.[e.grid_power]),
      batteryPower: this._powerToKw(this._hass?.states?.[e.battery_power]),
      batterySoc: this._stateNum(e.battery_soc),
      carPower: this._powerToKw(this._hass?.states?.[e.car_power]),
      carSoc: this._stateNum(e.car_soc),
    };
  }

  _formatPower(v) {
    if (!Number.isFinite(v)) return "--";
    return `${Math.abs(v).toFixed(1)} kW`;
  }

  _setNode(key, powerKw, visible) {
    const node = this._elements.nodes[key];
    if (!node) return;

    node.classList.toggle("hidden", !visible);

    const line = node.querySelector(".tec-card__line");
    if (line) line.classList.toggle("hidden", !visible);

    const valueEl = this.shadowRoot.querySelector(`[data-k='${key}']`);
    if (valueEl) valueEl.textContent = this._formatPower(powerKw);
  }

  _renderFromState() {
    if (!this._initialized) return;

    const data = this._readData();

    const solar = Math.max(0, this._toNumber(data.solar, 0));
    const home = Math.max(0, this._toNumber(data.home, 0));
    const grid = this._toNumber(data.grid, null);
    const batteryPower = this._toNumber(data.batteryPower, null);
    const batterySoc = this._toNumber(data.batterySoc, null);
    const carPower = this._toNumber(data.carPower, null);
    const carSoc = this._toNumber(data.carSoc, null);

    this._setNode("solar", solar, true);
    this._setNode("home", home, true);

    const showGrid = grid !== null;
    this._setNode("grid", grid || 0, showGrid);

    const showBattery = batteryPower !== null || batterySoc !== null;
    this._setNode("battery", batteryPower || 0, showBattery);

    const showCar = carPower !== null || carSoc !== null;
    this._setNode("car", carPower || 0, showCar);
  }
}

customElements.define("tesla-energy-flow-card", TeslaEnergyFlowCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "tesla-energy-flow-card",
  name: "Tesla Energy Flow Card",
  description: "Minimal Tesla-like static layout with centered home image",
});
