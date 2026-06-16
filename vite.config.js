import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: Replace <REPO_NAME> with your GitHub repository name.
  // If you use a custom domain or a username.github.io repo, set base: '/'.
  base: "/vocabulary-app/",
});
