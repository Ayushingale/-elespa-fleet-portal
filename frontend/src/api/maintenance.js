import axiosClient from './axiosClient';

export const listMaintenanceRecords = () =>
  axiosClient.get('/maintenance').then((res) => res.data);

export const createMaintenanceRecord = (payload) =>
  axiosClient.post('/maintenance', payload).then((res) => res.data);
