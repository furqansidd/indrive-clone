import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import api from '../../api/client';
import { getSocket } from '../../api/socket';
import colors from '../../theme/colors';

export default function BiddingScreen({ route, navigation }) {
  const { rideId } = route.params;
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRide = async () => {
    try {
      const { data } = await api.get(`/rides/${rideId}`);
      setRide(data);
      setLoading(false);
      if (data.status === 'accepted') {
        navigation.replace('TrackRide', { rideId });
      }
    } catch (err) {
      console.error('Error fetching ride:', err);
    }
  };

  useEffect(() => {
    fetchRide();
    const socket = getSocket();
    socket.emit('join:ride', rideId);
    socket.on('ride:offer', () => fetchRide());
    socket.on('ride:accepted', () => navigation.replace('TrackRide', { rideId }));
    return () => {
      socket.off('ride:offer');
      socket.off('ride:accepted');
    };
  }, []);

  const acceptOffer = async (offerId) => {
    try {
      await api.post(`/rides/${rideId}/offer/${offerId}/accept`);
      navigation.replace('TrackRide', { rideId });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    }
  };

  const cancelRide = async () => {
    try {
      await api.post(`/rides/${rideId}/cancel`, { reason: 'Rider cancelled during bidding' });
      // Go back to RequestRide instead of goBack() to avoid navigator crash
      navigation.replace('RequestRide');
    } catch (err) {
      Alert.alert('Error', 'Could not cancel the ride.');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Waiting for driver offers…</Text>
      <Text style={styles.subtitle}>Your suggested fare: Rs. {ride.suggestedFare}</Text>

      <FlatList
        data={ride.offers}
        keyExtractor={(o) => o._id}
        contentContainerStyle={{ paddingVertical: 12 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="small" color={colors.accent} style={{ marginBottom: 12 }} />
            <Text style={styles.empty}>No offers yet. Drivers nearby will send counter-offers.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.offerCard}>
            <View>
              <Text style={styles.offerAmount}>Rs. {item.amount}</Text>
              <Text style={styles.offerEta}>{item.etaMinutes ? `${item.etaMinutes} min away` : 'Nearby'}</Text>
            </View>
            <TouchableOpacity style={styles.acceptBtn} onPress={() => acceptOffer(item._id)}>
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={styles.cancelBtn} onPress={cancelRide}>
        <Text style={styles.cancelText}>Cancel Ride Request</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  title: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  subtitle: { color: colors.textSecondary, marginTop: 4, fontSize: 14 },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  empty: { textAlign: 'center', color: colors.textSecondary, fontSize: 13, paddingHorizontal: 20 },
  offerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    marginBottom: 12,
    backgroundColor: colors.surface,
  },
  offerAmount: { fontSize: 18, fontWeight: '700', color: colors.accent },
  offerEta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  acceptBtn: { backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 10 },
  acceptText: { color: colors.background, fontWeight: '700', fontSize: 14 },
  cancelBtn: { padding: 16, alignItems: 'center', marginTop: 10 },
  cancelText: { color: colors.danger, fontWeight: '700', fontSize: 14 },
});
