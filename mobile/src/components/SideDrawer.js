import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  StatusBar,
  SafeAreaView,
} from 'react-native';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.78;

/**
 * SideDrawer – a custom animated overlay drawer.
 *
 * Props:
 *   isOpen (bool)          – controls visibility
 *   onClose (fn)           – called when backdrop tapped or close pressed
 *   user ({ name, email }) – current user info displayed at top
 *   role ('rider'|'driver') – used to show appropriate menu items
 *   onNavigate (screen)    – called with the target screen name
 *   onLogout (fn)          – called when Log Out pressed
 */
export default function SideDrawer({ isOpen, onClose, user, role, onNavigate, onLogout }) {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isOpen) {
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0.5, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateX, { toValue: -DRAWER_WIDTH, duration: 220, useNativeDriver: true }),
        Animated.timing(overlayOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start();
    }
  }, [isOpen]);

  const initials = user?.name
    ? user.name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const riderItems = [
    { icon: '🏠', label: 'Home', screen: 'RiderHome' },
    { icon: '👤', label: 'My Profile', screen: 'Profile' },
    { icon: '🚗', label: 'Ride History', screen: 'RideHistory' },
    { icon: '🔒', label: 'Change Password', screen: 'ChangePassword' },
  ];

  const driverItems = [
    { icon: '🏠', label: 'Home', screen: 'DriverHome' },
    { icon: '👤', label: 'My Profile', screen: 'Profile' },
    { icon: '🗂️', label: 'Ride History', screen: 'RideHistory' },
    { icon: '🔒', label: 'Change Password', screen: 'ChangePassword' },
  ];

  const items = role === 'driver' ? driverItems : riderItems;

  const handleNav = (screen) => {
    onClose();
    setTimeout(() => onNavigate(screen), 260);
  };

  if (!isOpen && translateX._value === -DRAWER_WIDTH) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      {/* Drawer panel */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        <SafeAreaView style={{ flex: 1 }}>
          {/* Header */}
          <View style={styles.drawerHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
            <Text style={styles.userEmail}>{user?.email || ''}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{role === 'driver' ? '🚗 Driver' : '🙋 Rider'}</Text>
            </View>
          </View>

          {/* Nav Items */}
          <View style={styles.navItems}>
            {items.map((item) => (
              <TouchableOpacity
                key={item.screen}
                style={styles.navItem}
                onPress={() => handleNav(item.screen)}
                activeOpacity={0.7}
              >
                <Text style={styles.navIcon}>{item.icon}</Text>
                <Text style={styles.navLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Logout */}
          <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  drawerHeader: {
    backgroundColor: '#111',
    padding: 24,
    paddingTop: 40,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#ffde00',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#111' },
  userName: { color: '#fff', fontSize: 16, fontWeight: '700' },
  userEmail: { color: '#aaa', fontSize: 12, marginTop: 2 },
  roleBadge: {
    marginTop: 8,
    backgroundColor: '#222',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  roleBadgeText: { color: '#ffde00', fontSize: 11, fontWeight: '700' },
  navItems: { flex: 1, paddingTop: 12 },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  navIcon: { fontSize: 20, marginRight: 14 },
  navLabel: { fontSize: 14, fontWeight: '500', color: '#222' },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginBottom: 8,
  },
  logoutIcon: { fontSize: 18, marginRight: 14 },
  logoutText: { fontSize: 14, fontWeight: '600', color: '#c0392b' },
});
