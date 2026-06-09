import { api } from "./client";

export const roomsApi = {
  list: async () => {
    const data = await api.get("/api/rooms/?skip=0&limit=100");
    return data?.rooms ?? [];
  },
  create: (data) => api.post("/api/rooms/", data),
  update: (name, data) => api.put(`/api/rooms/${encodeURIComponent(name)}`, data),
  remove: (name) => api.delete(`/api/rooms/${encodeURIComponent(name)}`),
};
