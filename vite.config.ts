import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
    plugins: [react()],
    build: {
        lib: {
            entry: path.resolve(__dirname, "src/index.tsx"), // Obsidian プラグインのエントリ
            formats: ["cjs"], // CommonJS 出力
            fileName: () => "main.js",
            cssFileName: "styles", //obsidian指定
        },
        outDir: ".", //"dist",
        sourcemap: true,
        emptyOutDir: false,
        rollupOptions: {
            external: ["obsidian", "fs", "path", "os"], // バンドルに含めない依存
            output: {
                exports: "default",
            },
        },
    },
});
