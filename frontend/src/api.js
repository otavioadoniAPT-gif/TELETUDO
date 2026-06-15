import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Desempacota a resposta no formato { success, data, error }
function unwrap(promise) {
  return promise.then(
    (res) => {
      if (res.data && res.data.success) {
        return res.data.data;
      }
      throw new Error((res.data && res.data.error) || 'Erro desconhecido.');
    },
    (err) => {
      const msg =
        err.response && err.response.data && err.response.data.error
          ? err.response.data.error
          : err.message || 'Erro de comunicação com o servidor.';
      throw new Error(msg);
    }
  );
}

export const experts = {
  list: () => unwrap(api.get('/experts')),
  get: (id) => unwrap(api.get(`/experts/${id}`)),
  create: (data) => unwrap(api.post('/experts', data)),
  update: (id, data) => unwrap(api.put(`/experts/${id}`, data)),
  remove: (id) => unwrap(api.delete(`/experts/${id}`)),
  chats: (id) => unwrap(api.get(`/experts/${id}/chats`)),
  addChat: (id, data) => unwrap(api.post(`/experts/${id}/chats`, data)),
  removeChat: (id, chatId) => unwrap(api.delete(`/experts/${id}/chats/${chatId}`)),
  test: (id, chat_id) => unwrap(api.post(`/experts/${id}/test`, chat_id ? { chat_id } : {})),
};

export const messages = {
  list: (params) => unwrap(api.get('/messages', { params })),
  get: (id) => unwrap(api.get(`/messages/${id}`)),
  history: (params) => unwrap(api.get('/messages/history', { params })),
  create: (formData) =>
    unwrap(api.post('/messages', formData, { headers: { 'Content-Type': 'multipart/form-data' } })),
  sendNow: (id) => unwrap(api.post(`/messages/${id}/send-now`)),
  remove: (id) => unwrap(api.delete(`/messages/${id}`)),
};

export const dashboard = {
  stats: () => unwrap(api.get('/dashboard/stats')),
};

export default api;
