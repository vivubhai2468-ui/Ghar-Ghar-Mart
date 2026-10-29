import { StyleSheet, Text, View } from 'react-native';

export type ActiveRider = { id: number; name: string; latitude: number; longitude: number; etaMinutes?: number | null };

export function ActiveRidersMap({ riders }: { riders: ActiveRider[] }) {
  return <View style={styles.shell}>
    <View style={styles.grid} />
    <View style={styles.markers}>{riders.slice(0, 6).map((rider, index) => <View key={rider.id} style={[styles.marker, { left: `${16 + ((index * 29) % 68)}%`, top: `${18 + ((index * 21) % 54)}%` }]}><Text style={styles.markerText}>●</Text></View>)}</View>
    <View style={styles.overlay}><Text style={styles.eyebrow}>LIVE FLEET MAP</Text><Text style={styles.copy}>{riders.length} active rider{riders.length === 1 ? '' : 's'} broadcasting location.</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  shell: { height: 272, borderRadius: 22, overflow: 'hidden', backgroundColor: '#E8F5E9', justifyContent: 'flex-end' }, grid: { ...StyleSheet.absoluteFillObject, backgroundColor: '#D9F0DC', opacity: 0.75 }, markers: { ...StyleSheet.absoluteFillObject }, marker: { position: 'absolute', height: 31, width: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#14532D', borderWidth: 3, borderColor: '#FFFFFF' }, markerText: { color: '#FACC15', fontSize: 14 }, overlay: { margin: 12, borderRadius: 15, padding: 12, backgroundColor: '#14532D' }, eyebrow: { color: '#FACC15', fontSize: 10, fontWeight: '900', letterSpacing: 1 }, copy: { color: '#DCFCE7', fontSize: 12, marginTop: 4 },
});
