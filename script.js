const regions = [
  { id: 'cnyv', name: 'Chao Phraya Basin, Southeast Asia', description: 'Highly meandering, sediment-heavy river in a tropical agricultural region.', coords: [100.5, 14.5] },
  { id: 'crgs', name: 'Jamuna River, Bangladesh', description: 'Bangabandhu Bridge crossing the highly braided Brahmaputra River.', coords: [89.78, 24.38] },
  { id: 'cyrz', name: 'Ganges River, Patna, India', description: 'Mahatma Gandhi Setu bridge crossing the wide, sandy Ganges.', coords: [85.1, 25.62] },
  { id: 'hueg', name: 'South Florida, USA', description: 'Master-planned canal community near the Everglades wetlands.', coords: [-80.4, 26.0] },
  { id: 'iusn', name: 'Brisbane Airport, Australia', description: 'Brisbane Airport alongside the winding Brisbane River.', coords: [153.1, -27.38] },
  { id: 'omqk', name: 'Yangon River, Myanmar', description: 'Confluence of the Yangon and Bago rivers near Thilawa port.', coords: [96.25, 16.75] },
  { id: 'qszb', name: 'Ayutthaya, Thailand', description: 'Historic island city at the confluence of three major rivers.', coords: [100.56, 14.35] },
  { id: 'qxrg', name: 'Trois-Rivieres, Quebec, Canada', description: 'Pont Laviolette crossing the St. Lawrence River with ribbon farms.', coords: [-72.55, 46.35] },
  { id: 'ynon', name: 'Mississippi River, Louisiana, USA', description: 'French colonial ribbon farm settlements along the Mississippi.', coords: [-90.2, 29.95] },
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
    new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat(region.coords).addTo(map);
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
const regionList = document.getElementById('region-list');
const infoPanelHeader = document.getElementById('info-panel-header');
regions.forEach((region) => {
  const li = document.createElement('li');
  li.textContent = region.name;
  li.addEventListener('click', () => {
    regionList.classList.add('hidden');
    map.flyTo({ center: region.coords, zoom: 7, duration: 1800, essential: true });
    setTimeout(() => openModal(region), 900);
  });
  regionList.appendChild(li);
});
infoPanelHeader.addEventListener('click', () => {
  regionList.classList.toggle('hidden');
});
document.addEventListener('click', (e) => {
  if (!document.getElementById('info-panel').contains(e.target)) {
    regionList.classList.add('hidden');
  }
});
