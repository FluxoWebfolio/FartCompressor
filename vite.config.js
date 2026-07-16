import { defineConfig } from "vite";
import wasm from "vite-plugin-wasm";
import topLevelAwait from "vite-plugin-top-level-await";

const host = process.env.TAURI_DEV_HOST;

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        wasm(),
        topLevelAwait()
    ],
    optimizeDeps: {
        exclude: ['@jsquash/avif', '@jsquash/jpeg', '@jsquash/resize', '@jsquash/webp', '@jsquash/png', '@jsquash/oxipng']
    },
    worker: {
        format: "es",
    },
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host
            ? {
                protocol: "ws",
                host,
                port: 1421,
            }
            : undefined,
        watch: {
            // 3. tell vite to ignore watching `src-tauri`
            ignored: ["**/src-tauri/**"],
        },
    },
});
