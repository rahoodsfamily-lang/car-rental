import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import axiosInstance from '../../utils/axiosConfig';

const NotificationContext = createContext();

export const useNotifications = () => {
  return useContext(NotificationContext);
};

export const NotificationProvider = ({ children }) => {
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const hasInitiallyLoaded = React.useRef(false);

  // Get notifications for user
  const fetchNotifications = useCallback(async (userId, isPolling = false) => {
    if (!userId || !token) return [];
    try {
      // Only show loading on initial fetch, not during polling
      if (!isPolling) {
        setLoading(true);
      }
      const response = await axiosInstance.get(`/api/notifications/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newNotifications = response.data.data || [];
      
      // Smart merge to prevent flickering
      setNotifications(prevNotifications => {
        // If it's the initial fetch or arrays are different lengths, replace entirely
        if (!isPolling || prevNotifications.length !== newNotifications.length) {
          return newNotifications;
        }
        
        // Check if there are actual changes
        const hasChanges = newNotifications.some((newNotif, index) => {
          const oldNotif = prevNotifications[index];
          return !oldNotif || 
                 oldNotif._id !== newNotif._id || 
                 oldNotif.seen !== newNotif.seen ||
                 oldNotif.message !== newNotif.message;
        });
        
        // Only update if there are actual changes
        return hasChanges ? newNotifications : prevNotifications;
      });
      
      return newNotifications;
    } catch (error) {
      // Handle error silently - notifications are not critical
      return [];
    } finally {
      if (!isPolling) {
        setLoading(false);
      }
    }
  }, [token]);

  // Get unread notification count
  const fetchUnreadCount = useCallback(async (userId) => {
    if (!userId || !token) return 0;
    try {
      const response = await axiosInstance.get(`/api/notifications/${userId}/count`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Ensure count is always a number (not a string)
      const count = parseInt(response.data.count) || 0;
      setUnreadCount(count);
      return response.data.count;
    } catch (error) {
      // Handle error silently - notification count is not critical
      return 0;
    }
  }, [token]);

  // Mark notification as seen
  const markAsSeen = useCallback(async (notificationId) => {
    try {
      await axiosInstance.put(`/api/notifications/${notificationId}/seen`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === notificationId ? { ...n, seen: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      // Handle error silently - marking as seen is not critical
    }
  }, [token]);

  // Mark all notifications as seen
  const markAllAsSeen = useCallback(async (userId) => {
    try {
      await axiosInstance.put(`/api/notifications/${userId}/seen-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Use functional update to avoid stale closure
      setNotifications(prev => prev.map(notification => ({ ...notification, seen: true })));
      setUnreadCount(0);
    } catch (error) {
      throw error; // Re-throw so the caller can handle it
    }
  }, [token]);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await axiosInstance.delete(`/api/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      // If the deleted notification was unread, decrease the unread count
      const deletedNotification = notifications.find(n => n._id === notificationId);
      if (deletedNotification && !deletedNotification.seen) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      // Handle error silently - deleting notification is not critical
    }
  }, [token, notifications]);

  // Add a new notification to the list
  const addNotification = useCallback((notification) => {
    setNotifications(prev => [notification, ...prev]);
    // Bump unread count for all notifications including booking confirmations
    if (!notification.seen) {
      setUnreadCount(prev => prev + 1);
    }
  }, [notifications]);

  // Auto-fetch notifications when user logs in or changes
  useEffect(() => {
    if (user && token) {
      const userId = user._id || user.id;
      if (userId && !hasInitiallyLoaded.current) {
        // Initial fetch only once
        const loadInitialData = async () => {
          try {
            setLoading(true);
            await fetchNotifications(userId);
            await fetchUnreadCount(userId);
            setLastFetchTime(Date.now());
            hasInitiallyLoaded.current = true;
          } catch (error) {
            console.error('Error loading initial notifications:', error);
          } finally {
            setLoading(false);
          }
        };
        
        loadInitialData();
      }
    } else {
      // Clear notifications when user logs out
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      hasInitiallyLoaded.current = false;
    }
  }, [user?._id, user?.id, token, fetchNotifications, fetchUnreadCount]); // Need to include functions

  // Real-time notification updates via WebSocket
  useEffect(() => {
    if (!socket || !user) return;

    const handleNewNotification = (data) => {
      // Add new notification to the list
      setNotifications(prev => [data.notification, ...prev]);
      
      // Increment unread count if notification is unread
      if (!data.notification.seen) {
        setUnreadCount(prev => prev + 1);
      }
    };

    socket.on('newNotification', handleNewNotification);

    return () => {
      socket.off('newNotification', handleNewNotification);
    };
  }, [socket, user]);

  // Refresh notifications when window regains focus
  useEffect(() => {
    const handleFocus = async () => {
      if (user && token) {
        const userId = user._id || user.id;
        if (userId && lastFetchTime && Date.now() - lastFetchTime > 3000) {
          // Only refresh if last fetch was more than 3 seconds ago
          try {
            await fetchNotifications(userId, true); // isPolling = true to prevent loading spinner
            await fetchUnreadCount(userId);
            setLastFetchTime(Date.now());
          } catch (error) {
            console.error('Error refreshing notifications on focus:', error);
          }
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user?._id, user?.id, token, lastFetchTime]); // Functions are stable with useCallback

  const contextValue = useMemo(() => ({
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    fetchUnreadCount,
    markAsSeen,
    markAllAsSeen,
    deleteNotification,
    addNotification: (n) => setNotifications(prev => [n, ...prev])
  }), [notifications, unreadCount, loading, fetchNotifications, fetchUnreadCount, markAsSeen, markAllAsSeen, deleteNotification]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
};
