import axiosClient from './axiosClient';

export const listDiagnostics = (params) =>
  axiosClient.get('/diagnostics', { params }).then((res) => res.data);

export const getVehicleDiagnostics = (vehicleId) =>
  axiosClient.get(`/vehicles/${vehicleId}/diagnostics`).then((res) => res.data);

export const createDiagnostic = (payload) =>
  axiosClient.post('/diagnostics', payload).then((res) => res.data);

export const updateDiagnostic = (id, payload) =>
  axiosClient.patch(`/diagnostics/${id}`, payload).then((res) => res.data);

export const resolveDiagnostic = (id, resolved = true) =>
  axiosClient.patch(`/diagnostics/${id}`, { resolved }).then((res) => res.data);

export const deleteDiagnostic = (id) =>
  axiosClient.delete(`/diagnostics/${id}`).then((res) => res.data);

export const runVehicleScan = (vehicleId) =>
  axiosClient.post(`/vehicles/${vehicleId}/scan`).then((res) => res.data);
