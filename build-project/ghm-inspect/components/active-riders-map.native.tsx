import { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

export type ActiveRider = { id: number; name: string; latitude: number; longitude: number; etaMinutes?: number | null };

function regionFor(riders: ActiveRider[]): Region {
  if (!riders.length) return { latitude: 19.076, longitude: 72.8777, latitudeDelta: 0.09, longitudeDelta: 0.09 };
  const latitudes = riders.map((rider) => rider.latitude);
  const longitudes = riders.map((rider) => rider.longitude);
  return {
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    latitudeDelta: Math.max((Math.max(...latitudes) - Math.min(...latitudes)) * 2.5, 0.03),
    longitudeDelta: Math.max((Math.max(...longitudes) - Math.min(...longitudes)) * 2.5, 0.03),
  };
}

export function ActiveRidersMap({ riders }: { riders: ActiveRider[] }) {
  const mapRef = useRef<MapView>(null);
  const region = useMemo(() => regionFor(riders), [riders]);
  useEffect(() => { mapRef.current?.animateToRegion(region, 450); }, [region]);
  return <View style={styles.shell}>
    <MapView ref={mapRef} style={styles.map} initialRegion={region}>
      {riders.map((rider) => <Marker key={rider.id} coordinate={{ latitude: rider.latitude, longitude: rider.longitude }} title={rider.name} description={rider.etaMinutes ? `ETA ${rider.etaMinutes} min` : 'Live GPS signal'} pinColor="#2E7D32" />)}
    </MapView>
    <View style={styles.overlay}><Text style={styles.eyebrow}>LIVE FLEET MAP</Text><Text style={styles.copy}>{riders.length} active rider{riders.length === 1 ? '' : 's'} broadcasting location.</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  shell: { height: 272, borderRadius: 22, overflow: 'hidden', backgroundColor: '#E8F5E9' }, map: { ...StyleSheet.absoluteFillObject },
  overlay: { position: 'absolute', left: 12, right: 12, bottom: 12, borderRadius: 15, padding: 12, backgroundColor: 'rgba(20,83,45,0.94)' },
  eyebrow: { color: '#FACC15', fontSize: 10, fontWeight: '900', letterSpacing: 1 }, copy: { color: '#DCFCE7', fontSize: 12, marginTop: 4 },
});
