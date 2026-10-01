import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Bibliothèques dans des fichiers à part : le navigateur les garde en cache d'une mise à jour à l'autre.
const VENDORS = {
  react: ["react", "react-dom", "react-router-dom", "scheduler"],
  pdf: ["jspdf", "jspdf-autotable"],
  icones: ["lucide-react"],
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173
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
