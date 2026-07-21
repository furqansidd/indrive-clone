import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import api from '../../api/client';

export default function RatingScreen({ route, navigation }) {
  const { rideId } = route.params;
  const [stars, setStars] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api.post('/ratings', { rideId, stars, comment });
    } catch (e) {
      // even if rating fails, let them continue
    } finally {
      setSubmitting(false);
      navigation.replace('RequestRide');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rate your ride</Text>

      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((n) => (
          <TouchableOpacity key={n} onPress={() => setStars(n)}>
            <Text style={[styles.star, n <= stars && styles.starActive]}>★</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        placeholder="Leave a comment (optional)"
        value={comment}
        onChangeText={setComment}
        multiline
      />

      <TouchableOpacity style={styles.button} onPress={submit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Submitting…' : 'Submit Rating'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.replace('RequestRide')}>
        <Text style={styles.skip}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 20 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 20 },
  star: { fontSize: 36, color: '#ddd' },
  starActive: { color: '#ffde00' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, minHeight: 80, marginBottom: 16, textAlignVertical: 'top' },
  button: { backgroundColor: '#111', padding: 14, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
  skip: { textAlign: 'center', marginTop: 16, color: '#999' },
});
