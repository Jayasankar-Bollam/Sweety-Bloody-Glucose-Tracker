const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function api(path, { method = "GET", body } = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

   if (res.status === 401 && token && !path.startsWith("/auth/")) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }

  return data;
}