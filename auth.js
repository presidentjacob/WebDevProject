const AUTH_TOKEN_KEY = "sortio-auth-token";

function getToken() {
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

function setToken(token) {
  if (!token) {
    return;
  }
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(options.headers || {})
    }
  });

  const rawText = await response.text();
  let payload = {};
  try {
    payload = rawText ? JSON.parse(rawText) : {};
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const message = payload.error || rawText || `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload;
}

function requireSignedIn(redirectTo = "index.html") {
  if (!getToken()) {
    window.location.href = redirectTo;
    return false;
  }
  return true;
}
