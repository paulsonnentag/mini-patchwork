import { useCallback, useMemo, useState } from "react";
import { ToolProps } from "../../lib/patchwork";
import { useObjects, useSelection, useSharedContext } from "../../lib/core";
import { MapLibreMap, Marker } from "./lib/maplibre";

type GeoPosition = {
  lat: number;
  lng: number;
};

type LocationDoc = {
  title: string;
  lat: number;
  lng: number;
};

const MapTool = ({ docUrl }: ToolProps) => {
  const { isSelected, setSelection } = useSelection();
  const objRefsWithLatLng = useObjects<GeoPosition>((objRef) => {
    const value = objRef.value;
    return value &&
      typeof value === "object" &&
      "lat" in value &&
      "lng" in value
      ? true
      : false;
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
    <MapLibreMap
      markers={markers}
      onPointerEnterMarker={(marker) => setSelection([marker.data.pointer])}
      onPointerLeaveMarker={() => setSelection([])}
    />
  );
};
