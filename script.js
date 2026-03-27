const regions = [
  { id: 'cnyv', name: 'Yangtze River Delta, China', description: 'Densely populated floodplain prone to seasonal monsoon flooding.', coords: [120.5, 31.2] },
  { id: 'crgs', name: 'Ganges-Brahmaputra Delta, Bangladesh', description: 'One of the most flood-vulnerable deltas on Earth.', coords: [89.5, 23.0] },
  { id: 'cyrz', name: 'Rhine-Meuse Delta, Netherlands', description: 'Low-lying region protected by extensive flood defense systems.', coords: [4.5, 51.9] },
  { id: 'hueg', name: 'Mekong Delta, Vietnam', description: 'Agricultural heartland facing rising sea levels and seasonal floods.', coords: [106.0, 10.0] },
  { id: 'iusn', name: 'Mississippi River Basin, USA', description: 'Historic flood zone spanning the central United States.', coords: [-91.1, 32.3] },
  { id: 'omqk', name: 'Indus River Valley, Pakistan', description: 'Region devastated by catastrophic flooding in recent years.', coords: [68.5, 27.5] },
  { id: 'qszb', name: 'Niger River Inland Delta, Mali', description: 'Seasonal floodplain critical for agriculture in the Sahel.', coords: [-4.2, 14.5] },
  { id: 'qxrg', name: 'Amazon Basin, Brazil', description: 'Largest river basin with massive annual flood cycles.', coords: [-60.0, -3.1] },
  { id: 'ynon', name: 'Nile Delta, Egypt', description: 'Historically flood-dependent region now facing coastal erosion.', coords: [31.0, 31.2] },
];
const map = new maplibregl.Map({
  container: 'map',
  style: { version: 8, sources: { 'carto-dark': { type: 'raster', tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png','https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png','https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'], tileSize: 256, attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>' } }, layers: [{ id: 'carto-dark-layer', type: 'raster', source: 'carto-dark', minzoom: 0, maxzoom: 19 }] },
  center: [30, 20], zoom: 2, minZoom: 1.5, maxZoom: 12, attributionControl: false,
});
map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
map.on('load', () => {
  regions.forEach((region) => {
    const el = document.createElement('div');
    el.className = 'marker';
    const label = document.createElement('span');
    label.className = 'marker-label';
    label.textContent = region.name.split(',')[0];
    el.appendChild(label);
    el.addEventListener('click', () => {
      map.flyTo({ center: region.coords, zoom: 7, duration: 1800, essential: true });
      setTimeout(() => openModal(region), 900);
    });
    new maplibregl.Marker({ element: el }).setLngLat(region.coords).addTo(map);
  });
});
const backdrop = document.getElementById('modal-backdrop');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-description');
const modalBefore = document.getElementById('modal-before');
const modalAfter = document.getElementById('modal-after');
const modalSlider = document.getElementById('modal-slider');
const modalContainer = document.getElementById('modal-slider-container');
function openModal(region) {
  modalTitle.textContent = region.name;
  modalDesc.textContent = region.description;
  modalBefore.src = 'Demo/' + region.id + '.png';
  modalAfter.src = 'Demo/' + region.id + '_mask.png';
  modalSlider.value = 50;
  modalContainer.style.setProperty('--clip-right', '50%');
  backdrop.classList.remove('hidden');
}
function closeModal() {
  backdrop.classList.add('hidden');
  map.flyTo({ center: [30, 20], zoom: 2, duration: 1200 });
}
document.getElementById('modal-close').addEventListener('click', closeModal);
backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
modalSlider.addEventListener('input', (e) => {
  modalContainer.style.setProperty('--clip-right', (100 - e.target.value) + '%');
});
