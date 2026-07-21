import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';

const STATUS_COLORS = {
  completed: { bg: '#d4edda', text: '#155724' },
  cancelled: { bg: '#f8d7da', text: '#721c24' },
  in_progress: { bg: '#cce5ff', text: '#004085' },
  arriving: { bg: '#fff3cd', text: '#856404' },
  accepted: { bg: '#e2e3e5', text: '#383d41' },
  requested: { bg: '#e2e3e5', text: '#383d41' },
  negotiating: { bg: '#e2e3e5', text: '#383d41' },
};

const STATUS_LABEL = {
  requested: 'Requested',
  negotiating: 'Negotiating',
  accepted: 'Matched',
  arriving: 'Driver Arriving',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

function RideCard({ ride, role }) {
  const s = STATUS_COLORS[ride.status] || { bg: '#eee', text: '#333' };
  const driverName = ride.driver?.user?.name || 'N/A';
  const riderName = ride.rider?.name || 'N/A';
  const date = new Date(ride.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.dateText}>{date}</Text>
        <View style={[styles.statusBadge, { backgroundColor: s.bg }]}>
          <Text style={[styles.statusText, { color: s.text }]}>{STATUS_LABEL[ride.status] || ride.status}</Text>
        </View>
      </View>

      <View style={styles.routeRow}>
        <View style={styles.routeDot} />
        <Text style={styles.address} numberOfLines={1}>
          {ride.pickup?.address || 'Pickup'}
        </Text>
      </View>
      <View style={styles.routeRow}>
        <View style={[styles.routeDot, styles.routeDotDest]} />
        <Text style={styles.address} numberOfLines={1}>
          {ride.dropoff?.address || 'Dropoff'}
        </Text>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.meta}>
          {role === 'driver' ? `👤 ${riderName}` : `🚗 ${driverName}`}
        </Text>
        {ride.vehicleType && (
          <Text style={styles.meta}>
            {ride.vehicleType === 'bike' ? '🏍️ Bike' : ride.vehicleType === 'rickshaw' ? '🛺 Rickshaw' : '🚗 Car'}
          </Text>
        )}
        {ride.agreedFare != null && (
          <Text style={styles.fareMeta}>Rs. {ride.agreedFare.toFixed(2)}</Text>
        )}
        {role === 'driver' && ride.driverPayout != null && ride.driverPayout > 0 && (
          <Text style={styles.payoutMeta}>Net: Rs. {ride.driverPayout.toFixed(2)}</Text>
        )}
      </View>
    </View>
  );
}

export default function RideHistoryScreen() {
  const { user } = useAuth();
  const role = user?.role;

  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRides = useCallback(async () => {
    try {
      const endpoint = role === 'driver' ? '/rides/my-driver' : '/rides/my';
      const { data } = await client.get(endpoint);
      setRides(data);
    } catch (err) {
      console.warn('Error fetching ride history:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [role]);

  useEffect(() => {
    fetchRides();
  }, [fetchRides]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRides();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#111" />
      </View>
    );
  }

  return (
    <FlatList
      data={rides}
      keyExtractor={(item) => item._id}
      contentContainerStyle={styles.listContainer}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🚖</Text>
          <Text style={styles.emptyText}>No rides yet</Text>
          <Text style={styles.emptySubText}>Your ride history will appear here.</Text>
        </View>
      }
      renderItem={({ item }) => <RideCard ride={item} role={role} />}
    />
  );
}

const styles = StyleSheet.create({
  listContainer: { padding: 16, backgroundColor: '#f7f8fa', flexGrow: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#222', marginBottom: 4 },
  emptySubText: { fontSize: 13, color: '#888', textAlign: 'center' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dateText: { fontSize: 12, color: '#888', fontWeight: '600' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '700' },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  routeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#27ae60', marginRight: 8 },
  routeDotDest: { backgroundColor: '#e74c3c' },
  address: { fontSize: 13, color: '#333', flex: 1 },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' },
  meta: { fontSize: 12, color: '#666', fontWeight: '500' },
  fareMeta: { fontSize: 13, fontWeight: '800', color: '#111' },
  payoutMeta: { fontSize: 12, fontWeight: '700', color: '#27ae60' },
});
