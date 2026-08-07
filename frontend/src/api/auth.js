import axiosClient from './axiosClient';

export const login = (credentials) =>
  axiosClient.post('/auth/login', credentials).then((res) => res.data);

export const getCurrentUser = () =>
  axiosClient.get('/auth/me').then((res) => res.data);

export const logout = () => axiosClient.post('/auth/logout');
