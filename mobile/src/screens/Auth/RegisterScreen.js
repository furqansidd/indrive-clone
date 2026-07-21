import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/client';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  
  // Step 1: User details
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [otp, setOtp] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [role, setRole] = useState('rider'); // 'rider' | 'driver'
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Info, 2: Vehicle details (for drivers)

  // Step 2: Vehicle details
  const [vehicle, setVehicle] = useState({
    type: 'car', // 'bike' | 'rickshaw' | 'car'
    make: '',
    model: '',
    color: '',
    plateNumber: '',
  });

  const setField = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));
  const setVehicleField = (key) => (val) => setVehicle((v) => ({ ...v, [key]: val }));

  const handleSendOtp = async () => {
    if (!form.email) {
      return Alert.alert('Email Required', 'Please enter your email address to receive the verification code.');
    }
    setOtpSending(true);
    try {
      await api.post('/auth/send-otp', { email: form.email });
      Alert.alert('OTP Sent', 'A 6-digit verification code has been sent to your email.');
    } catch (err) {
      Alert.alert('Failed to send OTP', err.response?.data?.message || err.message);
    } finally {
      setOtpSending(false);
    }
  };

  const handleNextStepOrSubmit = async () => {
    if (!form.name || !form.email || !form.phone || !form.password) {
      return Alert.alert('Missing info', 'Please fill in all fields.');
    }

    // 11-digit phone number format validation
    const phoneRegex = /^\d{11}$/;
    if (!phoneRegex.test(form.phone)) {
      return Alert.alert('Invalid Phone', 'Phone number must be exactly 11 digits (e.g. 03001234567).');
    }

    if (!otp) {
      return Alert.alert('Verification Required', 'Please request and enter the 6-digit verification code sent to your email.');
    }

    if (role === 'driver' && step === 1) {
      setStep(2);
      return;
    }

    // Submit Rider or Driver (with vehicle)
    submitRegistration();
  };

  const submitRegistration = async () => {
    if (role === 'driver') {
      if (!vehicle.make || !vehicle.model || !vehicle.color || !vehicle.plateNumber) {
        return Alert.alert('Missing info', 'Please fill in all vehicle details.');
      }
    }

    setLoading(true);
    try {
      const payload = {
        ...form,
        role,
        otp,
        ...(role === 'driver' && { vehicle }),
      };
      await register(payload);
    } catch (err) {
      Alert.alert('Registration failed', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
      <View style={styles.container}>
        <Text style={styles.title}>Create Account</Text>

        {step === 1 ? (
          <View>
            {/* Role Switcher */}
            <View style={styles.roleRow}>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'rider' && styles.roleActive]}
                onPress={() => setRole('rider')}
              >
                <Text style={role === 'rider' ? styles.roleTextActive : styles.roleText}>I'm a Rider</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.roleBtn, role === 'driver' && styles.roleActive]}
                onPress={() => setRole('driver')}
              >
                <Text style={role === 'driver' ? styles.roleTextActive : styles.roleText}>I'm a Driver</Text>
              </TouchableOpacity>
            </View>

            {/* Step 1 Form Fields */}
            <TextInput style={styles.input} placeholder="Full name" value={form.name} onChangeText={setField('name')} />
            <View style={styles.emailRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={form.email}
                onChangeText={setField('email')}
              />
              <TouchableOpacity
                style={[styles.otpBtn, otpSending && styles.otpBtnDisabled]}
                onPress={handleSendOtp}
                disabled={otpSending}
              >
                <Text style={styles.otpBtnText}>{otpSending ? '...' : 'Send OTP'}</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.input}
              placeholder="Verification Code (OTP)"
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />
            <TextInput
              style={styles.input}
              placeholder="Phone number (11 digits)"
              keyboardType="phone-pad"
              maxLength={11}
              value={form.phone}
              onChangeText={setField('phone')}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              value={form.password}
              onChangeText={setField('password')}
            />

            <TouchableOpacity style={styles.button} onPress={handleNextStepOrSubmit} disabled={loading}>
              <Text style={styles.buttonText}>
                {role === 'driver' ? 'Next: Vehicle Details ➔' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.subtitle}>Driver Vehicle Details</Text>

            {/* Vehicle Type Selector */}
            <Text style={styles.label}>Vehicle Type</Text>
            <View style={styles.roleRow}>
              {['bike', 'rickshaw', 'car'].map((type) => {
                const isSelected = vehicle.type === type;
                const emojis = { bike: '🏍️ Bike', rickshaw: '🛺 Rickshaw', car: '🚗 Car' };
                return (
                  <TouchableOpacity
                    key={type}
                    style={[styles.roleBtn, isSelected && styles.roleActive]}
                    onPress={() => setVehicleField('type')(type)}
                  >
                    <Text style={isSelected ? styles.roleTextActive : styles.roleText}>{emojis[type]}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.input}
              placeholder="Vehicle Make (e.g. Honda, Suzuki)"
              value={vehicle.make}
              onChangeText={setVehicleField('make')}
            />
            <TextInput
              style={styles.input}
              placeholder="Vehicle Model (e.g. CD70, Civic)"
              value={vehicle.model}
              onChangeText={setVehicleField('model')}
            />
            <TextInput
              style={styles.input}
              placeholder="Vehicle Color"
              value={vehicle.color}
              onChangeText={setVehicleField('color')}
            />
            <TextInput
              style={styles.input}
              placeholder="License Plate Number"
              value={vehicle.plateNumber}
              onChangeText={setVehicleField('plateNumber')}
            />

            <TouchableOpacity style={styles.button} onPress={submitRegistration} disabled={loading}>
              <Text style={styles.buttonText}>{loading ? 'Submitting…' : 'Complete Registration'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backBtn} onPress={() => setStep(1)}>
              <Text style={styles.backBtnText}>⬅ Back to Profile Info</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.link}>Already have an account? Log in</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flexGrow: 1, justifyContent: 'center' },
  container: { padding: 24, backgroundColor: '#fff', flex: 1, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 20 },
  subtitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', marginBottom: 15, color: '#333' },
  label: { fontSize: 12, fontWeight: '700', color: '#666', marginBottom: 6 },
  roleRow: { flexDirection: 'row', marginBottom: 16, gap: 8 },
  roleBtn: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  roleActive: { backgroundColor: '#ffde00', borderColor: '#ffde00' },
  roleText: { color: '#666', fontSize: 12 },
  roleTextActive: { fontWeight: '700', fontSize: 12 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 13 },
  button: { backgroundColor: '#111', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '700' },
  backBtn: { padding: 12, alignItems: 'center', marginTop: 8 },
  backBtnText: { color: '#666', fontWeight: '600', fontSize: 12 },
  link: { textAlign: 'center', marginTop: 16, color: '#333', fontSize: 13 },
  emailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 8 },
  otpBtn: { backgroundColor: '#111', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, justifyContent: 'center', height: 48 },
  otpBtnDisabled: { backgroundColor: '#bbb' },
  otpBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
});
