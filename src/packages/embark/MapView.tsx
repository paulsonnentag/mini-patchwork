import { useMemo } from "react";
import { useSelection } from "../../sdk/context/selection";
import { MapLibreMap, Marker } from "./lib/maplibre";
import { useDerivedSharedContext } from "../../sdk/context/core/sharedContext";
import { ObjRef } from "../../sdk/context/core/objRefs";

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
  const { isSelected, setSelection } = useSelection();
  const objRefsWithLatLng = useDerivedSharedContext((context) => {
    return context
      .getAllObjRefs()
      .filter((objRef): objRef is ObjRef<GeoPosition> => {
        const value = objRef.value as any;
        return (
          value && typeof value === "object" && "lat" in value && "lng" in value
        );
      });
  });

  const markers = useMemo<Marker[]>(
    () =>
      objRefsWithLatLng.map((objRef) => ({
        lat: objRef.value.lat,
        lng: objRef.value.lng,
        color: isSelected(objRef)
          ? "oklch(0.637 0.237 25.331)"
          : "oklch(0.704 0.191 22.216)",
        data: { objRef },
      })),
    [objRefsWithLatLng, isSelected]
  );

  return (
    <div className="w-full h-full">
      <MapLibreMap
        markers={markers}
        onHoverMarker={(marker) => {
          if (marker) {
            setSelection([marker.data.objRef]);
          } else {
            setSelection([]);
          }
        }}
      />
    </div>
  );
};
