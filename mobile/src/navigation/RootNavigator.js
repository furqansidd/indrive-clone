import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '../context/AuthContext';
import { RideProvider } from '../context/RideContext';

import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';

import RequestRideScreen from '../screens/Rider/RequestRideScreen';
import BiddingScreen from '../screens/Rider/BiddingScreen';
import TrackRideScreen from '../screens/Rider/TrackRideScreen';
import RatingScreen from '../screens/Rider/RatingScreen';

import DriverHomeScreen from '../screens/Driver/DriverHomeScreen';
import ActiveRideScreen from '../screens/Driver/ActiveRideScreen';
import DocumentUploadScreen from '../screens/Driver/DocumentUploadScreen';

// Shared screens
import ChatScreen from '../screens/Shared/ChatScreen';
import ProfileScreen from '../screens/Shared/ProfileScreen';
import RideHistoryScreen from '../screens/Shared/RideHistoryScreen';
import ChangePasswordScreen from '../screens/Shared/ChangePasswordScreen';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function RiderStack() {
  return (
    <RideProvider>
      <Stack.Navigator>
        <Stack.Screen name="RiderHome" component={RequestRideScreen} options={{ title: 'Request a Ride' }} />
        <Stack.Screen name="RequestRide" component={RequestRideScreen} options={{ title: 'Request a Ride' }} />
        <Stack.Screen name="Bidding" component={BiddingScreen} options={{ title: 'Driver Offers' }} />
        <Stack.Screen name="TrackRide" component={TrackRideScreen} options={{ title: 'Your Ride' }} />
        <Stack.Screen name="Rating" component={RatingScreen} options={{ title: 'Rate Your Ride', headerBackVisible: false }} />
        <Stack.Screen name="Chat" component={ChatScreen} />
        {/* Side Drawer shared screens */}
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
        <Stack.Screen name="RideHistory" component={RideHistoryScreen} options={{ title: 'Ride History' }} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
      </Stack.Navigator>
    </RideProvider>
  );
}

function DriverStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="DriverHome" component={DriverHomeScreen} options={{ title: 'Ride Requests' }} />
      <Stack.Screen name="ActiveRide" component={ActiveRideScreen} options={{ title: 'Active Ride' }} />
      <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} options={{ title: 'Documents' }} />
      <Stack.Screen name="Chat" component={ChatScreen} />
      {/* Side Drawer shared screens */}
      <Stack.Screen name="Profile" component={ProfileScreen} options={{ title: 'My Profile' }} />
      <Stack.Screen name="RideHistory" component={RideHistoryScreen} options={{ title: 'Ride History' }} />
      <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Change Password' }} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {!user ? <AuthStack /> : user.role === 'driver' ? <DriverStack /> : <RiderStack />}
    </NavigationContainer>
  );
}
