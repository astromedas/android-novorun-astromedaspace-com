import React from 'react';
import {StyleSheet, View} from 'react-native';
import MapView, {Polyline, PROVIDER_GOOGLE} from 'react-native-maps';

interface ActivityMapProps {
  coordinates: {latitude: number; longitude: number}[];
  height?: number;
}

const ActivityMap = ({coordinates, height = 200}: ActivityMapProps) => {
  if (!coordinates || coordinates.length === 0) {
    return null;
  }

  // Calculate the bounding box for all coordinates
  const latitudes = coordinates.map(coord => coord.latitude);
  const longitudes = coordinates.map(coord => coord.longitude);

  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  // Calculate center point
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;

  const latDelta = (maxLat - minLat) * 1.5 || 0.01;
  const lngDelta = (maxLng - minLng) * 1.5 || 0.01;

  return (
    <View style={[styles.container, {height}]}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={{
          latitude: centerLat,
          longitude: centerLng,
          latitudeDelta: latDelta,
          longitudeDelta: lngDelta,
        }}
        mapPadding={{top: 20, right: 20, bottom: 20, left: 20}}>
        <Polyline
          coordinates={coordinates}
          strokeWidth={6}
          strokeColor="#002366"
          lineCap="round"
          lineJoin="round"
        />
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 10,
    overflow: 'hidden',
    marginVertical: 10,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default ActivityMap;
