import axiosClient from './axiosClient';

export const listUsers = () =>
  axiosClient.get('/admin/users').then((res) => res.data);

export const createUser = (payload) =>
  axiosClient.post('/admin/users', payload).then((res) => res.data);
