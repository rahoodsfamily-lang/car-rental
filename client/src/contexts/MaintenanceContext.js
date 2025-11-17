import React, { createContext, useState, useContext, useCallback } from 'react';
import axiosInstance from '../utils/axiosConfig';
import { useToast } from '../components/feedback/ToastProvider';

const MaintenanceContext = createContext();

export const useMaintenanceContext = () => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error('useMaintenanceContext must be used within a MaintenanceProvider');
  }
  return context;
};

export const MaintenanceProvider = ({ children }) => {
  const { showToast } = useToast();
  const [maintenanceRecords, setMaintenanceRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalRecords: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    totalCost: 0,
    urgentCount: 0,
    overdueCount: 0
  });

  const token = localStorage.getItem('token');
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Fetch all maintenance records
  const fetchMaintenanceRecords = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const response = await axiosInstance.get(
        `${API_URL}/api/maintenance${queryParams ? `?${queryParams}` : ''}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      // Ensure we always have an array
      const records = Array.isArray(response.data) 
        ? response.data 
        : (response.data.data || response.data.records || []);
      setMaintenanceRecords(records);
      return records;
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
      toast.error('Failed to fetch maintenance records');
      return [];
    } finally {
      setLoading(false);
    }
  }, [token, API_URL]);

  // Fetch maintenance statistics
  const fetchMaintenanceStats = useCallback(async () => {
    try {
      const response = await axiosInstance.get(
        `${API_URL}/api/maintenance/stats`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Process the backend response to match frontend expectations
      const data = response.data.data || response.data;
      
      // Extract counts from status distribution
      const statusCounts = {};
      if (data.statusDistribution) {
        data.statusDistribution.forEach(item => {
          statusCounts[item.status] = item.count;
        });
      }
      
      // Extract counts from priority distribution
      const priorityCounts = {};
      if (data.priorityDistribution) {
        data.priorityDistribution.forEach(item => {
          priorityCounts[item.priority] = item.count;
        });
      }
      
      // Build the stats object in the format the frontend expects
      const processedStats = {
        scheduled: statusCounts.scheduled || 0,
        inProgress: statusCounts.in_progress || 0,
        completed: statusCounts.completed || 0,
        cancelled: statusCounts.cancelled || 0,
        urgentCount: data.summary?.activeUrgentCount || 0,  // Use active urgent count from backend
        totalCost: data.costAnalysis?.totalCost || 0,
        averageCost: data.costAnalysis?.averageCost || 0,
        totalRecords: data.summary?.totalRecords || 0,
        pendingMaintenance: data.summary?.pendingMaintenance || 0,
        completedThisMonth: data.summary?.completedThisMonth || 0
      };
      
      setStats(processedStats);
      return processedStats;
    } catch (error) {
      console.error('Error fetching maintenance stats:', error);
      return stats;
    }
  }, [token, API_URL, stats]);

  // Create new maintenance record
  const createMaintenanceRecord = useCallback(async (maintenanceData) => {
    setLoading(true);
    try {
      const response = await axiosInstance.post(
        `${API_URL}/api/maintenance`,
        maintenanceData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      showToast('Maintenance record created successfully', { severity: 'success' });
      await fetchMaintenanceRecords();
      await fetchMaintenanceStats();
      return response.data;
    } catch (error) {
      console.error('Error creating maintenance record:', error);
      showToast(error.response?.data?.message || 'Failed to create maintenance record', { severity: 'error' });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [token, API_URL, fetchMaintenanceRecords]);

  // Update maintenance record
  const updateMaintenanceRecord = useCallback(async (id, updateData) => {
    setLoading(true);
    try {
      const response = await axiosInstance.patch(
        `${API_URL}/api/maintenance/${id}`,
        updateData,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      showToast('Maintenance record updated successfully', { severity: 'success' });
      await fetchMaintenanceRecords();
      await fetchMaintenanceStats();
      return response.data;
    } catch (error) {
      console.error('Error updating maintenance record:', error);
      showToast(error.response?.data?.message || 'Failed to update maintenance record', { severity: 'error' });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [token, API_URL, fetchMaintenanceRecords]);

  // Delete maintenance record
  const deleteMaintenanceRecord = useCallback(async (id) => {
    setLoading(true);
    try {
      await axiosInstance.delete(
        `${API_URL}/api/maintenance/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      showToast('Maintenance record deleted successfully', { severity: 'success' });
      await fetchMaintenanceRecords();
    } catch (error) {
      console.error('Error deleting maintenance record:', error);
      showToast(error.response?.data?.message || 'Failed to delete maintenance record', { severity: 'error' });
      throw error;
    } finally {
      setLoading(false);
    }
  }, [token, API_URL, fetchMaintenanceRecords]);

  // Schedule routine maintenance
  const scheduleRoutineMaintenance = useCallback(async (carId, maintenanceData) => {
    setLoading(true);
    try {
      const response = await axiosInstance.post(
        `${API_URL}/api/maintenance/schedule-routine`,
        { carId, ...maintenanceData },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Routine maintenance scheduled successfully');
      await fetchMaintenanceRecords();
      return response.data;
    } catch (error) {
      console.error('Error scheduling routine maintenance:', error);
      toast.error(error.response?.data?.message || 'Failed to schedule routine maintenance');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [token, API_URL, fetchMaintenanceRecords]);

  const value = {
    maintenanceRecords,
    loading,
    stats,
    fetchMaintenanceRecords,
    fetchMaintenanceStats,
    createMaintenanceRecord,
    updateMaintenanceRecord,
    deleteMaintenanceRecord,
    scheduleRoutineMaintenance
  };

  return (
    <MaintenanceContext.Provider value={value}>
      {children}
    </MaintenanceContext.Provider>
  );
};

export default MaintenanceContext;
