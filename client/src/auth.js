export function saveSession(token, user) {
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
}

export function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user"));
  } catch {
    return null;
  }
}

export function isLoggedIn() {
  return Boolean(localStorage.getItem("token"));
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}