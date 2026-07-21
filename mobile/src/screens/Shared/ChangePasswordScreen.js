import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import client from '../../api/client';

export default function ChangePasswordScreen({ navigation }) {
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const setField = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  const handleChange = async () => {
    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      return Alert.alert('Missing fields', 'Please fill in all fields.');
    }
    if (form.newPassword !== form.confirmPassword) {
      return Alert.alert('Mismatch', 'New passwords do not match.');
    }
    if (form.newPassword.length < 6) {
      return Alert.alert('Too short', 'New password must be at least 6 characters.');
    }

    setLoading(true);
    try {
      const { data } = await client.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      Alert.alert('✅ Success', data.message || 'Password changed!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.iconWrap}>
        <Text style={styles.icon}>🔒</Text>
        <Text style={styles.title}>Change Password</Text>
        <Text style={styles.subtitle}>Enter your current password and choose a new one.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Current Password</Text>
        <TextInput
          style={styles.input}
          value={form.currentPassword}
          onChangeText={setField('currentPassword')}
          placeholder="Current password"
          secureTextEntry
        />

        <Text style={styles.label}>New Password</Text>
        <TextInput
          style={styles.input}
          value={form.newPassword}
          onChangeText={setField('newPassword')}
          placeholder="New password (min 6 chars)"
          secureTextEntry
        />

        <Text style={styles.label}>Confirm New Password</Text>
        <TextInput
          style={styles.input}
          value={form.confirmPassword}
          onChangeText={setField('confirmPassword')}
          placeholder="Confirm new password"
          secureTextEntry
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleChange} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Update Password</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#f7f8fa', flexGrow: 1 },
  iconWrap: { alignItems: 'center', marginBottom: 24, marginTop: 12 },
  icon: { fontSize: 44, marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#111', marginBottom: 4 },
  subtitle: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 18 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  label: { fontSize: 11, fontWeight: '700', color: '#888', marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#e8e8e8',
    borderRadius: 8,
    padding: 11,
    fontSize: 14,
    color: '#222',
    backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#111',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: '#ffde00', fontWeight: '700', fontSize: 14 },
});
