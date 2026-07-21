import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline, AnimatedRegion } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';
import { getSocket } from '../../api/socket';
import { fetchDirections } from '../../api/locationiq';
import { useAuth } from '../../context/AuthContext';
import colors from '../../theme/colors';
import ActiveDriverPanel from '../../components/ActiveDriverPanel';
import PaymentMethodSheet from '../../components/PaymentMethodSheet';

export default function TrackRideScreen({ route, navigation }) {
  const { rideId } = route.params;
  const { user } = useAuth();
  const [ride, setRide] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Routing states
  const [routePolyline, setRoutePolyline] = useState([]);
  const [eta, setEta] = useState('');
  const [distance, setDistance] = useState('');
  const [routingLoading, setRoutingLoading] = useState(false);
  const [lastCalculatedStatus, setLastCalculatedStatus] = useState(null);

  const lastRouteFetchTimeRef = useRef(0);
  const mapRef = useRef(null);

  // Animated Region for smooth driver marker gliding
  const driverPosHasBeenSet = useRef(false);
  const [driverPosition] = useState(
    new AnimatedRegion({
      latitude: 0,
      longitude: 0,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    })
  );

  const fetchRide = async () => {
    try {
      const { data } = await api.get(`/rides/${rideId}`);
      setRide(data);
      if (data.driver && data.driver.currentLocation && data.driver.currentLocation.coordinates) {
        const coords = {
          latitude: data.driver.currentLocation.coordinates[1],
          longitude: data.driver.currentLocation.coordinates[0],
        };
        setDriverPos(coords);
        if (!driverPosHasBeenSet.current) {
          driverPosition.setValue({
            ...coords,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          });
          driverPosHasBeenSet.current = true;
        }
      }
      if (data.status === 'completed' && data.paymentStatus === 'paid') {
        navigation.replace('Rating', { rideId });
      }
    } catch (err) {
      console.error('Error fetching ride:', err);
    }
  };

  useEffect(() => {
    fetchRide();
    const socket = getSocket();
    socket.emit('join:ride', rideId);

    socket.on('driver:track', ({ coordinates }) => {
      const newCoords = { latitude: coordinates[1], longitude: coordinates[0] };
      
      if (!driverPosHasBeenSet.current) {
        // First ping: snap to coordinates
        driverPosition.setValue({
          ...newCoords,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
        driverPosHasBeenSet.current = true;
      } else {
        // Subsequent pings: timing glide
        driverPosition.timing({
          ...newCoords,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      }
      
      setDriverPos(newCoords);
    });

    socket.on('ride:status', () => fetchRide());

    socket.on('ride:cancelled', () => {
      Alert.alert('Ride cancelled', 'The ride was cancelled by the driver.');
      navigation.replace('RequestRide');
    });

    const onMessage = (msg) => {
      if (msg.from !== 'rider') {
        setUnreadCount((c) => c + 1);
      }
    };
    socket.on('ride:message', onMessage);

    return () => {
      socket.off('driver:track');
      socket.off('ride:status');
      socket.off('ride:cancelled');
      socket.off('ride:message', onMessage);
    };
  }, []);

  // Update header chat button dynamically
  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          style={styles.chatHeaderBtn}
          onPress={() => {
            setUnreadCount(0);
            navigation.navigate('Chat', {
              rideId,
              otherName: ride?.driver?.user?.name || 'Driver',
            });
          }}
        >
          <Text style={styles.chatBtnText}>💬 Chat</Text>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      ),
      headerStyle: {
        backgroundColor: colors.background,
      },
      headerTintColor: colors.textPrimary,
    });
  }, [ride, unreadCount]);

  // Update routing whenever driver position or ride status changes (throttled to 20 seconds)
  useEffect(() => {
    if (!ride || !driverPos) return;

    const now = Date.now();
    const secondsSinceLastFetch = (now - lastRouteFetchTimeRef.current) / 1000;
    const statusChanged = ride.status !== lastCalculatedStatus;

    if (statusChanged || secondsSinceLastFetch >= 20 || lastRouteFetchTimeRef.current === 0) {
      calculateActiveRoute();
      setLastCalculatedStatus(ride.status);
    }
  }, [driverPos, ride?.status]);

  const calculateActiveRoute = async () => {
    if (!ride || !driverPos) return;

    lastRouteFetchTimeRef.current = Date.now();
    setRoutingLoading(true);

    const pickup = { latitude: ride.pickup.coordinates[1], longitude: ride.pickup.coordinates[0] };
    const dropoff = { latitude: ride.dropoff.coordinates[1], longitude: ride.dropoff.coordinates[0] };

    // Route switching: When arrived or in_progress, show route from pickup to dropoff.
    const showRouteToDropoff = ride.status === 'arrived' || ride.status === 'in_progress';
    const origin = showRouteToDropoff ? pickup : driverPos;
    const destination = showRouteToDropoff ? dropoff : pickup;

    const directions = await fetchDirections(origin, destination);

    if (directions) {
      setRoutePolyline(directions.polylineCoordinates);
      setEta(directions.durationText);
      setDistance(directions.distanceText);

      if (mapRef.current) {
        mapRef.current.fitToCoordinates([origin, destination], {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true,
        });
      }
    } else {
      setRoutePolyline([origin, destination]);
      setEta('Unknown');
      setDistance('Unknown');
    }
    setRoutingLoading(false);
  };

  if (!ride) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading ride details…</Text>
      </View>
    );
  }

  const pickup = { latitude: ride.pickup.coordinates[1], longitude: ride.pickup.coordinates[0] };
  const dropoff = { latitude: ride.dropoff.coordinates[1], longitude: ride.dropoff.coordinates[0] };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ ...pickup, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
      >
        {/* Polyline draws behind the custom markers */}
        {routePolyline.length > 0 && (
          <Polyline coordinates={routePolyline} strokeWidth={4} strokeColor="#ffffff" />
        )}

        {/* Custom Marker for Pickup */}
        <Marker coordinate={pickup} title="Pickup" description={ride.pickup.address}>
          <View style={styles.pickupMarker}>
            <Ionicons name="person" size={18} color="#1c1c1c" />
          </View>
        </Marker>

        {/* Custom Marker for Dropoff */}
        <Marker coordinate={dropoff} title="Drop-off" description={ride.dropoff.address}>
          <View style={styles.dropoffMarker}>
            <Ionicons name="flag" size={18} color="#1c1c1c" />
          </View>
        </Marker>

        {/* Animated Marker for Driver */}
        {driverPos && (
          <Marker.Animated
            coordinate={driverPosition}
            tracksViewChanges={false}
            title="Driver"
          >
            <View style={styles.driverMarkerBadge}>
              {ride.vehicleType === 'bike' ? (
                <Ionicons name="bicycle" size={18} color={colors.background} />
              ) : ride.vehicleType === 'rickshaw' ? (
                <Text style={styles.emojiText}>🛺</Text>
              ) : (
                <Ionicons name="car" size={18} color={colors.background} />
              )}
            </View>
          </Marker.Animated>
        )}
      </MapView>

      {ride.driver ? (
        <ActiveDriverPanel
          driverDetails={{
            name: ride.driver.user?.name || 'Driver',
            vehicleMake: ride.driver.vehicle?.make || '',
            vehicleModel: ride.driver.vehicle?.model || '',
            vehicleColor: ride.driver.vehicle?.color || '',
            plateNumber: ride.driver.vehicle?.plateNumber || '',
            phone: ride.driver.user?.phone || '',
            rating: ride.driver.ratingAvg || '5.0',
            fare: ride.agreedFare,
            eta: eta ? eta.replace(' min', '') : '3',
            status: ride.status,
          }}
          onChat={() => {
            setUnreadCount(0);
            navigation.navigate('Chat', {
              rideId,
              otherName: ride?.driver?.user?.name || 'Driver',
            });
          }}
          onCancel={() => {
            Alert.alert(
              'Cancel Ride',
              'Are you sure you want to cancel this ride?',
              [
                { text: 'No', style: 'cancel' },
                {
                  text: 'Yes, Cancel',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await api.post(`/rides/${rideId}/cancel`, { reason: 'Rider cancelled' });
                      navigation.replace('RequestRide');
                    } catch (err) {
                      Alert.alert('Error', 'Could not cancel the ride.');
                    }
                  },
                },
              ]
            );
          }}
        />
      ) : (
        <View style={styles.panel}>
          <ActivityIndicator size="small" color={colors.accent} />
          <Text style={{ color: '#fff', textAlign: 'center', marginTop: 10 }}>Driver details loading...</Text>
        </View>
      )}

      {ride.status === 'completed' && ride.paymentStatus === 'pending' && (
        <PaymentMethodSheet
          ride={ride}
          onPaymentSuccess={(updatedRide) => {
            setRide(updatedRide);
            navigation.replace('Rating', { rideId });
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  map: { flex: 2 },
  loadingText: { marginTop: 10, color: colors.textPrimary },
  panel: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  statusRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontSize: 16, fontWeight: '700', textTransform: 'capitalize', color: colors.textPrimary },
  statusHighlight: { color: colors.accent },
  fare: { marginTop: 6, color: colors.textSecondary, fontSize: 14, fontWeight: '600' },
  driverSection: { marginTop: 12, borderTopWidth: 1, borderColor: colors.border, paddingTop: 10 },
  driverInfo: { color: colors.textPrimary, fontSize: 13, fontWeight: '500' },
  vehicleInfo: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  etaContainer: {
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  etaTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  etaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
    marginTop: 3,
  },
  cancelBtn: { marginTop: 16, padding: 14, alignItems: 'center', borderTopWidth: 1, borderColor: colors.border },
  cancelText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
  chatHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chatBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.danger,
    borderRadius: 9,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  
  // Custom Markers
  pickupMarker: {
    backgroundColor: '#ffffff',
    padding: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1c1c1c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  dropoffMarker: {
    backgroundColor: '#ffffff',
    padding: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1c1c1c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 4,
  },
  driverMarkerBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  emojiText: {
    fontSize: 16,
  },
});
