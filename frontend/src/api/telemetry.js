import axiosClient from './axiosClient';

// Historical telemetry only. Live telemetry comes from the useWebSocket hook,
// subscribed per vehicle over /ws/telemetry.
export const getHistoricalTelemetry = (vehicleId, { from, to } = {}) =>
  axiosClient
    .get(`/vehicles/${vehicleId}/telemetry`, { params: { from, to } })
    .then((res) => res.data);
