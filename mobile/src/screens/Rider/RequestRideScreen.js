import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import api from '../../api/client';
import { fetchPlacesAutocomplete, reverseGeocodeCoords, fetchDirections, geocodeAddress } from '../../api/locationiq';
import { useAuth } from '../../context/AuthContext';
import { useRide } from '../../context/RideContext';
import colors from '../../theme/colors';
import SideDrawer from '../../components/SideDrawer';
import FareSelectorWidget from '../../components/FareSelectorWidget';

export default function RequestRideScreen({ navigation }) {
  const { user, logout } = useAuth();
  const {
    pickup,
    setPickup,
    dropoff,
    setDropoff,
    distanceMeters,
    setDistanceMeters,
    durationSeconds,
    setDurationSeconds,
    selectedVehicle,
    riderBid,
    suggestedFare,
    autoAccept,
    clearRide,
  } = useRide();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const mapRef = useRef(null);
  const autocompleteTimeoutRef = useRef(null);

  // States
  const [region, setRegion] = useState(null);
  const [selecting, setSelecting] = useState('pickup'); // 'pickup' | 'dropoff'
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 'cash' | 'card' | 'wallet'
  const [routePolyline, setRoutePolyline] = useState([]);

  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(null);

  // Places Search States
  const [pickupSearch, setPickupSearch] = useState('');
  const [dropoffSearch, setDropoffSearch] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [searchType, setSearchType] = useState(null); // 'pickup' | 'dropoff' | null
  const [searchLoading, setSearchLoading] = useState(false);

  // Initial Location Fetch
  useEffect(() => {
    getInitialMapRegion();
    return () => {
      clearRide();
    };
  }, []);

  const getInitialMapRegion = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionGranted(status === 'granted');
      if (status !== 'granted') {
        const defaultRegion = {
          latitude: 31.4220,
          longitude: 73.0923,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        };
        setRegion(defaultRegion);
        return;
      }

      // Request highest GPS accuracy
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const currentCoords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      const initialReg = {
        ...currentCoords,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

      setRegion(initialReg);

      if (mapRef.current) {
        mapRef.current.animateToRegion(initialReg, 1000);
      }
    } catch (err) {
      console.error('Error getting initial map region:', err);
      setRegion({
        latitude: 31.4220,
        longitude: 73.0923,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  const getUserLocation = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionGranted(status === 'granted');
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Denied',
          'Enable location permissions in settings or search manually to set location.'
        );
        return;
      }

      // Request highest GPS accuracy
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const currentCoords = {
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      };

      const targetRegion = {
        ...currentCoords,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      };

      setRegion(targetRegion);

      // Slide/Pan map camera smoothly to user current location
      if (mapRef.current) {
        mapRef.current.animateToRegion(targetRegion, 1200);
      }

      // Reverse-geocode to get friendly name and populate input
      const addr = await reverseGeocodeCoords(currentCoords.latitude, currentCoords.longitude);
      setPickup({ ...currentCoords, address: addr });
      setPickupSearch(addr);
    } catch (err) {
      console.error('Error getting user location:', err);
      Alert.alert('GPS Error', 'Could not fetch your current GPS position. You can manually search for your pickup.');
    } finally {
      setGpsLoading(false);
    }
  };

  // Fetch route and update fare
  useEffect(() => {
    if (pickup && dropoff) {
      updateRouteAndFare();
    } else {
      setRoutePolyline([]);
    }
  }, [pickup?.latitude, pickup?.longitude, dropoff?.latitude, dropoff?.longitude]);

  const updateRouteAndFare = async () => {
    const directions = await fetchDirections(pickup, dropoff);
    let distMeters = 0;
    let durSeconds = 0;

    if (directions) {
      setRoutePolyline(directions.polylineCoordinates);
      distMeters = directions.distanceMeters;
      durSeconds = directions.durationSeconds;
      setDistanceMeters(distMeters);
      setDurationSeconds(durSeconds);

      // Zoom map to fit both markers
      if (mapRef.current) {
        mapRef.current.fitToCoordinates([pickup, dropoff], {
          edgePadding: { top: 120, right: 60, bottom: 420, left: 60 },
          animated: true,
        });
      }
    } else {
      // Fallback
      setRoutePolyline([pickup, dropoff]);
      const dist = calculateHaversineDistance(pickup, dropoff);
      distMeters = dist * 1000;
      durSeconds = dist * 1.5 * 60;
      setDistanceMeters(distMeters);
      setDurationSeconds(durSeconds);
    }
  };

  // Simple Haversine fallback formula
  const calculateHaversineDistance = (coords1, coords2) => {
    const toRad = (x) => (x * Math.PI) / 180;
    const R = 6371; // Earth's radius in km
    const dLat = toRad(coords2.latitude - coords1.latitude);
    const dLon = toRad(coords2.longitude - coords1.longitude);
    const lat1 = toRad(coords1.latitude);
    const lat2 = toRad(coords2.latitude);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Map click handling
  const onMapPress = async (e) => {
    const coord = e.nativeEvent.coordinate;
    if (selecting === 'pickup') {
      setPickup({ ...coord, address: 'Geocoding...' });
      const addr = await reverseGeocodeCoords(coord.latitude, coord.longitude);
      setPickup({ ...coord, address: addr });
      setPickupSearch(addr);
    } else {
      setDropoff({ ...coord, address: 'Geocoding...' });
      const addr = await reverseGeocodeCoords(coord.latitude, coord.longitude);
      setDropoff({ ...coord, address: addr });
      setDropoffSearch(addr);
    }
  };

  // Search input typing handler (Debounced to respect LocationIQ 2 req/sec sandbox limit)
  const handleSearchTextChange = (text, type) => {
    if (type === 'pickup') {
      setPickupSearch(text);
    } else {
      setDropoffSearch(text);
    }

    setSearchType(type);

    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    if (text.length > 2) {
      autocompleteTimeoutRef.current = setTimeout(async () => {
        setSearchLoading(true);
        const results = await fetchPlacesAutocomplete(text);
        setSuggestions(results);
        setSearchLoading(false);
      }, 600);
    } else {
      setSuggestions([]);
    }
  };

  // Select place from autocomplete
  const handleSelectSuggestion = async (item) => {
    Keyboard.dismiss();
    setSuggestions([]);
    
    const coord = { latitude: item.latitude, longitude: item.longitude, address: item.description };

    if (searchType === 'pickup') {
      setPickup(coord);
      setPickupSearch(item.description);
    } else {
      setDropoff(coord);
      setDropoffSearch(item.description);
    }

    setRegion({
      ...coord,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    });
    setSearchType(null);
  };

  // Explicitly geocode and search typed queries using autocomplete-first hybrid strategy
  const triggerSearch = async (type) => {
    const query = type === 'pickup' ? pickupSearch : dropoffSearch;
    if (!query || query.trim() === '') return;

    setSearchLoading(true);
    Keyboard.dismiss();
    setSuggestions([]);

    try {
      const predictions = await fetchPlacesAutocomplete(query);
      if (predictions && predictions.length > 0) {
        const firstPrediction = predictions[0];
        const coord = {
          latitude: firstPrediction.latitude,
          longitude: firstPrediction.longitude,
          address: firstPrediction.description,
        };

        if (type === 'pickup') {
          setPickup(coord);
          setPickupSearch(firstPrediction.description);
        } else {
          setDropoff(coord);
          setDropoffSearch(firstPrediction.description);
        }
        setRegion({
          ...coord,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
        setSearchLoading(false);
        return;
      }

      // Geocode fallback
      const result = await geocodeAddress(query);
      if (result) {
        const coord = { latitude: result.latitude, longitude: result.longitude, address: result.address };
        if (type === 'pickup') {
          setPickup(coord);
          setPickupSearch(result.address);
        } else {
          setDropoff(coord);
          setDropoffSearch(result.address);
        }
        setRegion({
          ...coord,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        });
      } else {
        Alert.alert('Location Not Found', `Could not find coordinates for "${query}". Try typing a more specific address.`);
      }
    } catch (err) {
      console.error('Geocoding search error:', err);
      Alert.alert('Error', 'An error occurred while searching for the location.');
    } finally {
      setSearchLoading(false);
    }
  };

  const submitRide = async () => {
    if (!pickup || !dropoff) {
      return Alert.alert('Select locations', 'Use the search bar or tap the map to set pickup and drop-off.');
    }
    if (!riderBid || isNaN(Number(riderBid)) || Number(riderBid) <= 0) {
      return Alert.alert('Enter a fare', 'Suggest a starting price you are willing to pay.');
    }

    setLoading(true);
    try {
      const { data } = await api.post('/rides', {
        pickup: { address: pickup.address, coordinates: [pickup.longitude, pickup.latitude] },
        dropoff: { address: dropoff.address, coordinates: [dropoff.longitude, dropoff.latitude] },
        suggestedFare: Number(riderBid),
        autoAcceptAt: autoAccept ? Number(riderBid) : null,
        vehicleType: selectedVehicle,
        paymentMethod,
      });
      navigation.replace('Bidding', { rideId: data._id });
    } catch (err) {
      Alert.alert('Error', err.response?.data?.message || err.message);
    } finally {
      setLoading(false);
    }
  };

  if (gpsLoading && !region) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Configuring map & finding location…</Text>
      </View>
    );
  }

  const activeRegion = region || {
    latitude: 31.4220,
    longitude: 73.0923,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={styles.container}>
      {/* Map View */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={activeRegion}
        onPress={onMapPress}
        showsUserLocation={permissionGranted}
      >
        {/* White Solid Path connecting Origin and Destination */}
        {routePolyline.length > 0 && (
          <Polyline coordinates={routePolyline} strokeWidth={5} strokeColor="#ffffff" />
        )}

        {pickup && (
          <Marker
            coordinate={{ latitude: pickup.latitude, longitude: pickup.longitude }}
            title="Pickup"
            description={pickup.address}
          >
            <View style={styles.pickupMarker}>
              <Ionicons name="person" size={18} color="#1c1c1c" />
            </View>
          </Marker>
        )}
        {dropoff && (
          <Marker
            coordinate={{ latitude: dropoff.latitude, longitude: dropoff.longitude }}
            title="Drop-off"
            description={dropoff.address}
          >
            <View style={styles.dropoffMarker}>
              <Ionicons name="flag" size={18} color="#1c1c1c" />
            </View>
          </Marker>
        )}
      </MapView>

      {/* Floating Header Search Panel (Exactly matching screenshot) */}
      <View style={styles.headerSearchCard}>
        {/* Pickup (Origin) */}
        <View style={styles.searchRow}>
          <TouchableOpacity onPress={() => setDrawerOpen(true)} style={styles.menuIcon}>
            <Ionicons name="person-circle-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
          <TextInput
            style={styles.headerInput}
            placeholder="Search Pickup Address..."
            placeholderTextColor={colors.textSecondary}
            value={pickupSearch}
            onChangeText={(text) => handleSearchTextChange(text, 'pickup')}
            onFocus={() => {
              setSelecting('pickup');
              setSearchType('pickup');
            }}
            onSubmitEditing={() => triggerSearch('pickup')}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.rowSearchBtn} onPress={getUserLocation}>
            <Ionicons name="locate" size={18} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.rowSearchBtn} onPress={() => triggerSearch('pickup')}>
            <Ionicons name="search" size={18} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Separator Line */}
        <View style={styles.rowSeparator} />

        {/* Drop-off (Destination) */}
        <View style={styles.searchRow}>
          <View style={styles.menuIcon}>
            <Ionicons name="flag" size={20} color="#ffffff" />
          </View>
          <TextInput
            style={styles.headerInput}
            placeholder="Search Drop-off Address..."
            placeholderTextColor={colors.textSecondary}
            value={dropoffSearch}
            onChangeText={(text) => handleSearchTextChange(text, 'dropoff')}
            onFocus={() => {
              setSelecting('dropoff');
              setSearchType('dropoff');
            }}
            onSubmitEditing={() => triggerSearch('dropoff')}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.rowSearchBtn} onPress={() => triggerSearch('dropoff')}>
            <Ionicons name="search" size={18} color="#ffffff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addDestinationBtn}>
            <Ionicons name="add" size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Places Suggestions List */}
        {searchType && suggestions.length > 0 && (
          <View style={styles.suggestionsContainer}>
            <FlatList
              data={suggestions}
              keyExtractor={(item, index) => `${item.placeId}-${index}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.suggestionItem}
                  onPress={() => handleSelectSuggestion(item)}
                >
                  <Text style={styles.suggestionText}>{item.description}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}
        {searchLoading && (
          <View style={styles.searchLoading}>
            <ActivityIndicator size="small" color={colors.accent} />
          </View>
        )}
      </View>

      {/* Floating Navigation / Action Buttons on Map */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.mapBackButton}>
        <Ionicons name="arrow-back" size={22} color="#ffffff" />
      </TouchableOpacity>

      <TouchableOpacity style={styles.mapRouteButton}>
        <Ionicons name="git-branch-outline" size={22} color="#ffffff" />
      </TouchableOpacity>

      {/* Address confirmation overlays directly on map */}
      {pickup && !dropoff && (
        <View style={[styles.addressTextCard, styles.pickupCard]}>
          <Text style={styles.cardLabel}>Pickup Address:</Text>
          <Text numberOfLines={1} style={styles.cardValue}>{pickup.address}</Text>
        </View>
      )}

      {/* Main Bottom Sheet Panel */}
      {pickup && dropoff && (
        <FareSelectorWidget loading={loading} onSubmit={submitRide} />
      )}

      {/* Rider Side Drawer */}
      <SideDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={user}
        role="rider"
        onNavigate={(screen) => navigation.navigate(screen)}
        onLogout={async () => { setDrawerOpen(false); await logout(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  map: { flex: 1 },
  loadingText: { marginTop: 10, color: colors.textPrimary },

  // Floating Header Search Card Panel (Match screenshot: bg-[#121212]/95 backdrop-blur-md)
  headerSearchCard: {
    position: 'absolute',
    top: 50,
    left: 15,
    right: 15,
    backgroundColor: 'rgba(18, 18, 18, 0.96)',
    borderRadius: 16,
    padding: 10,
    zIndex: 10,
    borderWidth: 1,
    borderColor: '#2e2e2e',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 38,
  },
  menuIcon: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInput: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    paddingHorizontal: 6,
  },
  rowSearchBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addDestinationBtn: {
    paddingLeft: 6,
    paddingRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowSeparator: {
    height: 1,
    backgroundColor: '#2e2e2e',
    marginVertical: 4,
    marginLeft: 36,
    marginRight: 10,
  },
  suggestionsContainer: {
    maxHeight: 180,
    borderTopWidth: 1,
    borderColor: '#2e2e2e',
    marginTop: 8,
  },
  suggestionItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#2e2e2e',
  },
  suggestionText: {
    fontSize: 13,
    color: '#ffffff',
  },
  searchLoading: {
    marginTop: 8,
    alignItems: 'center',
  },

  // Floating Navigation Buttons on Map
  mapBackButton: {
    position: 'absolute',
    top: 170,
    left: 15,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(18, 18, 18, 0.9)',
    borderWidth: 1,
    borderColor: '#2e2e2e',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },
  mapRouteButton: {
    position: 'absolute',
    top: 170,
    right: 15,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(18, 18, 18, 0.9)',
    borderWidth: 1,
    borderColor: '#2e2e2e',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 4,
  },

  // Address Display Overlay Cards
  addressTextCard: {
    position: 'absolute',
    left: 15,
    backgroundColor: 'rgba(42, 42, 42, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  pickupCard: {
    top: 230,
  },
  cardLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  cardValue: {
    fontSize: 12,
    color: colors.textPrimary,
  },

  // Custom Markers (White badges with dark borders)
  pickupMarker: {
    backgroundColor: '#ffffff',
    padding: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1c1c1c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  dropoffMarker: {
    backgroundColor: '#ffffff',
    padding: 6,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#1c1c1c',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
});
