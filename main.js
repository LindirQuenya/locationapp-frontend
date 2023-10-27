import OSM from 'ol/source/OSM';
import TileLayer from 'ol/layer/Tile';
import {Map, View} from 'ol';
import {fromLonLat} from 'ol/proj';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import {circular} from 'ol/geom/Polygon';
import Control from 'ol/control/Control';

async function getLocation(id) {
  const query = new URLSearchParams({id: id}).toString();
  const response = await fetch("https://eldamar.duckdns.org/api/location/get?" + query);
  if (!response.ok) {
    return null;
  }
  return response.json();
}

async function listNames() {
  const response = await fetch("https://eldamar.duckdns.org/api/location/list");
  if (!response.ok) {
    return null;
  }
  return response.json();
}

async function authenticate() {
  const response = await fetch("https://eldamar.duckdns.org/api/auth/url");
  if (!response.ok) {
    return;
  }
  const url = (await response.json()).url;
  window.location.replace(url);
}

function getNameSelect(ids_names) {
  let builder = ['<select name="name" id="nameselect" class="select-internal">'];
  for (const pair of ids_names) {
    builder.push('<option value="');
    builder.push(pair[0].toString());
    builder.push('">');
    builder.push(pair[1]);
    builder.push('</option>');
  }
  builder.push('</select>');
  return builder.join('');
}

async function main() {
let ids_names = await listNames();
if (ids_names === null) {
  await authenticate();
}

const map = new Map({
  target: 'map-container',
  layers: [
    new TileLayer({
      source: new OSM(),
    }),
  ],
  view: new View({
    center: fromLonLat([0, 0]),
    zoom: 2,
  }),
});
const source = new VectorSource();
const layer = new VectorLayer({
  source: source,
});
map.addLayer(layer);

// lat and lon are in degrees, acc is in meters.
function updateLocation(lat, lon, acc) {
  const coords = [lon, lat];
  const accuracy = circular(coords, acc);
  source.clear(true);
  source.addFeatures([
    new Feature(
      accuracy.transform('EPSG:4326', map.getView().getProjection())
    ),
    new Feature(new Point(fromLonLat(coords)))
  ]);
}

function randomLocation() {
  const lat = Math.random()*180 - 90;
  const lon = Math.random()*360 - 180;
  const acc = Math.random()*50;
  updateLocation(lat, lon, acc);
}

const select = document.createElement('div');
select.className = 'ol-control ol-selectable select';
select.innerHTML = getNameSelect(ids_names);

map.addControl(
  new Control({
    element: select
  })
);

async function onUpdateButton() {
  const sel = document.getElementById("nameselect");
  const location = await getLocation(parseInt(sel.options[sel.selectedIndex].value));
  updateLocation(location.latitude, location.longitude, location.accuracy);
}

const update = document.createElement('div');
update.className = 'ol-control ol-unselectable update';
update.innerHTML = '<button title="Update Location">↻</button>';
update.addEventListener('click', onUpdateButton);

map.addControl(
  new Control({
    element: update
  })
);

function zoomIn() {
  if (!source.isEmpty()) {
    map.getView().fit(source.getExtent(), {
      maxZoom: 18,
      duration: 500,
    });
  }
}
const locate = document.createElement('div');
locate.className = 'ol-control ol-unselectable locate';
locate.innerHTML = '<button title="Locate me">◎</button>';
locate.addEventListener('click', zoomIn);

map.addControl(
  new Control({
    element: locate,
  })
);

// Fetch an initial location.
await onUpdateButton();
zoomIn();
}

main();
