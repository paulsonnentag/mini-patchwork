import { useMemo } from "react";
import { useSelection } from "../../lib/selection";
import { MapLibreMap, Marker } from "./lib/maplibre";
import { useDerivedSharedContext } from "../../lib/core/sharedContext";
import { ObjRef } from "../../lib/core/objRefs";

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
      .filter((objRef): objRef is ObjRef<GeoPosition, unknown> => {
        const value = objRef.value;
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
        color: isSelected(objRef) ? "red" : "light-red",
        data: { objRef },
      })),
    [objRefsWithLatLng, isSelected]
  );

  return (
    <div className="w-full h-full">
      <MapLibreMap
        markers={markers}
        onPointerEnterMarker={(marker) => setSelection([marker.data.objRef])}
        onPointerLeaveMarker={() => setSelection([])}
      />
    </div>
  );
};
