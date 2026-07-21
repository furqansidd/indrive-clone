import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../theme/colors';
import { useRide } from '../context/RideContext';
import { PRICING_CONFIG } from '../config/pricing';

export default function FareSelectorWidget({ loading, onSubmit }) {
  const {
    pickup,
    dropoff,
    distanceMeters,
    durationSeconds,
    selectedVehicle,
    setSelectedVehicle,
    suggestedFare,
    riderBid,
    setRiderBid,
    autoAccept,
    setAutoAccept,
  } = useRide();

  // Swipable expand state
  const [isExpanded, setIsExpanded] = useState(false);
  const heightAnim = useRef(new Animated.Value(245)).current; // Default collapsed height

  useEffect(() => {
    Animated.spring(heightAnim, {
      toValue: isExpanded ? 500 : 245,
      useNativeDriver: false,
      bounciness: 4,
    }).start();
  }, [isExpanded]);

  // Touch handlers to detect swipe up/down
  const touchStartY = useRef(0);

  const handleTouchStart = (e) => {
    touchStartY.current = e.nativeEvent.pageY;
  };

  const handleTouchEnd = (e) => {
    const touchEndY = e.nativeEvent.pageY;
    const diff = touchStartY.current - touchEndY; // negative means swipe down, positive means swipe up
    if (diff > 35) {
      setIsExpanded(true); // swiped up
    } else if (diff < -35) {
      setIsExpanded(false); // swiped down
    }
  };

  // Calculate fare on the fly for simple display rows
  const getFareFor = (key) => {
    const config = PRICING_CONFIG[key];
    if (!config || distanceMeters <= 0) return config?.minimumCap || 0;
    const distanceKm = distanceMeters / 1000;
    const durationMin = durationSeconds / 60;
    const calculated = config.baseFare + (distanceKm * config.ratePerKm) + (durationMin * config.ratePerMin);
    return Math.max(config.minimumCap, Math.round(calculated / 10) * 10);
  };

  const handleIncrement = () => {
    setRiderBid((prev) => prev + 10);
  };

  const handleDecrement = () => {
    const floor = Math.round((suggestedFare * 0.75) / 10) * 10;
    setRiderBid((prev) => {
      const next = prev - 10;
      return next >= floor ? next : prev;
    });
  };

  const isDecrementDisabled = riderBid <= Math.round((suggestedFare * 0.75) / 10) * 10;
  const isSubmitDisabled = !pickup || !dropoff || loading;

  const currentVehicleConfig = PRICING_CONFIG[selectedVehicle];

  return (
    <Animated.View 
      style={[styles.container, { height: heightAnim }]}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Drag Handle Decorator */}
      <TouchableOpacity 
        activeOpacity={1} 
        onPress={() => setIsExpanded(!isExpanded)}
        style={styles.dragHandleWrapper}
      >
        <View style={styles.dragHandle} />
      </TouchableOpacity>

      {/* Services Listing */}
      <View style={styles.listContainer}>
        {/* Render only the selected card when collapsed */}
        {Object.entries(PRICING_CONFIG).map(([key, config]) => {
          const isSelected = selectedVehicle === key;
          const fare = getFareFor(key);

          if (isSelected) {
            // Expanded selected service card with fare adjuster
            return (
              <View key={key} style={styles.selectedCard}>
                <View style={styles.cardHeader}>
                  <Text style={styles.vehicleEmojiLarge}>{config.emoji}</Text>
                  <View style={styles.selectedDetails}>
                    <View style={styles.titleRow}>
                      <Text style={styles.selectedTitle}>{config.label === 'Bike' ? 'Moto' : config.label}</Text>
                      <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} style={{ marginLeft: 4 }} />
                    </View>
                    <Text style={styles.selectedCapacity}>
                      👤 {key === 'bike' ? '1' : key === 'rickshaw' ? '3' : '4'} • 3 min
                    </Text>
                    <Text style={styles.selectedSubtitle}>No traffic, lower prices</Text>
                  </View>
                  <TouchableOpacity style={styles.editIcon}>
                    <Ionicons name="pencil" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Fare Adjuster Section inside card */}
                <View style={styles.adjusterRow}>
                  <TouchableOpacity
                    style={[styles.adjustButton, isDecrementDisabled && styles.adjustButtonDisabled]}
                    onPress={handleDecrement}
                    disabled={isDecrementDisabled}
                  >
                    <Text style={[styles.adjustBtnText, isDecrementDisabled && styles.textDisabled]}>−</Text>
                  </TouchableOpacity>

                  <View style={styles.fareDisplayWrapper}>
                    <Text style={styles.fareAmountText}>Rs. {riderBid}</Text>
                    <Text style={styles.fareSubText}>Recommended fare</Text>
                  </View>

                  <TouchableOpacity style={styles.adjustButton} onPress={handleIncrement}>
                    <Text style={styles.adjustBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }

          // Render unselected rows ONLY when expanded
          if (isExpanded) {
            return (
              <TouchableOpacity
                key={key}
                style={styles.unselectedRow}
                onPress={() => setSelectedVehicle(key)}
              >
                <Text style={styles.vehicleEmojiSmall}>{config.emoji}</Text>
                <View style={styles.unselectedDetails}>
                  <Text style={styles.unselectedTitle}>{config.label === 'Bike' ? 'Moto' : config.label}</Text>
                  <Text style={styles.unselectedSubText}>
                    👤 {key === 'bike' ? '1' : key === 'rickshaw' ? '3' : '4'} • 3 min
                  </Text>
                  <Text style={styles.unselectedSubTextSmall}>Lower fares</Text>
                </View>
                <Text style={styles.unselectedFare}>Rs. {fare}</Text>
              </TouchableOpacity>
            );
          }

          return null;
        })}
      </View>

      {/* Auto-accept toggle row (Visible ONLY when expanded) */}
      {isExpanded && (
        <View style={styles.toggleRow}>
          <View style={styles.toggleLabelGroup}>
            <Ionicons name="navigate" size={18} color={colors.textPrimary} style={{ marginRight: 10 }} />
            <View>
              <Text style={styles.toggleText}>Auto-accept offer of</Text>
              <Text style={styles.toggleTextHighlight}>Rs. {riderBid}</Text>
            </View>
          </View>
          <Switch
            value={autoAccept}
            onValueChange={setAutoAccept}
            trackColor={{ false: '#3e3e3e', true: colors.accent }}
            thumbColor={autoAccept ? '#1c1c1c' : '#f4f3f4'}
            ios_backgroundColor="#3e3e3e"
          />
        </View>
      )}

      {/* Bottom Actions Row (Always Visible) */}
      <View style={styles.bottomActions}>
        {/* Payment Type Cash Icon */}
        <TouchableOpacity style={styles.paymentButton}>
          <Ionicons name="cash" size={24} color="#4caf50" />
        </TouchableOpacity>

        {/* Large green Find a driver Button */}
        <TouchableOpacity
          style={[styles.submitButton, isSubmitDisabled && styles.submitButtonDisabled]}
          onPress={onSubmit}
          disabled={isSubmitDisabled}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.submitText}>Find a driver</Text>
          )}
        </TouchableOpacity>

        {/* Filter Sliders Settings Icon */}
        <TouchableOpacity style={styles.settingsButton}>
          <Ionicons name="options-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingBottom: 26,
    paddingTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 12,
    overflow: 'hidden',
  },
  dragHandleWrapper: {
    width: '100%',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragHandle: {
    width: 44,
    height: 5,
    backgroundColor: '#3e3e3e',
    borderRadius: 3,
  },
  listContainer: {
    marginBottom: 8,
  },
  selectedCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleEmojiLarge: {
    fontSize: 34,
    marginRight: 12,
  },
  selectedDetails: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedCapacity: {
    color: colors.textPrimary,
    fontSize: 12,
    marginTop: 2,
  },
  selectedSubtitle: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  editIcon: {
    padding: 6,
  },
  adjusterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f1f1f',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 10,
  },
  adjustButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#2d2d2d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  adjustButtonDisabled: {
    backgroundColor: '#1c1c1c',
    opacity: 0.4,
  },
  adjustBtnText: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  fareDisplayWrapper: {
    alignItems: 'center',
  },
  fareAmountText: {
    color: colors.textPrimary,
    fontSize: 19,
    fontWeight: 'bold',
  },
  fareSubText: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  textDisabled: {
    color: colors.textSecondary,
  },

  // Unselected Row Style
  unselectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  vehicleEmojiSmall: {
    fontSize: 28,
    marginRight: 14,
    opacity: 0.8,
  },
  unselectedDetails: {
    flex: 1,
  },
  unselectedTitle: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  unselectedSubText: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  unselectedSubTextSmall: {
    color: colors.textSecondary,
    fontSize: 10,
    marginTop: 1,
  },
  unselectedFare: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },

  // Toggle switch row
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: 14,
  },
  toggleLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  toggleTextHighlight: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 1,
  },

  // Bottom action bar
  bottomActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  paymentButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#3e3e3e',
    opacity: 0.6,
  },
  submitText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
