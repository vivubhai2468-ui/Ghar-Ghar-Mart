import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

export type DestinationCoordinate = { latitude: number; longitude: number };

function regionFor(coordinate: DestinationCoordinate): Region {
  return { latitude: coordinate.latitude, longitude: coordinate.longitude, latitudeDelta: 0.018, longitudeDelta: 0.018 };
}

export function DestinationMapPicker({ coordinate, onSelect }: { coordinate: DestinationCoordinate; onSelect: (coordinate: DestinationCoordinate) => void }) {
  const mapRef = useRef<MapView>(null);
  useEffect(() => { mapRef.current?.animateToRegion(regionFor(coordinate), 320); }, [coordinate]);
  return <View style={styles.shell}>
    <MapView ref={mapRef} style={styles.map} initialRegion={regionFor(coordinate)} onPress={(event) => onSelect(event.nativeEvent.coordinate)}>
      <Marker coordinate={coordinate} title="Delivery destination" description="Drag or tap the map to adjust" draggable onDragEnd={(event) => onSelect(event.nativeEvent.coordinate)} pinColor="#2E7D32" />
    </MapView>
    <View style={styles.tip}><Text style={styles.tipText}>Tap the map or drag the pin to set your exact delivery point.</Text></View>
  </View>;
}

const styles = StyleSheet.create({
  shell: { height: 310, overflow: 'hidden', borderRadius: 22, backgroundColor: '#E8F5E9' }, map: { ...StyleSheet.absoluteFillObject },
  tip: { position: 'absolute', left: 12, right: 12, bottom: 12, borderRadius: 14, padding: 11, backgroundColor: 'rgba(20,83,45,0.94)' }, tipText: { color: '#DCFCE7', fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
