import React, { createContext, useContext, useReducer } from 'react';
import axiosInstance from '../../utils/axiosConfig';

const BookingContext = createContext();

const initialState = {
  bookings: [],
  booking: null,
  loading: false,
  error: null,
};

const bookingReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return {
        ...state,
        loading: true,
        error: null,
      };
    case 'CLEAR_LOADING':
      return {
        ...state,
        loading: false,
      };
    case 'SET_ERROR':
      return {
        ...state,
        loading: false,
        error: action.payload,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    case 'GET_USER_BOOKINGS':
      return {
        ...state,
        bookings: action.payload,
        loading: false,
        error: null,
      };
    case 'GET_BOOKING':
      return {
        ...state,
        booking: action.payload,
        loading: false,
        error: null,
      };
    case 'CREATE_BOOKING':
      return {
        ...state,
        bookings: [...(state.bookings || []), action.payload],
        booking: action.payload,
        loading: false,
        error: null,
      };
    case 'CANCEL_BOOKING':
      return {
        ...state,
        bookings: (state.bookings || []).map(booking => 
          booking && booking._id === action.payload ? { ...booking, status: 'cancelled' } : booking
        ),
        booking: state.booking && state.booking._id === action.payload ? { ...state.booking, status: 'cancelled' } : state.booking,
        loading: false,
        error: null,
      };
    case 'DELETE_BOOKING':
      return {
        ...state,
        bookings: (state.bookings || []).filter(booking => booking && booking._id !== action.payload),
        booking: state.booking && state.booking._id === action.payload ? null : state.booking,
        loading: false,
        error: null,
      };
    case 'GET_ALL_BOOKINGS':
      return {
        ...state,
        bookings: action.payload,
        loading: false,
        error: null,
      };
    case 'UPDATE_BOOKING_STATUS':
      // Validate payload exists and has _id
      if (!action.payload || !action.payload._id) {
        console.error('UPDATE_BOOKING_STATUS: Invalid payload', action.payload);
        return {
          ...state,
          loading: false,
          error: 'Invalid booking data received',
        };
      }
      
      const updatedBookings = (state.bookings || []).map(b => b && b._id === action.payload._id ? action.payload : b);
      
      return {
        ...state,
        bookings: updatedBookings,
        loading: false,
        error: null,
      };
    default:
      return state;
  }
};

export const BookingProvider = ({ children }) => {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  // Get all bookings for a user
  const getUserBookings = async (userId, isRefresh = false) => {
    if (!userId) {
      return { success: false, message: 'Missing userId' };
    }
    try {
      // Only set loading on initial load, not refresh
      if (!isRefresh) {
        dispatch({ type: 'SET_LOADING' });
      }
      
      // Start timer for minimum loading time to prevent flicker
      const startTime = Date.now();
      const minLoadingTime = 500; // 500ms minimum
      
      const res = await axiosInstance.get(`/api/bookings/user/${userId}`);
      
      // Calculate remaining time to meet minimum loading time
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
      
      // Wait for remaining time if needed
      if (remainingTime > 0 && !isRefresh) {
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      dispatch({
        type: 'GET_USER_BOOKINGS',
        payload: res.data.data,
      });
      
      return res.data;
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err.response?.data?.message || 'Error fetching bookings',
      });
      
      return err.response?.data || { success: false, message: 'Error fetching bookings' };
    } finally {
      if (!isRefresh) {
        dispatch({ type: 'CLEAR_LOADING' });
      }
    }
  };

  // Get booking by ID
  const getBookingById = async (id) => {
    try {
      dispatch({ type: 'SET_LOADING' });
      
      const res = await axiosInstance.get(`/api/bookings/${id}`);
      
      dispatch({
        type: 'GET_BOOKING',
        payload: res.data.data,
      });
      
      return res.data.data; // Return the booking data directly
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err.response?.data?.message || 'Error fetching booking',
      });
      
      throw err; // Throw error so component can handle it
    } finally {
      dispatch({ type: 'CLEAR_LOADING' });
    }
  };

  // Create a new booking
  const createBooking = async (bookingData) => {
    try {
      dispatch({ type: 'SET_LOADING' });
      
      const res = await axiosInstance.post('/api/bookings', bookingData);
      
      dispatch({
        type: 'CREATE_BOOKING',
        payload: res.data.data,
      });
      
      return res.data;
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err.response?.data?.message || 'Error creating booking',
      });
      
      return err.response?.data || { success: false, message: 'Error creating booking' };
    } finally {
      dispatch({ type: 'CLEAR_LOADING' });
    }
  };

  // Cancel a booking
  const cancelBooking = async (id, cancellationReason = '') => {
    try {
      dispatch({ type: 'SET_LOADING' });
      
      const res = await axiosInstance.put(`/api/bookings/${id}/cancel`, {
        cancellationReason
      });
      
      dispatch({
        type: 'CANCEL_BOOKING',
        payload: id,
      });
      
      return res.data;
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err.response?.data?.message || 'Error cancelling booking',
      });
      
      return err.response?.data || { success: false, message: 'Error cancelling booking' };
    } finally {
      dispatch({ type: 'CLEAR_LOADING' });
    }
  };

  // Delete booking (admin only)
  const deleteBooking = async (id) => {
    try {
      dispatch({ type: 'SET_LOADING' });
      
      const res = await axiosInstance.delete(`/api/bookings/${id}`);
      
      dispatch({
        type: 'DELETE_BOOKING',
        payload: id,
      });
      
      return res.data;
    } catch (err) {
      dispatch({
        type: 'SET_ERROR',
        payload: err.response?.data?.message || 'Error deleting booking',
      });
      
      return err.response?.data || { success: false, message: 'Error deleting booking' };
    } finally {
      dispatch({ type: 'CLEAR_LOADING' });
    }
  };

  // Get all bookings (admin)
  const getAllBookings = async () => {
    try {
      dispatch({ type: 'SET_LOADING' });
      const res = await axiosInstance.get('/api/bookings');
      dispatch({ type: 'GET_ALL_BOOKINGS', payload: res.data.data });
      return res.data;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.response?.data?.message || 'Error fetching bookings' });
      return err.response?.data || { success: false, message: 'Error fetching bookings' };
    } finally {
      dispatch({ type: 'CLEAR_LOADING' });
    }
  };

  // Update booking status (admin)
  const updateBookingStatus = async (bookingId, status) => {
    try {
      dispatch({ type: 'SET_LOADING' });
      const response = await axiosInstance.put(`/api/bookings/${bookingId}/status`, { status });
      dispatch({ type: 'UPDATE_BOOKING_STATUS', payload: response.data.data });
      return response.data;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.response?.data?.message || 'Error updating status' });
      return err.response?.data || { success: false, message: 'Error updating status' };
    } finally {
      dispatch({ type: 'CLEAR_LOADING' });
    }
  };

  // Update booking details (dates and locations)
  const updateBooking = async (bookingId, updateData) => {
    try {
      dispatch({ type: 'SET_LOADING' });
      const response = await axiosInstance.put(`/api/bookings/${bookingId}`, updateData);
      dispatch({ type: 'UPDATE_BOOKING_STATUS', payload: response.data.data });
      return response.data;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err.response?.data?.message || 'Error updating booking' });
      throw err;
    } finally {
      dispatch({ type: 'CLEAR_LOADING' });
    }
  };

  return (
    <BookingContext.Provider
      value={{
        ...state,
        getUserBookings,
        getBookingById,
        createBooking,
        cancelBooking,
        deleteBooking,
        getAllBookings,
        updateBookingStatus,
        updateBooking,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBooking = () => {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within a BookingProvider');
  }
  return context;
};
