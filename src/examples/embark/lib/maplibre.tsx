import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { useStaticCallback } from "../../../shared/useStaticCalback";

export const MapLibreMap = ({
  markers,
  onHoverMarker,
}: {
  markers: Marker[];
  onHoverMarker: (marker: Marker | null) => void;
}) => {
  const [hoveredMarker, setHoveredMarker] = useState<Marker | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);

  const handleOnHoverMarker = useStaticCallback((marker: Marker | null) => {
    if (hoveredMarker !== marker) {
      setHoveredMarker(marker);
      onHoverMarker(marker);
    }
  });

  // initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialCenter: [number, number] =
      markers && markers.length > 0 ? [markers[0].lng, markers[0].lat] : [0, 0];

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: initialCenter,
      zoom: markers && markers.length > 0 ? 4 : 1,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }));

    mapRef.current = map;

    return () => {
      // cleanup markers then map
      markerRefs.current.forEach((m) => m.remove());
      markerRefs.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // update markers when props change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // remove previous markers
    markerRefs.current.forEach((m) => m.remove());
    markerRefs.current = [];

    // add new markers using the default MapLibre marker element
    markers.forEach((marker) => {
      const m = new maplibregl.Marker({
        color: marker.color,
      })
        .setLngLat([marker.lng, marker.lat])
        .addTo(map);

      const el = m.getElement();
      el.style.cursor = "pointer";
      el.addEventListener("pointerenter", (event) => {
        event.stopPropagation();
        event.preventDefault();
        handleOnHoverMarker(marker);
      });

      markerRefs.current.push(m);
    });
  }, [markers, handleOnHoverMarker]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%" }}
      onPointerEnter={() => {
        handleOnHoverMarker(null);
      }}
    />
  );
};

export type Marker = {
  lat: number;
  lng: number;
  color: string;
  data: any;
};
