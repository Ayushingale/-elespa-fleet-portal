import axiosClient from './axiosClient';

export const listVehicles = () =>
  axiosClient.get('/vehicles').then((res) => res.data);

export const getVehicle = (id) =>
  axiosClient.get(`/vehicles/${id}`).then((res) => res.data);

export const registerVehicle = (payload) =>
  axiosClient.post('/vehicles', payload).then((res) => res.data);
