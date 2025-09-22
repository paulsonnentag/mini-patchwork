import { useCallback, useMemo } from "react";
import { Ref } from "../../sdk/context/refs";
import { SelectionAPI } from "../../sdk/selection";
import { MapLibreMap, Marker } from "./lib/maplibre";
import { useReactive } from "../../sdk/reactive/react";
import { contextComputation } from "../../sdk/context/computation";

type GeoPosition = {
  lat: number;
  lng: number;
};

export type LocationDoc = {
  title: string;
  lat: number;
  lng: number;
};

export const MapView = () => {
  const { isSelected, setSelection } = useReactive(SelectionAPI);
  const refsWithLatLng = useReactive(RefsWithLatLng);

  const markers = useMemo<Marker[]>(
    () =>
      refsWithLatLng.map((ref) => ({
        lat: ref.value.lat,
        lng: ref.value.lng,
        color: isSelected(ref)
          ? "oklch(0.637 0.5 25.331)" // More saturated and lighter
          : "oklch(0.704 0.1 22.216)", // Less saturated and darker
        data: { ref },
      })),
    [refsWithLatLng, isSelected]
  );

  return (
    <div className="w-full h-full">
      <MapLibreMap
        markers={markers}
        onHoverMarker={(marker) => {
          if (marker) {
            setSelection([marker.data.ref]);
          } else {
            setSelection([]);
          }
        }}
      />
    </div>
  );
};

const RefsWithLatLng = () =>
  contextComputation((context) =>
    context.refs.filter((ref): ref is Ref<GeoPosition> => {
      const value = ref.value as any;
      return (
        value && typeof value === "object" && "lat" in value && "lng" in value
      );
    })
  );
