import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import axiosInstance from '../../utils/axiosConfig';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../../components/feedback/ToastProvider';

const FavoritesContext = createContext();

export const useFavorites = () => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};

export const FavoritesProvider = ({ children }) => {
  const { user, token } = useAuth();
  const toast = useToast();
  const [favorites, setFavorites] = useState([]);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user's favorites
  const fetchFavorites = useCallback(async () => {
    if (!user || !token) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axiosInstance.get(`/api/favorites/user/${user._id || user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setFavorites(response.data);
      // Create a Set of car IDs for quick lookup
      const ids = new Set(response.data.map(fav => fav.car._id || fav.car.id));
      setFavoriteIds(ids);
    } catch (err) {
      console.error('Error fetching favorites:', err);
      setError(err.response?.data?.message || 'Failed to fetch favorites');
    } finally {
      setLoading(false);
    }
  }, [user, token]);

  // Add a car to favorites
  const addToFavorites = useCallback(async (carId, notes = '') => {
    if (!user || !token) {
      toast.error('Please login to save favorites');
      return false;
    }

    try {
      const response = await axiosInstance.post(
        '/api/favorites/add',
        { carId, notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setFavorites(prev => [...prev, response.data.favorite]);
      setFavoriteIds(prev => new Set([...prev, carId]));
      
      toast.success('Added to favorites!');
      return true;
    } catch (err) {
      console.error('Error adding to favorites:', err);
      toast.error(err.response?.data?.message || 'Failed to add to favorites');
      return false;
    }
  }, [user, token]);

  // Remove a car from favorites
  const removeFromFavorites = useCallback(async (carId) => {
    if (!user || !token) return false;

    try {
      await axiosInstance.delete(`/api/favorites/remove/${carId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Update local state
      setFavorites(prev => prev.filter(fav => fav.car._id !== carId && fav.car.id !== carId));
      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(carId);
        return newSet;
      });
      
      toast.success('Removed from favorites');
      return true;
    } catch (err) {
      console.error('Error removing from favorites:', err);
      toast.error(err.response?.data?.message || 'Failed to remove from favorites');
      return false;
    }
  }, [user, token]);

  // Toggle favorite status
  const toggleFavorite = useCallback(async (carId, carData = null) => {
    if (!user || !token) {
      toast.info('Please login to save favorites');
      return false;
    }

    const isFavorited = favoriteIds.has(carId);
    
    if (isFavorited) {
      return await removeFromFavorites(carId);
    } else {
      return await addToFavorites(carId);
    }
  }, [user, token, favoriteIds, addToFavorites, removeFromFavorites]);

  // Update favorite notes
  const updateFavoriteNotes = useCallback(async (carId, notes) => {
    if (!user || !token) return false;

    try {
      const response = await axiosInstance.put(
        `/api/favorites/notes/${carId}`,
        { notes },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setFavorites(prev => prev.map(fav => 
        (fav.car._id === carId || fav.car.id === carId) 
          ? { ...fav, notes } 
          : fav
      ));
      
      toast.success('Notes updated');
      return true;
    } catch (err) {
      console.error('Error updating notes:', err);
      toast.error('Failed to update notes');
      return false;
    }
  }, [user, token]);

  // Check if a car is favorited
  const isFavorited = useCallback((carId) => {
    return favoriteIds.has(carId);
  }, [favoriteIds]);

  // Get favorite by car ID
  const getFavoriteByCarId = useCallback((carId) => {
    return favorites.find(fav => fav.car._id === carId || fav.car.id === carId);
  }, [favorites]);

  // Clear favorites on logout
  useEffect(() => {
    if (!user) {
      setFavorites([]);
      setFavoriteIds(new Set());
    }
  }, [user]);

  // Fetch favorites when user logs in
  useEffect(() => {
    if (user && token) {
      fetchFavorites();
    }
  }, [user, token, fetchFavorites]);

  const value = {
    favorites,
    favoriteIds,
    loading,
    error,
    fetchFavorites,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    updateFavoriteNotes,
    isFavorited,
    getFavoriteByCarId,
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};
