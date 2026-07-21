import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';

export default function ActiveDriverPanel({ driverDetails, onChat, onCancel }) {
  if (!driverDetails) return null;

  const {
    name,
    vehicleMake,
    vehicleModel,
    vehicleColor,
    plateNumber,
    phone,
    rating,
    fare,
    eta,
    status,
  } = driverDetails;

  const handleCall = () => {
    if (phone) {
      Linking.openURL(`tel:${phone}`).catch(() => {
        Alert.alert('Error', 'Could not open dialer on this device.');
      });
    } else {
      Alert.alert('Call Unavailable', 'Driver phone number is not available.');
    }
  };

  return (
    <View style={styles.sheetContainer}>
      {/* Grey pill drag handle */}
      <View style={styles.dragHandle} />

      {/* Dynamic Status Header */}
      {status === 'arrived' ? (
        <Text style={[styles.headerTitle, { color: colors.accent }]}>
          Driver has arrived! Please meet them.
        </Text>
      ) : status === 'in_progress' ? (
        <Text style={styles.headerTitle}>Ride in progress</Text>
      ) : (
        <Text style={styles.headerTitle}>Driver is coming — {eta || 'Nearby'} min</Text>
      )}

      {/* Agreed Fare */}
      <Text style={styles.fareText}>Agreed Fare: <Text style={styles.fareHighlight}>Rs. {fare}</Text></Text>

      {/* Middle Section */}
      <View style={styles.middleSection}>
        {/* Left Column: Vehicle details & Plate badge */}
        <View style={styles.leftColumn}>
          <Text style={styles.vehicleName}>
            {vehicleColor} {vehicleMake} {vehicleModel}
          </Text>
          <View style={styles.plateBadge}>
            <Text style={styles.plateText}>{plateNumber}</Text>
          </View>
        </View>

        {/* Right Column: Profile placeholder & Name */}
        <View style={styles.rightColumn}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarInitial}>{name ? name.charAt(0).toUpperCase() : 'D'}</Text>
          </View>
          <View style={styles.driverMeta}>
            <Text style={styles.driverName}>{name.split(' ')[0]}</Text>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={12} color="#ffd700" style={{ marginRight: 2 }} />
              <Text style={styles.ratingText}>{rating || '5.0'}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Bottom Actions Row */}
      <View style={styles.actionsRow}>
        {/* Call circular button */}
        <TouchableOpacity style={styles.circularButton} onPress={handleCall}>
          <Ionicons name="call" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Chat circular button */}
        <TouchableOpacity style={styles.circularButton} onPress={onChat}>
          <Ionicons name="chatbubble" size={20} color={colors.textPrimary} />
        </TouchableOpacity>

        {/* Red Tint Cancel Button */}
        <TouchableOpacity style={styles.cancelTextButton} onPress={onCancel}>
          <Text style={styles.cancelBtnText}>Cancel Ride</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
    borderWidth: 1,
    borderColor: '#222',
  },
  dragHandle: {
    width: 48,
    height: 6,
    backgroundColor: '#3e3e3e',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 4,
  },
  fareText: {
    fontSize: 13,
    color: '#9a9a9a',
    textAlign: 'center',
    marginBottom: 20,
  },
  fareHighlight: {
    color: colors.accent,
    fontWeight: 'bold',
    fontSize: 14,
  },
  middleSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  leftColumn: {
    flex: 1.2,
    alignItems: 'flex-start',
  },
  vehicleName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  plateBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  plateText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  rightColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  driverMeta: {
    alignItems: 'flex-start',
  },
  driverName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  ratingText: {
    fontSize: 11,
    color: '#ffd700',
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  circularButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelTextButton: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 77, 0.3)',
  },
  cancelBtnText: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 14,
  },
});
