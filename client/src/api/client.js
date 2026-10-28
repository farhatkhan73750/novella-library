const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = "novella_token";
export const UNAUTHORIZED_EVENT = "novella:unauthorized";


export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);


export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// Call the server. Usage: api("/books?genre=horror") or api("/auth/login", { method: "POST", body: {...} })
export async function api(path, { method = "GET", body, auth = true } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const token = getToken();
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError("Cannot reach the server. Is it running?", 0);
  }

  // Our server always answers in JSON, but be safe if it doesn't
  let data = null;
  try {
    data = await response.json();
  } catch {
    // no JSON body
  }

    if (!response.ok) {
    // The server says our token is no good (expired, tampered, user deleted).
    // Only act if the token we sent is still the saved one, so a login that
    // happened while this request was in flight is not wiped out.
    if (response.status === 401 && auth && token && getToken() === token) {
      clearToken();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(data?.message || "Something went wrong", response.status);
  }
  return data;
}