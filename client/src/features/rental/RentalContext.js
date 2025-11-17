import React, { createContext, useContext, useReducer, useEffect } from 'react';
import axiosInstance from '../../utils/axiosConfig';

const RentalContext = createContext();

const initialState = {
  rentals: [],
  userRentals: [],
  currentRental: null,
  loading: false,
  error: null,
};

const rentalReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };
    case 'SET_RENTALS':
      return {
        ...state,
        rentals: action.payload,
        loading: false,
        error: null,
      };
    case 'SET_USER_RENTALS':
      return {
        ...state,
        userRentals: action.payload,
        loading: false,
        error: null,
      };
    case 'SET_CURRENT_RENTAL':
      return {
        ...state,
        currentRental: action.payload,
        loading: false,
        error: null,
      };
    case 'CREATE_RENTAL':
      return {
        ...state,
        rentals: [...state.rentals, action.payload],
        userRentals: [...state.userRentals, action.payload],
        currentRental: action.payload,
        loading: false,
        error: null,
      };
    case 'UPDATE_RENTAL':
      return {
        ...state,
        rentals: state.rentals.map(rental =>
          rental._id === action.payload._id ? action.payload : rental
        ),
        userRentals: state.userRentals.map(rental =>
          rental._id === action.payload._id ? action.payload : rental
        ),
        currentRental: action.payload,
        loading: false,
        error: null,
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    default:
      return state;
  }
};

export const RentalProvider = ({ children }) => {
  const [state, dispatch] = useReducer(rentalReducer, initialState);

  // Get all rentals (admin only)
  const getAllRentals = async (filters = {}) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const queryString = new URLSearchParams(filters).toString();
      const res = await axiosInstance.get(`/api/rentals?${queryString}`);
      
      dispatch({ type: 'SET_RENTALS', payload: res.data });
      return res.data;
    } catch (error) {
      // Don't show error if it's just empty data (404)
      if (error.response?.status !== 404) {
        dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Error loading rental data' });
      } else {
        dispatch({ type: 'SET_RENTALS', payload: [] }); // Set empty array for no data
      }
      throw error;
    }
  };

  // Get rental by ID
  const getRentalById = async (id) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const res = await axiosInstance.get(`/api/rentals/${id}`);
      
      dispatch({ type: 'SET_CURRENT_RENTAL', payload: res.data });
      return res.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Error fetching rental' });
      throw error;
    }
  };

  // Get user rentals
  const getUserRentals = async (isRefresh = false) => {
    try {
      // Only set loading on initial load, not refresh
      if (!isRefresh) {
        dispatch({ type: 'SET_LOADING', payload: true });
      }
      
      // Start timer for minimum loading time to prevent flicker
      const startTime = Date.now();
      const minLoadingTime = 500; // 500ms minimum
      
      const res = await axiosInstance.get('/api/rentals/user');
      
      // Calculate remaining time to meet minimum loading time
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      // Wait for remaining time if needed
      if (remainingTime > 0 && !isRefresh) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      dispatch({ type: 'SET_USER_RENTALS', payload: res.data.data });
      return res.data;
    } catch (error) {
      console.error('Error fetching user rentals:', error);
      // Don't show error if it's just empty data (404)
      if (error.response?.status !== 404) {
        dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Error fetching user rentals' });
      } else {
        dispatch({ type: 'SET_USER_RENTALS', payload: [] }); // Set empty array for no data
      }
      throw error;
    }
  };

  // Create rental (check-out)
  const createRental = async (bookingId, checkOutDate, notes, onSuccess) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const res = await axiosInstance.post(`/api/rentals/${bookingId}/checkout`, {
        checkOutDate,
        notes
      });
      
      dispatch({ type: 'CREATE_RENTAL', payload: res.data });
      
      // Call success callback if provided (for notification refresh)
      if (onSuccess) {
        setTimeout(() => onSuccess(), 100);
      }
      
      return res.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Error creating rental' });
      throw error;
    }
  };

  // Complete rental (check-in)
  const completeRental = async (id, checkInDate, lateFee, damageFee, notes, onSuccess) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const res = await axiosInstance.put(`/api/rentals/${id}/checkin`, {
        checkInDate,
        lateFee,
        damageFee,
        notes
      });
      
      dispatch({ type: 'UPDATE_RENTAL', payload: res.data });
      
      // Call success callback if provided (for notification refresh)
      if (onSuccess) {
        setTimeout(() => onSuccess(), 100);
      }
      
      return res.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Error completing rental' });
      throw error;
    }
  };

  // Update rental status
  const updateRentalStatus = async (id, rentalStatus, lateFee, damageFee, notes, onSuccess) => {
    try {
      // Do not globally set loading; caller can manage row-level spinners

      
      const res = await axiosInstance.put(`/api/rentals/${id}`, {
        rentalStatus,
        lateFee,
        damageFee,
        notes
      });
      
      dispatch({ type: 'UPDATE_RENTAL', payload: res.data });
      
      // Call success callback if provided (for notification refresh)
      if (onSuccess) {
        setTimeout(() => onSuccess(), 100);
      }
      
      return res.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Error updating rental status' });
      throw error;
    }
  };

  // Generate rental invoice
  const generateInvoice = async (id) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const res = await axiosInstance.get(`/api/rentals/${id}/invoice`);
      
      dispatch({ type: 'SET_CURRENT_RENTAL', payload: res.data });
      return res.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Error generating invoice' });
      throw error;
    }
  };

  // Download rental invoice PDF
  const downloadInvoice = async (id) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      const res = await axiosInstance.get(`/api/rentals/${id}/invoice/download`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rental_invoice_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode.removeChild(link);
      
      dispatch({ type: 'SET_LOADING', payload: false });
      return res.data;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.response?.data?.message || 'Error downloading invoice' });
      throw error;
    }
  };

  return (
    <RentalContext.Provider
      value={{
        ...state,
        getAllRentals,
        getRentalById,
        getUserRentals,
        createRental,
        completeRental,
        updateRentalStatus,
        generateInvoice,
        downloadInvoice,
        fetchRentals: getAllRentals,
      }}
    >
      {children}
    </RentalContext.Provider>
  );
};

export const useRental = () => {
  const context = useContext(RentalContext);
  if (!context) {
    throw new Error('useRental must be used within a RentalProvider');
  }
  return context;
};
