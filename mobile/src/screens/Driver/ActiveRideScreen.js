import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import api from '../../api/client';
import { getSocket } from '../../api/socket';
import { fetchDirections } from '../../api/locationiq';
import { useAuth } from '../../context/AuthContext';

const NEXT_STATUS = {
  accepted: 'arriving',
  arriving: 'arrived',
  arrived: 'in_progress',
  in_progress: 'completed',
};
const NEXT_LABEL = {
  accepted: "I'm heading to pickup",
  arriving: 'Mark Arrived',
  arrived: 'Start ride (rider picked up)',
  in_progress: 'Complete ride',
};

export default function ActiveRideScreen({ route, navigation }) {
  const { rideId } = route.params;
  const { user } = useAuth();
  const [ride, setRide] = useState(null);
  const [myPos, setMyPos] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Routing states
  const [routePolyline, setRoutePolyline] = useState([]);
  const [eta, setEta] = useState('');
  const [distance, setDistance] = useState('');
  const [routingLoading, setRoutingLoading] = useState(false);
  const [lastCalculatedStatus, setLastCalculatedStatus] = useState(null);

  const lastRouteFetchTimeRef = useRef(0);
  const mapRef = useRef(null);

  const fetchRide = async () => {
    try {
      const { data } = await api.get(`/rides/${rideId}`);
      setRide(data);
      if (data.status === 'completed') navigation.replace('DriverHome');
      if (data.status === 'cancelled') {
        Alert.alert('Ride cancelled', 'The rider has cancelled this request.');
        navigation.replace('DriverHome');
      }
    } catch (err) {
      console.error('Error fetching ride:', err);
    }
  };

  useEffect(() => {
    fetchRide();
    const socket = getSocket();
    socket.emit('join:ride', rideId);

    let watchSub;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('GPS Access Required', 'Please enable location permissions to drive and stream your location.');
          return;
        }
        
        watchSub = await Location.watchPositionAsync({ 
          accuracy: Location.Accuracy.High,
          distanceInterval: 15 
        }, (loc) => {
          const coords = [loc.coords.longitude, loc.coords.latitude];
          const newPos = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
          setMyPos(newPos);
          
          // Stream live location to rider
          socket.emit('driver:track', { rideId, coordinates: coords });
          // Update location on backend
          api.patch('/drivers/location', { lng: coords[0], lat: coords[1] }).catch(() => {});
        });
      } catch (err) {
        console.error('GPS Watch error:', err);
      }
    })();

    // Listen for new messages to increment unread badge
    const onMessage = (msg) => {
      if (msg.from !== 'driver') {
        setUnreadCount((c) => c + 1);
      }
    };
    socket.on('ride:message', onMessage);

    socket.on('ride:cancelled', () => {
      Alert.alert('Ride cancelled', 'The rider has cancelled this request.');
      navigation.replace('DriverHome');
    });

    socket.on('ride:status', () => {
      fetchRide();
    });

    socket.on('ride:accepted', () => {
      fetchRide();
    });

    return () => {
      watchSub && watchSub.remove();
      socket.off('ride:message', onMessage);
      socket.off('ride:cancelled');
      socket.off('ride:status');
      socket.off('ride:accepted');
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
              otherName: ride?.rider?.name || 'Rider',
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
    });
  }, [ride, unreadCount]);

  // Update routing whenever driver location or status updates (throttled to 20 seconds)
  useEffect(() => {
    if (!ride || !myPos) return;

    const now = Date.now();
    const secondsSinceLastFetch = (now - lastRouteFetchTimeRef.current) / 1000;
    const statusChanged = ride.status !== lastCalculatedStatus;

    if (statusChanged || secondsSinceLastFetch >= 20 || lastRouteFetchTimeRef.current === 0) {
      calculateActiveRoute();
      setLastCalculatedStatus(ride.status);
    }
  }, [myPos, ride?.status]);

  const calculateActiveRoute = async () => {
    if (!ride || !myPos) return;
    
    lastRouteFetchTimeRef.current = Date.now();
    setRoutingLoading(true);

    const pickup = { latitude: ride.pickup.coordinates[1], longitude: ride.pickup.coordinates[0] };
    const dropoff = { latitude: ride.dropoff.coordinates[1], longitude: ride.dropoff.coordinates[0] };
    
    // Route switching: When arrived or in_progress, show route from pickup to dropoff.
    const showRouteToDropoff = ride.status === 'arrived' || ride.status === 'in_progress';
    const origin = showRouteToDropoff ? pickup : myPos;
    const destination = showRouteToDropoff ? dropoff : pickup;

    const directions = await fetchDirections(origin, destination);

    if (directions) {
      setRoutePolyline(directions.polylineCoordinates);
      setEta(directions.durationText);
      setDistance(directions.distanceText);
      
      // Auto zoom map to fit driver and destination
      if (mapRef.current) {
        mapRef.current.fitToCoordinates([origin, destination], {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true,
        });
      }
    } else {
      // Fallback
      setRoutePolyline([origin, destination]);
      setEta('Unknown');
      setDistance('Unknown');
    }
    setRoutingLoading(false);
  };

  const advance = async () => {
    if (!ride) return;
    const next = NEXT_STATUS[ride.status];
    if (!next) return;
    try {
      const { data } = await api.patch(`/rides/${rideId}/status`, { status: next });
      setRide(data);
      if (next === 'completed') {
        // Show commission & earnings summary upon completed ride
        const basePayout = data.agreedFare;
        const commission = basePayout * 0.10;
        const netEarnings = basePayout - commission;
        
        if (data.paymentMethod === 'card' || data.paymentMethod === 'wallet') {
          Alert.alert(
            'Ride Completed',
            `Online payment complete.\nGross Fare: Rs. ${basePayout.toFixed(2)}\nPlatform Commission (10%): -Rs. ${commission.toFixed(2)}\nYour Net Earnings: Rs. ${netEarnings.toFixed(2)}`,
            [{ text: 'OK', onPress: () => navigation.replace('DriverHome') }]
          );
        } else {
          Alert.alert(
            'Ride Completed',
            `Collect cash from Rider.\nGross Fare: Rs. ${basePayout.toFixed(2)}\nPlatform Commission Owed (10%): -Rs. ${commission.toFixed(2)}\nYour Net Earnings: Rs. ${netEarnings.toFixed(2)}`,
            [{ text: 'OK', onPress: () => navigation.replace('DriverHome') }]
          );
        }
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    }
  };

  if (!ride) return <View style={styles.center}><ActivityIndicator size="large" color="#111" /><Text style={{ marginTop: 10 }}>Loading ride details…</Text></View>;

  const pickup = { latitude: ride.pickup.coordinates[1], longitude: ride.pickup.coordinates[0] };
  const dropoff = { latitude: ride.dropoff.coordinates[1], longitude: ride.dropoff.coordinates[0] };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ ...pickup, latitudeDelta: 0.03, longitudeDelta: 0.03 }}
      >
        <Marker coordinate={pickup} pinColor="green" title="Pickup" description={ride.pickup.address} />
        <Marker coordinate={dropoff} pinColor="red" title="Drop-off" description={ride.dropoff.address} />
        {myPos && <Marker coordinate={myPos} pinColor="blue" title="You" />}
        {routePolyline.length > 0 && (
          <Polyline coordinates={routePolyline} strokeWidth={4} strokeColor="#007aff" />
        )}
      </MapView>

      <View style={styles.panel}>
        <View style={styles.row}>
          <Text style={styles.status}>Status: {ride.status.replace('_', ' ')}</Text>
          {routingLoading && <ActivityIndicator size="small" color="#111" />}
        </View>
        <Text style={styles.fare}>Agreed fare: Rs. {ride.agreedFare} ({ride.paymentMethod === 'card' || ride.paymentMethod === 'wallet' ? '💳 Online' : '💵 Cash'})</Text>

        {ride.rider && (
          <View style={styles.riderInfoSection}>
            <Text style={styles.riderText}>Rider: {ride.rider.name} · {ride.rider.phone}</Text>
          </View>
        )}

        {/* Live ETA section */}
        {myPos && (
          <View style={styles.etaContainer}>
            <Text style={styles.etaTitle}>
              {ride.status === 'in_progress'
                ? 'Heading to Drop-off Destination'
                : ride.status === 'arrived'
                ? 'Waiting for Rider at Pickup'
                : 'En route to Rider Pickup'}
            </Text>
            <Text style={styles.etaValue}>ETA: {eta} ({distance})</Text>
          </View>
        )}

        {NEXT_STATUS[ride.status] && (
          <TouchableOpacity style={styles.button} onPress={advance}>
            <Text style={styles.buttonText}>{NEXT_LABEL[ride.status]}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  map: { flex: 2 },
  panel: { flex: 1.2, padding: 16, backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, elevation: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  status: { fontSize: 16, fontWeight: '700', textTransform: 'capitalize' },
  fare: { marginTop: 6, color: '#333', fontSize: 14, fontWeight: '600' },
  riderInfoSection: { marginTop: 10, borderTopWidth: 1, borderColor: '#eee', paddingTop: 8 },
  riderText: { color: '#666', fontSize: 13 },
  etaContainer: {
    backgroundColor: '#f5fffa',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: '#98fb98',
  },
  etaTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#006400',
  },
  etaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e8b57',
    marginTop: 2,
  },
  button: { backgroundColor: '#111', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 'auto' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  chatHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: '#eee',
    borderRadius: 12,
  },
  chatBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff3b30',
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
});
