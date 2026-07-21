import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import api from '../api/client';
import colors from '../theme/colors';

export default function PaymentMethodSheet({ ride, onPaymentSuccess }) {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState(null); // 'cash' | 'card'

  const slideAnim = useRef(new Animated.Value(400)).current; // Start hidden (offset bottom)

  useEffect(() => {
    // Slide up animation on mount
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  }, []);

  const handleCashPayment = async () => {
    setLoading(true);
    try {
      const { data } = await api.patch(`/rides/${ride._id}/status`, {
        paymentMethod: 'cash',
        paymentStatus: 'paid',
      });
      Alert.alert('Payment Logged', 'Cash payment confirmed directly with driver.');
      onPaymentSuccess(data);
    } catch (err) {
      Alert.alert('Payment Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStripePayment = async () => {
    setLoading(true);
    try {
      // 1. Fetch PaymentIntent client secret from backend
      const { data: intentData } = await api.post(`/rides/${ride._id}/pay/stripe`);
      const { clientSecret } = intentData;

      if (!clientSecret) {
        throw new Error('Failed to retrieve client secret from backend.');
      }

      // 2. Initialize the Payment Sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: 'inDrive Clone',
        defaultBillingDetails: {
          name: ride.rider?.name || 'Rider',
        },
        style: 'alwaysDark',
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // 3. Present the Payment Sheet
      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        // Stripe cancels payment (user closed sheet)
        if (presentError.code === 'Canceled') {
          Alert.alert('Payment Canceled', 'Stripe payment was canceled.');
          return;
        }
        throw new Error(presentError.message);
      }

      // 4. Update the database on Stripe success
      const { data: updatedRide } = await api.patch(`/rides/${ride._id}/status`, {
        paymentMethod: 'card',
        paymentStatus: 'paid',
      });

      Alert.alert(
        'Payment Successful',
        `Rs. ${ride.agreedFare} has been successfully charged.\n(Platform Commission: Rs. ${(ride.agreedFare * 0.10).toFixed(2)}, Driver Payout: Rs. ${(ride.agreedFare * 0.90).toFixed(2)})`
      );
      onPaymentSuccess(updatedRide);
    } catch (err) {
      Alert.alert('Stripe Payment Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }] }]}>
      {/* Drag handle decoration */}
      <View style={styles.dragHandle} />

      <Text style={styles.title}>Final Payment</Text>
      
      <View style={styles.fareContainer}>
        <Text style={styles.fareLabel}>Agreed Ride Fare</Text>
        <Text style={styles.fareAmount}>Rs. {ride.agreedFare}</Text>
      </View>

      <Text style={styles.sectionTitle}>Select Payment Method</Text>

      {/* Cash Card */}
      <TouchableOpacity
        style={[
          styles.card,
          selectedMethod === 'cash' && styles.selectedCard,
        ]}
        onPress={() => setSelectedMethod('cash')}
        disabled={loading}
      >
        <View style={styles.cardInfo}>
          <Ionicons name="cash-outline" size={24} color={colors.accent} style={styles.cardIcon} />
          <View>
            <Text style={styles.cardTitle}>Cash on Delivery (COD)</Text>
            <Text style={styles.cardSubtitle}>Pay directly to driver</Text>
          </View>
        </View>
        <Ionicons
          name={selectedMethod === 'cash' ? 'radio-button-on' : 'radio-button-off'}
          size={20}
          color={selectedMethod === 'cash' ? colors.accent : colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Stripe Card */}
      <TouchableOpacity
        style={[
          styles.card,
          selectedMethod === 'card' && styles.selectedCard,
        ]}
        onPress={() => setSelectedMethod('card')}
        disabled={loading}
      >
        <View style={styles.cardInfo}>
          <Ionicons name="card-outline" size={24} color={colors.accent} style={styles.cardIcon} />
          <View>
            <Text style={styles.cardTitle}>Bank Transfer (Stripe)</Text>
            <Text style={styles.cardSubtitle}>Secure credit/debit card payment</Text>
          </View>
        </View>
        <Ionicons
          name={selectedMethod === 'card' ? 'radio-button-on' : 'radio-button-off'}
          size={20}
          color={selectedMethod === 'card' ? colors.accent : colors.textSecondary}
        />
      </TouchableOpacity>

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.payButton,
          (!selectedMethod || loading) && styles.payButtonDisabled,
        ]}
        onPress={selectedMethod === 'cash' ? handleCashPayment : handleStripePayment}
        disabled={!selectedMethod || loading}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.payButtonText}>
            Confirm & Pay Rs. {ride.agreedFare}
          </Text>
        )}
      </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingBottom: 35,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 15,
  },
  dragHandle: {
    width: 44,
    height: 5,
    backgroundColor: '#3e3e3e',
    borderRadius: 3,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  fareContainer: {
    backgroundColor: colors.surface,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fareLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  fareAmount: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.accent,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedCard: {
    borderColor: colors.accent,
  },
  cardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardIcon: {
    marginRight: 14,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  payButton: {
    backgroundColor: colors.accent,
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  payButtonDisabled: {
    backgroundColor: '#3e3e3e',
    opacity: 0.6,
  },
  payButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
