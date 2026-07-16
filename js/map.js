/**
 * MENA presence map (About section)
 * Real map tiles (OpenStreetMap data, Carto light basemap) via Leaflet,
 * with a pin for each city I've shipped products from.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('mena-map');
  if (!container || typeof L === 'undefined') return;

  const CITIES = [
    { name: 'Cairo',       lat: 30.0444, lng: 31.2357, orgs: 'GeoTech · AevaPay · Nagwa · Squadio' },
    { name: 'Riyadh',      lat: 24.7136, lng: 46.6753, orgs: 'GeoTech · Rasan (Tameeni)' },
    { name: 'Dubai',       lat: 25.2048, lng: 55.2708, orgs: 'Rasan (Tameeni)' },
    { name: 'Kuwait City', lat: 29.3759, lng: 47.9774, orgs: 'Mawaqaa · TechOffice · Diyar United' },
  ];

  const map = L.map(container, {
    zoomControl: true,
    scrollWheelZoom: false,       // never trap page scroll
    dragging: !L.Browser.mobile,  // one-finger scroll keeps working on phones
    tap: false,
  });

  // Plain-text prefix (the default embeds an SVG flag that our global img/svg
  // resets blow up to full size)
  map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>');

  const makeTiles = () => {
    const style = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark_all' : 'light_all';
    return L.tileLayer(`https://{s}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}{r}.png`, {
      subdomains: 'abcd',
      maxZoom: 12,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);
  };
  let tiles = makeTiles();
  document.addEventListener('themechange', () => {
    map.removeLayer(tiles);
    tiles = makeTiles();
  });

  const pinIcon = L.divIcon({
    className: 'map-pin-wrap',
    html: '<span class="map-pin"></span>',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -10],
  });

  const bounds = L.latLngBounds([]);
  CITIES.forEach((c) => {
    const marker = L.marker([c.lat, c.lng], { icon: pinIcon, title: c.name }).addTo(map);
    marker.bindTooltip(c.name, {
      permanent: true,
      direction: 'top',
      offset: [0, -10],
      className: 'map-label',
    });
    marker.bindPopup(`<strong>${c.name}</strong><br>${c.orgs}`, { closeButton: false });
    bounds.extend([c.lat, c.lng]);
  });

  map.fitBounds(bounds, { padding: [56, 56] });
});
