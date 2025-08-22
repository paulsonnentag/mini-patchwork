import "maplibre-gl/dist/maplibre-gl.css";
import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

export const MapLibreMap = ({
  markers,
  onPointerEnterMarker,
  onPointerLeaveMarker,
}: {
  markers: Marker[];
  onPointerEnterMarker: (marker: Marker) => void;
  onPointerLeaveMarker: (marker?: Marker) => void;
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRefs = useRef<maplibregl.Marker[]>([]);

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

    // add new markers
    markers.forEach((marker) => {
      const el = document.createElement("div");
      const size = 14;
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = "50%";
      el.style.backgroundColor = marker.color || "#d33";
      el.style.border = "2px solid #fff";
      el.style.boxShadow = "0 0 0 1px rgba(0,0,0,0.2)";
      el.style.cursor = "pointer";

      el.addEventListener("pointerenter", () => onPointerEnterMarker(marker));
      el.addEventListener("pointerleave", () => onPointerLeaveMarker(marker));

      const m = new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat([marker.lng, marker.lat])
        .addTo(map);
      markerRefs.current.push(m);
    });

    // adjust view to fit markers
    if (markers.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      markers.forEach((m) => bounds.extend([m.lng, m.lat]));
      try {
        map.fitBounds(bounds, { padding: 40, duration: 0 });
      } catch {
        // ignore if bounds are invalid
      }
    } else if (markers.length === 1) {
      // map.easeTo({
      //   center: [markers[0].lng, markers[0].lat],
      //   zoom: 10,
      //   duration: 300,
      // });
    }
  }, [markers, onPointerEnterMarker, onPointerLeaveMarker]);

  return <div ref={containerRef} style={{ width: "500px", height: "500px" }} />;
};

export type Marker = {
  lat: number;
  lng: number;
  color: string;
  data: any;
};
