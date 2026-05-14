import axios from "axios";
import { BASE_URL } from "./config";
import { sortNestedCollectionsByRecency } from "../utils/collections";

const getStoredToken = () =>
  localStorage.getItem("token") ||
  localStorage.getItem("authToken") ||
  localStorage.getItem("jwtToken") ||
  sessionStorage.getItem("token") ||
  sessionStorage.getItem("authToken") ||
  sessionStorage.getItem("jwtToken");

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();

    if (!config.skipAuth && token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => {
    const responseType = response?.config?.responseType;

    if (responseType && responseType !== "json") {
      return response;
    }

    response.data = sortNestedCollectionsByRecency(response.data);
    return response;
  },
  (error) => Promise.reject(error)
);

export default api;
