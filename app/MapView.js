"use client";

import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";

export default function MapView({ users = [] }) {
  const center = users.length
    ? [Number(users[0].lat) || 20, Number(users[0].lon) || 0]
    : [20, 0];

  return (
    <MapContainer
      center={center}
      zoom={users.length ? 3 : 2}
      style={{ height: "100%", width: "100%", background: "#0b1830" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {users.map((u) => (
        <CircleMarker
          key={u.user_id}
          center={[Number(u.lat), Number(u.lon)]}
          radius={8}
          pathOptions={{
            color: "#9fd7ff",
            fillColor: u.online ? "#5dffb0" : "#7aa0c8",
            fillOpacity: 0.85,
            weight: 2,
          }}
        >
          <Popup>
            <strong>{u.display_name || u.username}</strong>
            <br />
            {u.executor || u.device || "Unknown"}
            <br />
            {[u.city, u.country].filter(Boolean).join(", ") || "Unknown location"}
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
