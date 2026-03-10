import axios from "axios";

const api = axios.create({
  baseURL: "",                 // CRA proxy handles /api/* → localhost:8080
  headers: { "Content-Type": "application/json" },
});

// Attach token on every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("mp_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("mp_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
