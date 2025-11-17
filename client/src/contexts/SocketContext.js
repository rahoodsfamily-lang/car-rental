import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../features/auth/AuthContext';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connecting', 'connected', 'disconnected', 'reconnecting'
  const { user, token } = useAuth();
  const heartbeatInterval = useRef(null);
  const reconnectTimeout = useRef(null);
  const maxReconnectAttempts = 10;

  // Cleanup function
  const cleanupSocket = useCallback((socketInstance) => {
    if (socketInstance) {
      // console.log('🧹 Cleaning up socket connection'); // Removed verbose log
      socketInstance.removeAllListeners();
      socketInstance.disconnect();
      socketInstance.close();
    }
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
      heartbeatInterval.current = null;
    }
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }
  }, []);

  // Heartbeat mechanism
  const startHeartbeat = useCallback((socketInstance) => {
    if (heartbeatInterval.current) {
      clearInterval(heartbeatInterval.current);
    }
    
    heartbeatInterval.current = setInterval(() => {
      if (socketInstance && socketInstance.connected) {
        socketInstance.emit('ping', { timestamp: Date.now() });
      }
    }, 30000); // Send ping every 30 seconds
  }, []);

  // Create socket connection
  const createSocket = useCallback(() => {
    if (!token || !user) {
      console.log('❌ No token or user found, skipping socket connection');
      setConnectionStatus('disconnected');
      return null;
    }

    // console.log(`🔌 Creating socket connection for user: ${user.email} (${user.role})`); // Removed verbose log
    setConnectionStatus('connecting');

    // Create socket connection with enhanced configuration
    const newSocket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      auth: {
        token,
        userId: user._id,
        userRole: user.role
      },
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
      reconnectionAttempts: maxReconnectAttempts,
      timeout: 20000,
      forceNew: true,
      transports: ['websocket', 'polling'] // Fallback to polling if websocket fails
    });

    // Connection successful
    newSocket.on('connect', () => {
      // console.log(`✅ Socket connected for ${user.email}:`, newSocket.id); // Removed verbose log
      setConnected(true);
      setConnectionStatus('connected');
      setReconnectAttempts(0);
      startHeartbeat(newSocket);
    });

    // Connection lost
    newSocket.on('disconnect', (reason) => {
      // Only log unexpected disconnects, not normal ones
      if (reason !== 'io client disconnect') {
        console.log(`❌ Socket disconnected:`, reason);
      }
      setConnected(false);
      setConnectionStatus('disconnected');
      
      if (heartbeatInterval.current) {
        clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = null;
      }

      // Auto-reconnect for certain disconnect reasons
      if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'ping timeout') {
        // console.log('🔄 Attempting to reconnect due to:', reason); // Reduced verbose logging
        setConnectionStatus('reconnecting');
        
        // Clear any existing reconnect timeout
        if (reconnectTimeout.current) {
          clearTimeout(reconnectTimeout.current);
        }
        
        // Attempt reconnection with exponential backoff
        const delay = Math.min(2000 * Math.pow(2, reconnectAttempts), 30000);
        reconnectTimeout.current = setTimeout(() => {
          if (reconnectAttempts < maxReconnectAttempts) {
            setReconnectAttempts(prev => prev + 1);
            newSocket.connect();
          } else {
            console.error('❌ Max reconnection attempts reached');
            setConnectionStatus('disconnected');
          }
        }, delay);
      }
    });

    // Connection error
    newSocket.on('connect_error', (error) => {
      console.error(`🚨 Socket connection error for ${user.email}:`, error.message);
      setConnected(false);
      setConnectionStatus('reconnecting');
      setReconnectAttempts(prev => prev + 1);
    });

    // Reconnection attempt
    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`🔄 Reconnection attempt ${attemptNumber} for ${user.email}`);
      setConnectionStatus('reconnecting');
    });

    // Reconnection successful
    newSocket.on('reconnect', (attemptNumber) => {
      console.log(`✅ Reconnected after ${attemptNumber} attempts for ${user.email}`);
      setConnected(true);
      setConnectionStatus('connected');
      setReconnectAttempts(0);
      startHeartbeat(newSocket);
    });

    // Reconnection failed
    newSocket.on('reconnect_failed', () => {
      console.error(`❌ Failed to reconnect for ${user.email}`);
      setConnected(false);
      setConnectionStatus('disconnected');
    });

    // Handle authentication errors
    newSocket.on('auth_error', (error) => {
      console.error('🔐 Socket authentication error:', error);
      setConnected(false);
      setConnectionStatus('disconnected');
      newSocket.disconnect();
    });

    // Handle pong response from server
    newSocket.on('pong', (data) => {
      const latency = Date.now() - data.timestamp;
      console.log(`🏓 Pong received, latency: ${latency}ms`);
    });

    // Handle server-initiated ping
    newSocket.on('ping', () => {
      newSocket.emit('pong', { timestamp: Date.now() });
    });

    return newSocket;
  }, [token, user, startHeartbeat, reconnectAttempts, maxReconnectAttempts]);

  useEffect(() => {
    // Clean up existing socket connection first
    if (socket) {
      cleanupSocket(socket);
      setSocket(null);
      setConnected(false);
    }

    // Create new socket connection
    const newSocket = createSocket();
    if (newSocket) {
      setSocket(newSocket);
    }

    // Cleanup function
    return () => {
      if (newSocket) {
        cleanupSocket(newSocket);
      }
    };
  }, [token, user?.id, user?.role, createSocket, cleanupSocket]); // React to authentication changes

  const value = {
    socket,
    connected,
    connectionStatus,
    reconnectAttempts,
    maxReconnectAttempts
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
