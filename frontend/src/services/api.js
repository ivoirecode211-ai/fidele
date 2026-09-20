import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("ma_sante_access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Le token d'accès expire en 30 min (voir SIMPLE_JWT côté backend) : un
// formulaire multi-étapes le dépasse facilement. Un seul rafraîchissement
// est mené de front même si plusieurs requêtes échouent au même instant.
let refreshPromise = null;

function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${api.defaults.baseURL}/auth/refresh/`, {
        refresh: localStorage.getItem("ma_sante_refresh"),
      })
      .then(({ data }) => {
        localStorage.setItem("ma_sante_access", data.access);
        return data.access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;
    const isAuthEndpoint = config?.url?.includes("/auth/login/") || config?.url?.includes("/auth/refresh/");

    if (response?.status === 401 && !isAuthEndpoint && !config._retried && localStorage.getItem("ma_sante_refresh")) {
      config._retried = true;
      try {
        const access = await refreshAccessToken();
        config.headers.Authorization = `Bearer ${access}`;
        return api(config);
      } catch {
        localStorage.removeItem("ma_sante_access");
        localStorage.removeItem("ma_sante_refresh");
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  },
);

export default api;
