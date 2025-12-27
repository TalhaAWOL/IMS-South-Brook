import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const LocationContext = createContext();

export function LocationProvider({ children }) {
  const [locations, setLocations] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const response = await api.get('/locations');
      setLocations(response.data);
      // Set first location as default if none selected
      if (response.data.length > 0 && !currentLocation) {
        const saved = localStorage.getItem('currentLocationId');
        const savedLocation = saved ? response.data.find(l => l.id === parseInt(saved)) : null;
        setCurrentLocation(savedLocation || response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectLocation = (location) => {
    setCurrentLocation(location);
    localStorage.setItem('currentLocationId', location.id);
  };

  return (
    <LocationContext.Provider value={{
      locations,
      currentLocation,
      selectLocation,
      loading,
      refreshLocations: fetchLocations
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
}
