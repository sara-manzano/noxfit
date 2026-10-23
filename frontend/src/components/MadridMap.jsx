import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './MadridMap.css';

const madridRegionBounds = [
  [39.88, -4.58],
  [41.17, -3.05],
];

export const gyms = [
  {
    name: 'Noxfit Salamanca',
    address: 'Calle de Serrano, 41, 28001 Madrid',
    position: [40.4258, -3.6839],
  },
  {
    name: 'Noxfit Alcobendas',
    address: 'Avenida de Bruselas, 15, 28108 Alcobendas, Madrid',
    position: [40.5405, -3.6381],
  },
];

const markerIcon = L.divIcon({
  className: 'gym-marker',
  html: '<span></span>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const escapeHtml = (value) => value.replace(/[&<>"']/g, (char) => (
  { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]
));

export const MadridMap = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const map = L.map(containerRef.current, {
      maxBounds: L.latLngBounds(madridRegionBounds).pad(0.3),
      minZoom: 8,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    L.rectangle(madridRegionBounds, {
      className: 'madrid-bounds',
      color: '#ff2fd0',
      weight: 2,
      dashArray: '6 6',
      fill: false,
      interactive: false,
    }).addTo(map);

    gyms.forEach((gym) => {
      L.marker(gym.position, { icon: markerIcon, title: gym.name })
        .addTo(map)
        .bindPopup(`<strong>${escapeHtml(gym.name)}</strong><br>${escapeHtml(gym.address)}`);
    });

    map.fitBounds(madridRegionBounds);

    return () => map.remove();
  }, []);

  return <div ref={containerRef} className="madrid-map" role="region" aria-label="Mapa de la Comunidad de Madrid" />;
};
