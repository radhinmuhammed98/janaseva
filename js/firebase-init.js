import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getDatabase, ref, push, onValue, remove } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = window.FIREBASE_CONFIG || {};

function hasConfig(config) {
  return !!(config.apiKey && config.projectId && config.databaseURL);
}

if (hasConfig(firebaseConfig)) {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const db = getDatabase(app);

  window.firebaseServices = {
    app,
    db,
    ref,
    push,
    onValue,
    remove
  };

  window.dispatchEvent(new CustomEvent("firebase-ready"));
} else {
  window.firebaseServices = null;
  window.dispatchEvent(new CustomEvent("firebase-missing-config"));
}
