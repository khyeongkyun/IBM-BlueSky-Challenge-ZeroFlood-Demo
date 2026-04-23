const INPUT_LAYERS = [
  { id: "s1rtc", label: "S1RTC SAR", path: "samples/s1rtc" },
  { id: "s2l2a", label: "S2L2A optical", path: "samples/s2l2a" },
  { id: "dem", label: "DEM", path: "samples/dem" },
  { id: "lulc", label: "LULC", path: "samples/lulc" },
];

const OVERLAY_LAYERS = [
  { id: "mask", label: "Ground truth mask", path: "samples/mask" },
  { id: "zf-sar", label: "ZeroFlood SAR", path: "samples/pred/zf-sar" },
  { id: "zf-sar-opt", label: "ZeroFlood SAR + S2", path: "samples/pred/zf-sar-opt" },
  { id: "zf-opt", label: "ZeroFlood S2", path: "samples/pred/zf-opt" },
  { id: "tim-sar-l", label: "TiM SAR -> LULC", path: "samples/pred/zf-tim-sar/l" },
  { id: "tim-sar-ds", label: "TiM SAR -> DEM + S2", path: "samples/pred/zf-tim-sar/ds" },
  { id: "tim-sar-dsl", label: "TiM SAR -> DEM + S2 + LULC", path: "samples/pred/zf-tim-sar/dsl" },
  { id: "tim-opt-s", label: "TiM S2 -> SAR", path: "samples/pred/zf-tim-opt/s" },
  { id: "tim-opt-sl", label: "TiM S2 -> SAR + LULC", path: "samples/pred/zf-tim-opt/sl" },
  { id: "tim-opt-dls", label: "TiM S2 -> DEM + LULC + SAR", path: "samples/pred/zf-tim-opt/dls" },
  { id: "tim-both-d", label: "TiM S1+S2 -> DEM", path: "samples/pred/zf-tim-sar-opt/d" },
  { id: "tim-both-dl", label: "TiM S1+S2 -> DEM + LULC", path: "samples/pred/zf-tim-sar-opt/dl" },
];

const BASEMAPS = {
  light: {
    name: "OpenStreetMap Light",
    tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
    attribution: "&copy; OpenStreetMap contributors",
  },
  satellite: {
    name: "Esri World Imagery",
    tiles: ["https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
    attribution: "Tiles &copy; Esri",
  },
  terrain: {
    name: "OpenTopoMap",
    tiles: ["https://a.tile.opentopomap.org/{z}/{x}/{y}.png"],
    attribution: "Map data &copy; OpenStreetMap contributors, SRTM | OpenTopoMap",
  },
};

const EUROPE_VIEW_BOUNDS = [
  [-25, 30],
  [65, 72],
];

const state = {
  samples: [],
  activeSample: null,
  country: "all",
  inputLayer: INPUT_LAYERS[0],
  overlayLayer: OVERLAY_LAYERS[4],
  mapStyle: "light",
  map: null,
  markers: new Map(),
};

const el = {
  countrySelect: document.getElementById("country-select"),
  sampleSelect: document.getElementById("sample-select"),
  inputSelect: document.getElementById("input-select"),
  overlaySelect: document.getElementById("overlay-select"),
  sampleTitle: document.getElementById("sample-title"),
  sampleCoords: document.getElementById("sample-coords"),
  comparison: document.getElementById("comparison"),
  baseImage: document.getElementById("base-image"),
  overlayImage: document.getElementById("overlay-image"),
  overlaySlider: document.getElementById("overlay-slider"),
  baseLabel: document.getElementById("base-label"),
  overlayLabel: document.getElementById("overlay-label"),
  mapReset: document.getElementById("map-reset"),
  mapFallback: document.getElementById("map-fallback"),
  copyCitation: document.getElementById("copy-citation"),
  bibtex: document.getElementById("bibtex"),
};

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function basemapStyle(kind) {
  const source = BASEMAPS[kind] || BASEMAPS.light;
  return {
    version: 8,
    sources: {
      basemap: {
        type: "raster",
        tiles: source.tiles,
        tileSize: 256,
        attribution: source.attribution,
      },
    },
    layers: [
      {
        id: "basemap",
        type: "raster",
        source: "basemap",
        minzoom: 0,
        maxzoom: 19,
      },
    ],
  };
}

function imagePath(layer, sample) {
  return `${layer.path}/${sample.id}.png`;
}

function formatCoord(value, pos, neg) {
  const dir = value >= 0 ? pos : neg;
  return `${Math.abs(value).toFixed(4)} ${dir}`;
}

function lngLat(sample) {
  // MapLibre expects longitude first. Use named fields to avoid lat/lon swaps.
  return { lng: Number(sample.lon), lat: Number(sample.lat) };
}

function countrySamples() {
  if (state.country === "all") return state.samples;
  return state.samples.filter((sample) => sample.location === state.country);
}

function sampleBounds(samples) {
  const valid = samples.filter((sample) => {
    const point = lngLat(sample);
    return Number.isFinite(point.lng) && Number.isFinite(point.lat);
  });
  if (!valid.length || !window.maplibregl) return null;

  const firstPoint = lngLat(valid[0]);
  const bounds = new maplibregl.LngLatBounds(
    [firstPoint.lng, firstPoint.lat],
    [firstPoint.lng, firstPoint.lat],
  );
  valid.slice(1).forEach((sample) => {
    const point = lngLat(sample);
    bounds.extend([point.lng, point.lat]);
  });
  return bounds;
}

function fitSamples(samples, options = {}) {
  if (!state.map || !samples.length) return;

  if (samples.length === 1) {
    state.map[options.animate ? "flyTo" : "jumpTo"]({
      center: lngLat(samples[0]),
      zoom: 6,
      duration: options.animate ? 900 : 0,
      essential: true,
    });
    return;
  }

  const bounds = sampleBounds(samples);
  if (!bounds) return;

  state.map.fitBounds(bounds, {
    padding: options.padding || { top: 70, right: 70, bottom: 70, left: 70 },
    maxZoom: options.maxZoom || 5.8,
    duration: options.animate ? 900 : 0,
    essential: true,
  });
}

function formatCount(value, counter) {
  const decimals = Number(counter.dataset.decimals || 0);
  const formatted = value.toFixed(decimals);
  return counter.dataset.format === "comma" ? Number(formatted).toLocaleString("en-US") : formatted;
}

function animateCounter(counter) {
  if (counter.dataset.animated === "true") return;
  counter.dataset.animated = "true";

  const target = Number(counter.dataset.count);
  if (!Number.isFinite(target) || prefersReducedMotion) {
    counter.textContent = counter.dataset.format === "comma" ? target.toLocaleString("en-US") : counter.textContent;
    return;
  }

  const duration = 1100;
  const startedAt = performance.now();

  function tick(now) {
    const progress = Math.min((now - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    counter.textContent = formatCount(target * eased, counter);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

function initPageEffects() {
  document.documentElement.classList.add("js-ready");

  const revealTargets = document.querySelectorAll([
    ".hero-shell",
    ".section-inner",
    ".tldr-card",
    ".paper-figure",
    ".method-steps article",
    ".stat-grid div",
    ".demo-metrics div",
    ".map-card",
    ".explorer-card",
    ".result-takeaways li",
    ".result-table-card",
    ".bibtex",
  ].join(","));

  revealTargets.forEach((target) => target.classList.add("reveal-target"));

  if (!("IntersectionObserver" in window) || prefersReducedMotion) {
    revealTargets.forEach((target) => target.classList.add("in-view"));
    document.querySelectorAll("[data-count]").forEach(animateCounter);
    return;
  }

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("in-view");
      entry.target.querySelectorAll("[data-count]").forEach(animateCounter);
      if (entry.target.matches("[data-count]")) animateCounter(entry.target);
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.16 });

  revealTargets.forEach((target) => revealObserver.observe(target));
  document.querySelectorAll("[data-count]").forEach((counter) => revealObserver.observe(counter));

  const navLinks = [...document.querySelectorAll(".nav-links a")];
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((link) => {
        link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`);
      });
    });
  }, { rootMargin: "-34% 0px -52% 0px", threshold: 0.01 });

  document.querySelectorAll("section[id]").forEach((section) => sectionObserver.observe(section));
}

function populateStaticControls(locations) {
  el.countrySelect.innerHTML = [
    `<option value="all">All regions (${state.samples.length})</option>`,
    ...Object.entries(locations).map(([name, count]) => `<option value="${name}">${name} (${count})</option>`),
  ].join("");

  el.inputSelect.innerHTML = INPUT_LAYERS.map(
    (layer) => `<option value="${layer.id}">${layer.label}</option>`,
  ).join("");

  el.overlaySelect.innerHTML = OVERLAY_LAYERS.map(
    (layer) => `<option value="${layer.id}">${layer.label}</option>`,
  ).join("");
  el.overlaySelect.value = state.overlayLayer.id;
}

function populateSampleSelect() {
  const samples = countrySamples();
  el.sampleSelect.innerHTML = samples.map((sample) => {
    const label = `${sample.location} - ${sample.id}`;
    return `<option value="${sample.id}">${label}</option>`;
  }).join("");

  if (!samples.some((sample) => sample.id === state.activeSample?.id)) {
    setActiveSample(samples[0] || state.samples[0]);
  } else if (state.activeSample) {
    el.sampleSelect.value = state.activeSample.id;
  }
}

function updateImages() {
  if (!state.activeSample) return;
  el.baseImage.src = imagePath(state.inputLayer, state.activeSample);
  el.overlayImage.src = imagePath(state.overlayLayer, state.activeSample);
  el.baseLabel.textContent = state.inputLayer.label;
  el.overlayLabel.textContent = state.overlayLayer.label;
}

function updateMeta() {
  const sample = state.activeSample;
  if (!sample) return;
  el.sampleTitle.textContent = `${sample.location} / ${sample.id}`;
  el.sampleCoords.textContent = `Latitude ${formatCoord(sample.lat, "N", "S")} · Longitude ${formatCoord(sample.lon, "E", "W")}`;
  el.sampleSelect.value = sample.id;
}

function updateMarkerStates() {
  state.markers.forEach(({ marker, node, sample }) => {
    const visible = state.country === "all" || sample.location === state.country;
    const markerElement = marker.getElement();
    markerElement.style.display = visible ? "block" : "none";
    markerElement.style.zIndex = state.activeSample?.id === sample.id ? "10" : "1";
    node.classList.toggle("active", state.activeSample?.id === sample.id);
    markerElement.setAttribute("aria-label", `${sample.location} ${sample.id}`);
  });
}

function setActiveSample(sample, options = {}) {
  if (!sample) return;
  state.activeSample = sample;

  if (options.updateCountry) {
    state.country = sample.location;
    el.countrySelect.value = sample.location;
    populateSampleSelect();
  }

  updateMeta();
  updateImages();
  updateMarkerStates();

  if (options.fly && state.map) {
    state.map.flyTo({
      center: lngLat(sample),
      zoom: Math.max(state.map.getZoom(), 6.2),
      duration: 1100,
      essential: true,
    });
  }
}

function initMap() {
  if (!window.maplibregl) {
    el.mapFallback.hidden = false;
    return;
  }

  state.map = new maplibregl.Map({
    container: "zf-map",
    style: basemapStyle(state.mapStyle),
    center: [20, 51],
    zoom: 3.2,
    minZoom: 1.5,
    maxZoom: 12,
    maxBounds: EUROPE_VIEW_BOUNDS,
    attributionControl: false,
  });

  state.map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
  state.map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

  state.map.on("load", renderMarkers);
  state.map.on("error", () => {
    el.mapFallback.hidden = false;
  });
}

function renderMarkers() {
  if (!state.map || state.markers.size > 0) return;

  state.samples.forEach((sample) => {
    const node = document.createElement("button");
    node.type = "button";
    node.className = "map-marker";
    node.title = `${sample.location} ${sample.id} | lon ${sample.lon.toFixed(4)}, lat ${sample.lat.toFixed(4)}`;
    node.addEventListener("click", () => {
      setActiveSample(sample, { fly: true });
    });

    const marker = new maplibregl.Marker({ element: node, anchor: "center" })
      .setLngLat(lngLat(sample))
      .addTo(state.map);

    state.markers.set(sample.id, { marker, node, sample });
  });

  updateMarkerStates();
  fitSamples(state.samples);
}

function bindEvents() {
  el.countrySelect.addEventListener("change", () => {
    state.country = el.countrySelect.value;
    populateSampleSelect();
    updateMarkerStates();
    fitSamples(countrySamples(), { animate: true });
  });

  el.sampleSelect.addEventListener("change", () => {
    const sample = state.samples.find((item) => item.id === el.sampleSelect.value);
    setActiveSample(sample, { fly: true });
  });

  el.inputSelect.addEventListener("change", () => {
    state.inputLayer = INPUT_LAYERS.find((layer) => layer.id === el.inputSelect.value) || INPUT_LAYERS[0];
    updateImages();
  });

  el.overlaySelect.addEventListener("change", () => {
    state.overlayLayer = OVERLAY_LAYERS.find((layer) => layer.id === el.overlaySelect.value) || OVERLAY_LAYERS[0];
    updateImages();
  });

  el.overlaySlider.addEventListener("input", () => {
    el.comparison.style.setProperty("--reveal", `${el.overlaySlider.value}%`);
  });
  el.comparison.style.setProperty("--reveal", `${el.overlaySlider.value}%`);

  document.querySelectorAll(".map-style[data-style]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".map-style[data-style]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      state.mapStyle = button.dataset.style;
      if (state.map) state.map.setStyle(basemapStyle(state.mapStyle));
    });
  });

  el.mapReset.addEventListener("click", () => {
    state.country = "all";
    el.countrySelect.value = "all";
    populateSampleSelect();
    updateMarkerStates();
    fitSamples(state.samples, { animate: true });
  });

  el.copyCitation.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(el.bibtex.textContent.trim());
      el.copyCitation.textContent = "Copied";
      setTimeout(() => {
        el.copyCitation.textContent = "Copy BibTeX";
      }, 1800);
    } catch {
      el.copyCitation.textContent = "Select BibTeX above";
    }
  });
}

async function init() {
  const response = await fetch("data/samples.json");
  const data = await response.json();
  state.samples = data.samples || [];

  populateStaticControls(data.locations || {});
  bindEvents();

  const initial = state.samples.find((sample) => sample.featured) || state.samples[0];
  setActiveSample(initial);
  populateSampleSelect();
  initMap();
}

initPageEffects();
init().catch((error) => {
  console.error(error);
  el.sampleTitle.textContent = "Could not load samples";
  el.sampleCoords.textContent = "Check data/samples.json and sample assets.";
});
