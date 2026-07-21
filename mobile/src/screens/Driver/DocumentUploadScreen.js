import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { API_URL } from '../../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FIELDS = [
  { key: 'license', label: "Driver's License" },
  { key: 'registration', label: 'Vehicle Registration' },
  { key: 'insurance', label: 'Insurance Certificate' },
];

export default function DocumentUploadScreen() {
  const [images, setImages] = useState({});
  const [uploading, setUploading] = useState(false);

  const pick = async (key) => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) {
      setImages((s) => ({ ...s, [key]: result.assets[0] }));
    }
  };

  const uploadAll = async () => {
    if (Object.keys(images).length === 0) return Alert.alert('No documents selected');
    setUploading(true);
    try {
      const token = await AsyncStorage.getItem('token');
      const formData = new FormData();
      Object.entries(images).forEach(([key, asset]) => {
        formData.append(key, {
          uri: asset.uri,
          name: `${key}.jpg`,
          type: 'image/jpeg',
        });
      });

      const res = await fetch(`${API_URL}/drivers/documents`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      Alert.alert('Submitted', 'Your documents were submitted for admin review.');
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Verification Documents</Text>
      <Text style={styles.subtitle}>Upload clear photos. An admin will review and approve them.</Text>

      {FIELDS.map((f) => (
        <View key={f.key} style={styles.field}>
          <Text style={styles.label}>{f.label}</Text>
          <TouchableOpacity style={styles.picker} onPress={() => pick(f.key)}>
            {images[f.key] ? (
              <Image source={{ uri: images[f.key].uri }} style={styles.preview} />
            ) : (
              <Text style={styles.pickerText}>Tap to select photo</Text>
            )}
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity style={styles.button} onPress={uploadAll} disabled={uploading}>
        <Text style={styles.buttonText}>{uploading ? 'Uploading…' : 'Submit for Review'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#777', marginTop: 4, marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { fontWeight: '600', marginBottom: 6 },
  picker: { height: 140, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  pickerText: { color: '#999' },
  preview: { width: '100%', height: '100%' },
  button: { backgroundColor: '#111', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
