import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// IMPORTANT: Since we're not hosting, point this at your computer's local IP
// (not "localhost" — a physical/emulator device can't reach your laptop's localhost).
// Find your IP: Mac/Linux -> `ifconfig | grep inet`, Windows -> `ipconfig`
// Example: 'http://192.168.1.42:5000/api'
export const BASE_URL = 'http://192.168.1.41:5000';
export const API_URL = `${BASE_URL}/api`;

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;
