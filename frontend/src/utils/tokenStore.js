// JWT is kept in memory only, never in localStorage, to reduce XSS exposure.
// Trade-off: a hard page refresh logs the user out unless/until CSE-IOT-05
// supports refresh tokens via an httpOnly cookie.

let token = null;

export function setToken(newToken) {
  token = newToken;
}

export function getToken() {
  return token;
}

export function clearToken() {
  token = null;
}
