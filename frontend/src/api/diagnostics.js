import axiosClient from './axiosClient';

export const getVehicleDiagnostics = (vehicleId) =>
  axiosClient.get(`/vehicles/${vehicleId}/diagnostics`).then((res) => res.data);
