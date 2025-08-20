export const MapLibreMap = ({
  markers,
  onPointerEnterMarker,
  onPointerLeaveMarker,
}: {
  markers: Marker[];
  onPointerEnterMarker: (marker: Marker) => void;
  onPointerLeaveMarker: (marker: Marker) => void;
}) => {
  throw new Error("not implemented");
};

export type Marker = {
  lat: number;
  lng: number;
  color: string;
  data: any;
};
