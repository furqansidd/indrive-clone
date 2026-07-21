/**
 * pricing.js
 * Pricing configurations for the inDrive Clone (PKR Specs).
 * 
 * Formula for suggested fare:
 * suggestedFare = MAX(minimumCap, baseFare + (distanceKm * ratePerKm) + (durationMin * ratePerMin))
 */
export const PRICING_CONFIG = {
  bike: {
    label: 'Bike',
    emoji: '🏍️',
    baseFare: 40,
    ratePerKm: 10,
    ratePerMin: 2,
    minimumCap: 60,
  },
  rickshaw: {
    label: 'Rickshaw',
    emoji: '🛺',
    baseFare: 60,
    ratePerKm: 18,
    ratePerMin: 3,
    minimumCap: 100,
  },
  car: {
    label: 'Mini',
    emoji: '🚗',
    baseFare: 100,
    ratePerKm: 25,
    ratePerMin: 5,
    minimumCap: 150,
  },
};
