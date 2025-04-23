// Configuration file for the client-side application
export const config = {
  API_URL: import.meta.env.VITE_API_URL || "http://localhost:8000",
  APP_URL: import.meta.env.VITE_APP_URL || "http://localhost:3000",
};
