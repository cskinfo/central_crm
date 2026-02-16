// src/Auth.js (frontend)
export const isAuthenticated = () => {
  const token = localStorage.getItem("token");
  if (!token) return false;

  try {
    // Verify token hasn't expired (without verifying signature)
    const decoded = JSON.parse(atob(token.split(".")[1]));
    if (decoded.exp < Date.now() / 1000) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

export const getUserRole = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    return user?.role;
  } catch {
    return null;
  }
};

export const getAuthHeader = () => {
  const token = localStorage.getItem("token");
  if (!token) return {};

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
};

// Additional helper function to get user ID
export const getUserId = () => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    return user?.id;
  } catch {
    return null;
  }
};
