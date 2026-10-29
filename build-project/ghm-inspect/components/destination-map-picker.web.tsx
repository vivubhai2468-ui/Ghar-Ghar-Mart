import { StyleSheet, Text, View } from 'react-native';

export type DestinationCoordinate = { latitude: number; longitude: number };

export function DestinationMapPicker({ coordinate }: { coordinate: DestinationCoordinate; onSelect: (coordinate: DestinationCoordinate) => void }) {
  return <View style={styles.shell}><View style={styles.pin}><Text style={styles.pinText}>⌖</Text></View><Text style={styles.title}>Map pin ready for mobile</Text><Text style={styles.copy}>Open checkout on iOS or Android to drag the native map pin. Current selection: {coordinate.latitude.toFixed(5)}, {coordinate.longitude.toFixed(5)}.</Text></View>;
}

const styles = StyleSheet.create({ shell: { height: 260, borderRadius: 22, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', padding: 24 }, pin: { height: 58, width: 58, borderRadius: 30, backgroundColor: '#14532D', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#FACC15' }, pinText: { color: '#FFFFFF', fontSize: 26 }, title: { marginTop: 16, color: '#173C25', fontSize: 16, fontWeight: '900' }, copy: { marginTop: 7, color: '#52715A', fontSize: 12, lineHeight: 18, textAlign: 'center' } });
