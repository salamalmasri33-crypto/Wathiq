import axios from "axios";

const API_BASE_URL = "http://localhost:5280/api";

// نجهز instance من axios فيه كل الإعدادات
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Middleware لإضافة التوكن تلقائياً إذا موجود
api.interceptors.request.use(
  (config) => {
    const user = localStorage.getItem("user");
    if (user) {
      const parsedUser = JSON.parse(user);
      if (parsedUser.token) {
        config.headers.Authorization = `Bearer ${parsedUser.token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;