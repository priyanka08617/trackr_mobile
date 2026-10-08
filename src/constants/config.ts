// src/constants/config.ts

export const APP_CONFIG = {
  appName: "TrackR",
  appVersion: "1.0.0",

  apiVersion: "v1",

  requestTimeout: 30000,

  storageKeys: {
    company: "trackr_company",
    authToken: "trackr_auth_token",
    user: "trackr_user",
  },

  routes: {
    company: "/company",
    login: "/login",
    dashboard: "/dashboard",
  },
};

export default APP_CONFIG;
