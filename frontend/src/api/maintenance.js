import axiosClient from './axiosClient';

export const listMaintenanceRecords = (params) =>
  axiosClient.get('/maintenance', { params }).then((res) => res.data);

export const createMaintenanceRecord = (payload) =>
  axiosClient.post('/maintenance', payload).then((res) => res.data);

export const updateMaintenanceRecord = (id, payload) =>
  axiosClient.patch(`/maintenance/${id}`, payload).then((res) => res.data);

export const deleteMaintenanceRecord = (id) =>
  axiosClient.delete(`/maintenance/${id}`).then((res) => res.data);
