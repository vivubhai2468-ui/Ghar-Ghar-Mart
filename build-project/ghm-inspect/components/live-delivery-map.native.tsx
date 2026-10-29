import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

export type DeliveryCoordinate = { latitude: number; longitude: number };

type LiveDeliveryMapProps = {
  rider?: DeliveryCoordinate | null;
  pickup?: DeliveryCoordinate | null;
  destination?: DeliveryCoordinate | null;
  routeCoordinates?: DeliveryCoordinate[];
  destinationLabel?: string;
  etaLabel?: string;
  progress?: number;
  onMapPress?: () => void;
  height?: number;
};

type PlottedPoint = DeliveryCoordinate & { x: number; y: number };

type MarkerPoint = PlottedPoint & { key: string; label: string; color: string };

function validPoint(point: DeliveryCoordinate | null | undefined): point is DeliveryCoordinate {
  return Boolean(point && Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
}

function plotPoints(points: DeliveryCoordinate[]): PlottedPoint[] {
  if (!points.length) return [];
  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latSpan = Math.max(maxLat - minLat, 0.001);
  const lngSpan = Math.max(maxLng - minLng, 0.001);

  return points.map((point) => ({
    ...point,
    x: 12 + ((point.longitude - minLng) / lngSpan) * 76,
    y: 14 + ((maxLat - point.latitude) / latSpan) * 56,
  }));
}

function segmentStyle(from: PlottedPoint, to: PlottedPoint) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
  return {
    left: `${from.x}%` as `${number}%`,
    top: `${from.y}%` as `${number}%`,
    width: `${Math.max(length, 1)}%` as `${number}%`,
    transform: [{ rotate: `${angle}deg` }],
  };
}

export function LiveDeliveryMap({
  rider,
  pickup,
  destination,
  routeCoordinates,
  destinationLabel = "Your delivery address",
  etaLabel = "Live route updates every 10 seconds",
  progress = 0,
  onMapPress,
  height,
}: LiveDeliveryMapProps) {
  const routePoints = useMemo(() => {
    const supplied = (routeCoordinates ?? []).filter(validPoint);
    if (supplied.length > 1) return supplied;
    return [pickup, rider, destination].filter(validPoint);
  }, [pickup, rider, destination, routeCoordinates]);
  const plotted = useMemo(() => plotPoints(routePoints), [routePoints]);
  const markerPoints = useMemo<MarkerPoint[]>(() => {
    const entries: Array<{ key: string; label: string; point: DeliveryCoordinate; color: string }> = [];
    if (pickup && validPoint(pickup)) entries.push({ key: "pickup", label: "Store", point: pickup, color: "#F59E0B" });
    if (rider && validPoint(rider)) entries.push({ key: "rider", label: "Rider", point: rider, color: "#2E7D32" });
    if (destination && validPoint(destination)) entries.push({ key: "destination", label: destinationLabel, point: destination, color: "#D32F2F" });
    return entries.map((entry, index) => ({ ...plotPoints(entries.map((item) => item.point))[index], ...entry }));
  }, [destination, destinationLabel, pickup, rider]);
  const safeProgress = Math.max(4, Math.min(Number(progress) || 0, 100));

  return (
    <View style={[styles.shell, height ? { height } : undefined]}>
      <View style={styles.mapSurface}>
        <View style={styles.gridHorizontalOne} />
        <View style={styles.gridHorizontalTwo} />
        <View style={styles.gridVerticalOne} />
        <View style={styles.gridVerticalTwo} />
        {plotted.slice(0, -1).map((point, index) => <View key={`segment-${index}`} style={[styles.routeSegment, segmentStyle(point, plotted[index + 1])]} />)}
        {markerPoints.map((marker) => <View key={marker.key} style={[styles.markerWrap, { left: `${marker.x}%`, top: `${marker.y}%` }]}><View style={[styles.marker, { backgroundColor: marker.color }]} /><Text style={styles.markerLabel}>{marker.label}</Text></View>)}
        {!plotted.length ? <View style={styles.emptyMap}><Text style={styles.emptyMapTitle}>Delivery map</Text><Text style={styles.emptyMapText}>Route details will appear when location coordinates are available.</Text></View> : null}
        {onMapPress ? <Text onPress={onMapPress} style={styles.tapHint}>Tap for turn guidance</Text> : null}
      </View>
      <View style={styles.overlay}>
        <View style={styles.overlayTop}><Text style={styles.liveDot}>●</Text><Text style={styles.liveText}>{rider ? "LIVE RIDER LOCATION" : "DELIVERY MAP"}</Text></View>
        <Text style={styles.eta}>{etaLabel}</Text>
        <View style={styles.track}><View style={[styles.fill, { width: `${safeProgress}%` }]} /></View>
        {!destination ? <Text style={styles.hint}>Add exact address coordinates to display the final destination pin.</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { height: 268, borderRadius: 22, overflow: "hidden", backgroundColor: "#E8F5E9" },
  mapSurface: { ...StyleSheet.absoluteFillObject, backgroundColor: "#DCEEDB" },
  gridHorizontalOne: { position: "absolute", left: 0, right: 0, top: "32%", borderTopWidth: 1, borderTopColor: "rgba(46,125,50,0.12)" },
  gridHorizontalTwo: { position: "absolute", left: 0, right: 0, top: "68%", borderTopWidth: 1, borderTopColor: "rgba(46,125,50,0.12)" },
  gridVerticalOne: { position: "absolute", top: 0, bottom: 0, left: "32%", borderLeftWidth: 1, borderLeftColor: "rgba(46,125,50,0.12)" },
  gridVerticalTwo: { position: "absolute", top: 0, bottom: 0, left: "68%", borderLeftWidth: 1, borderLeftColor: "rgba(46,125,50,0.12)" },
  routeSegment: { position: "absolute", height: 4, borderRadius: 4, backgroundColor: "#2E7D32" },
  markerWrap: { position: "absolute", alignItems: "center", transform: [{ translateX: -12 }, { translateY: -12 }] },
  marker: { width: 22, height: 22, borderRadius: 11, borderWidth: 3, borderColor: "#FFFFFF" },
  markerLabel: { marginTop: 2, paddingHorizontal: 4, borderRadius: 5, backgroundColor: "rgba(255,255,255,0.9)", color: "#173C25", fontSize: 9, fontWeight: "800" },
  emptyMap: { position: "absolute", alignSelf: "center", top: "27%", width: "70%", borderRadius: 16, padding: 14, backgroundColor: "rgba(255,255,255,0.86)", alignItems: "center" },
  emptyMapTitle: { color: "#173C25", fontSize: 14, fontWeight: "900" },
  emptyMapText: { marginTop: 4, color: "#6D7D71", fontSize: 11, lineHeight: 15, textAlign: "center" },
  tapHint: { position: "absolute", right: 12, top: 12, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, backgroundColor: "rgba(20,83,45,0.9)", color: "#FDE68A", fontSize: 10, fontWeight: "800" },
  overlay: { position: "absolute", left: 12, right: 12, bottom: 12, borderRadius: 16, padding: 12, backgroundColor: "rgba(20, 83, 45, 0.94)" },
  overlayTop: { flexDirection: "row", alignItems: "center", gap: 6 },
  liveDot: { color: "#FACC15", fontSize: 12 },
  liveText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  eta: { color: "#DCFCE7", fontSize: 12, marginTop: 4 },
  track: { height: 5, backgroundColor: "rgba(255,255,255,0.24)", borderRadius: 10, overflow: "hidden", marginTop: 9 },
  fill: { height: "100%", backgroundColor: "#FACC15", borderRadius: 10 },
  hint: { color: "#D1FAE5", fontSize: 10, marginTop: 7, lineHeight: 14 },
});
