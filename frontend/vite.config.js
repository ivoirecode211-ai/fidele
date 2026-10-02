import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Bibliothèques utilisées partout, dans des fichiers à part : le navigateur les garde en cache d'une mise à jour
// à l'autre. jspdf n'y figure pas : il n'est téléchargé qu'à l'impression (import dynamique).
const VENDORS = {
  react: ["react", "react-dom", "react-router-dom", "scheduler"],
  icones: ["lucide-react"],
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // L'interface et l'API sur le même port : le navigateur appelle /api, Vite le relaie au backend.
    // (« frontend run » fixe VITE_API_URL=/api pour l'utiliser.)
    proxy: {
      "/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/media": { target: "http://127.0.0.1:8000", changeOrigin: true }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const match = id.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)\//);
          if (!match) return undefined;
          return Object.keys(VENDORS).find((name) => VENDORS[name].includes(match[1]));
        }
      }
    }
  }
});
