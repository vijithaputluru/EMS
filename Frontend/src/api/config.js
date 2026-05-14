const API_ORIGIN = (
  import.meta.env.VITE_API_ORIGIN ||
  "http://3.108.78.39:5007/api"
).replace(/\/+$/, "");

export const SERVER_URL = API_ORIGIN;
export const BASE_URL = `${API_ORIGIN}/api`;
