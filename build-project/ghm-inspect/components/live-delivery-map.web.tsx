import { Pressable, StyleSheet, Text, View } from "react-native";

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

export function LiveDeliveryMap({ rider, destinationLabel = "Your delivery address", etaLabel = "Live route updates every 10 seconds", progress = 0, onMapPress, height }: LiveDeliveryMapProps) {
  return (
    <Pressable onPress={onMapPress} disabled={!onMapPress} style={({ pressed }) => [styles.shell, height ? { height } : undefined, pressed && onMapPress ? { opacity: 0.92 } : undefined]}>
      <View style={styles.grid} />
      <View style={styles.route}><View style={styles.routeLine} /><View style={styles.riderDot}><Text style={styles.riderIcon}>●</Text></View><View style={styles.destinationDot} /></View>
      <View style={styles.card}><Text style={styles.eyebrow}>LIVE DELIVERY MAP</Text><Text style={styles.title}>{rider ? "Rider GPS is updating" : "Waiting for rider GPS"}</Text><Text style={styles.copy}>{etaLabel}</Text><View style={styles.track}><View style={[styles.fill, { width: `${Math.max(4, Math.min(progress, 100))}%` }]} /></View><Text style={styles.destination}>{destinationLabel}</Text>{onMapPress ? <Text style={styles.tap}>Tap map for turn guidance</Text> : null}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: { height: 268, overflow: "hidden", borderRadius: 22, backgroundColor: "#EAF6EB", justifyContent: "flex-end" },
  grid: { ...StyleSheet.absoluteFillObject, opacity: 0.5, backgroundColor: "#D7EED9" },
  route: { position: "absolute", top: 45, left: 30, right: 30, height: 105, justifyContent: "center" },
  routeLine: { height: 5, borderRadius: 5, backgroundColor: "#2E7D32" },
  riderDot: { position: "absolute", left: "35%", width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: "#14532D", borderWidth: 4, borderColor: "#FFFFFF" },
  riderIcon: { color: "#FACC15", fontSize: 14 },
  destinationDot: { position: "absolute", right: 0, width: 20, height: 20, borderRadius: 10, backgroundColor: "#D32F2F", borderWidth: 3, borderColor: "#FFFFFF" },
  card: { margin: 12, borderRadius: 16, padding: 13, backgroundColor: "#14532D" },
  eyebrow: { color: "#FACC15", fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  title: { color: "#FFFFFF", fontSize: 15, fontWeight: "800", marginTop: 3 },
  copy: { color: "#DCFCE7", fontSize: 12, marginTop: 3 },
  track: { height: 5, marginTop: 9, borderRadius: 10, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.24)" },
  fill: { height: "100%", borderRadius: 10, backgroundColor: "#FACC15" },
  destination: { color: "#D1FAE5", fontSize: 10, marginTop: 7 },
  tap: { color: "#FDE68A", fontSize: 10, marginTop: 6, fontWeight: "800" },
});
