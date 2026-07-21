import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Switch, TextInput, Alert } from 'react-native';
import * as Location from 'expo-location';
import api from '../../api/client';
import { getSocket } from '../../api/socket';
import { useAuth } from '../../context/AuthContext';
import SideDrawer from '../../components/SideDrawer';

export default function DriverHomeScreen({ navigation }) {
  const { user, logout } = useAuth();
  const [online, setOnline] = useState(false);
  const [rides, setRides] = useState([]);
  const [coords, setCoords] = useState(null);
  const [offerAmounts, setOfferAmounts] = useState({});
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setCoords({ lng: loc.coords.longitude, lat: loc.coords.latitude });
    })();

    const socket = getSocket();
    socket.on('ride:new', () => fetchNearby());
    socket.on('ride:removed', (rideId) => {
      setRides((prev) => prev.filter((r) => r._id !== rideId));
    });
    return () => {
      socket.off('ride:new');
      socket.off('ride:removed');
    };
  }, []);

  useEffect(() => {
    let interval;
    if (online && coords) {
      fetchNearby();
      interval = setInterval(() => {
        api.patch('/drivers/location', coords).catch(() => {});
        fetchNearby();
      }, 8000);
    }
    return () => interval && clearInterval(interval);
  }, [online, coords]);

  const toggleOnline = async (val) => {
    setOnline(val);
    if (!val) {
      setRides([]);
    }
    try {
      await api.patch('/drivers/status', { isOnline: val, isAvailable: val });
    } catch (err) {
      Alert.alert('Cannot go online', err.response?.data?.message || err.message);
      setOnline(!val);
    }
  };

  const fetchNearby = async () => {
    try {
      const { data } = await api.get('/rides/nearby', { params: coords ? { lng: coords.lng, lat: coords.lat } : {} });
      setRides(data);
    } catch (err) {
      // silently ignore polling errors
    }
  };

  const submitOffer = async (rideId) => {
    const amount = offerAmounts[rideId];
    if (!amount) return Alert.alert('Enter amount', 'Type your counter-offer fare');
    try {
      await api.post(`/rides/${rideId}/offer`, { amount: Number(amount), etaMinutes: 5 });
      Alert.alert('Offer sent', 'Waiting for rider to respond.');
      navigation.navigate('ActiveRide', { rideId });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    }
  };

  const handleLogout = async () => {
    setDrawerOpen(false);
    await logout();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.menuBtn}>
          <View style={styles.hamburger} />
          <View style={styles.hamburger} />
          <View style={styles.hamburger} />
        </TouchableOpacity>
        <Text style={styles.title}>{online ? '🟢 Online' : '🔴 Offline'}</Text>
        <Switch value={online} onValueChange={toggleOnline} trackColor={{ true: '#27ae60' }} />
      </View>

      {!online && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>Go online to see ride requests nearby.</Text>
          <TouchableOpacity onPress={() => navigation.navigate('DocumentUpload')} style={styles.docsBtn}>
            <Text style={styles.docsBtnText}>📄 Upload Documents</Text>
          </TouchableOpacity>
        </View>
      )}

      {online && (
        <FlatList
          data={rides}
          keyExtractor={(r) => r._id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={<Text style={styles.empty}>No ride requests nearby right now.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardTopRow}>
                <Text style={styles.rider}>{item.rider?.name || 'Rider'}</Text>
                <Text style={styles.vehicleTag}>
                  {item.vehicleType === 'bike' ? '🏍️' : item.vehicleType === 'rickshaw' ? '🛺' : '🚗'} {item.vehicleType}
                </Text>
              </View>
              <Text style={styles.suggested}>Suggested fare: <Text style={styles.boldFare}>Rs. {item.suggestedFare}</Text></Text>
              <Text style={styles.addressText} numberOfLines={1}>📍 {item.pickup?.address || 'Pickup'}</Text>
              <Text style={styles.addressText} numberOfLines={1}>🏁 {item.dropoff?.address || 'Dropoff'}</Text>
              <View style={styles.offerRow}>
                <TextInput
                  style={styles.input}
                  placeholder="Your offer (Rs.)"
                  keyboardType="numeric"
                  value={offerAmounts[item._id] || ''}
                  onChangeText={(v) => setOfferAmounts((s) => ({ ...s, [item._id]: v }))}
                />
                <TouchableOpacity style={styles.offerBtn} onPress={() => submitOffer(item._id)}>
                  <Text style={styles.offerBtnText}>Send Offer</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {/* Side Drawer */}
      <SideDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        role="driver"
        onNavigate={(screen) => navigation.navigate(screen)}
        onLogout={handleLogout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f7f8fa' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuBtn: { padding: 4, gap: 4 },
  hamburger: { width: 22, height: 2, backgroundColor: '#111', marginBottom: 4, borderRadius: 2 },
  title: { fontSize: 16, fontWeight: '700', color: '#111' },
  offlineBanner: { alignItems: 'center', padding: 24 },
  offlineBannerText: { color: '#888', textAlign: 'center', fontSize: 14, marginBottom: 12 },
  docsBtn: { padding: 10, backgroundColor: '#111', borderRadius: 10 },
  docsBtnText: { color: '#ffde00', fontWeight: '700', fontSize: 12 },
  empty: { textAlign: 'center', color: '#999', marginTop: 40 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  rider: { fontWeight: '700', fontSize: 15 },
  vehicleTag: { fontSize: 12, color: '#555', fontWeight: '600', textTransform: 'capitalize' },
  suggested: { color: '#666', marginTop: 2, marginBottom: 6, fontSize: 13 },
  boldFare: { fontWeight: '800', color: '#111' },
  addressText: { color: '#555', fontSize: 12, marginBottom: 2 },
  offerRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  input: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 8, backgroundColor: '#fafafa' },
  offerBtn: { backgroundColor: '#111', paddingHorizontal: 14, borderRadius: 8, justifyContent: 'center' },
  offerBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
});
