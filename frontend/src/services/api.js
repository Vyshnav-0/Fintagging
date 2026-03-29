import axios from "axios";

// Use same-origin API by default; CRA dev server proxies `/api` to backend.
const baseURL = process.env.REACT_APP_API_URL || "/api";

const api = axios.create({
  baseURL,
});

export function withAuth(token) {
  if (!token) {
    return {};
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
}

export default api;
