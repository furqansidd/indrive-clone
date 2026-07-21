import React, { createContext, useContext, useState, useEffect } from 'react';
import { PRICING_CONFIG } from '../config/pricing';

const RideContext = createContext(null);

export function RideProvider({ children }) {
  const [pickup, setPickup] = useState(null);
  const [dropoff, setDropoff] = useState(null);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState('car');
  const [suggestedFare, setSuggestedFare] = useState(0);
  const [riderBid, setRiderBid] = useState(0);
  const [autoAccept, setAutoAccept] = useState(false);

  // Recalculate suggested fare when route/distance/duration or vehicle changes
  useEffect(() => {
    if (distanceMeters > 0 && durationSeconds > 0) {
      const distanceKm = distanceMeters / 1000;
      const durationMin = durationSeconds / 60;
      const config = PRICING_CONFIG[selectedVehicle];

      if (config) {
        // PKR formula: suggestedFare = MAX(minimumCap, base + (distanceKm * ratePerKm) + (durationMin * ratePerMin))
        const base = config.baseFare;
        const distCost = distanceKm * config.ratePerKm;
        const timeCost = durationMin * config.ratePerMin;
        const calculated = base + distCost + timeCost;
        const rounded = Math.max(config.minimumCap, Math.round(calculated / 10) * 10);
        
        setSuggestedFare(rounded);
        // Default rider bid to suggested fare if current bid is 0 or less than the floor of new suggested fare
        setRiderBid((prev) => {
          const floor = Math.round((rounded * 0.75) / 10) * 10;
          if (prev <= 0 || prev < floor) {
            return rounded;
          }
          return prev;
        });
      }
    } else {
      setSuggestedFare(0);
      setRiderBid(0);
    }
  }, [distanceMeters, durationSeconds, selectedVehicle]);

  const clearRide = () => {
    setPickup(null);
    setDropoff(null);
    setDistanceMeters(0);
    setDurationSeconds(0);
    setSelectedVehicle('car');
    setSuggestedFare(0);
    setRiderBid(0);
    setAutoAccept(false);
  };

  return (
    <RideContext.Provider
      value={{
        pickup,
        setPickup,
        dropoff,
        setDropoff,
        distanceMeters,
        setDistanceMeters,
        durationSeconds,
        setDurationSeconds,
        selectedVehicle,
        setSelectedVehicle,
        suggestedFare,
        setSuggestedFare,
        riderBid,
        setRiderBid,
        autoAccept,
        setAutoAccept,
        clearRide,
      }}
    >
      {children}
    </RideContext.Provider>
  );
}

export const useRide = () => useContext(RideContext);
