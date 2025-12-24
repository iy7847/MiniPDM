import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        // [Main Process]
        entry: 'electron/main.ts',
        onstart(options) {
          options.startup();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            emptyOutDir: true,
            minify: false,
            lib: {
              entry: 'electron/main.ts',
              formats: ['cjs'],
              fileName: () => 'main.js',
            },
            rollupOptions: {
              external: ['electron', 'path', 'fs', 'url', 'child_process'],
            },
          },
        },
      },
      {
        // [Preload Script]
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            emptyOutDir: false, 
            minify: false,
            lib: {
              entry: 'electron/preload.ts',
              formats: ['cjs'],
              fileName: () => 'preload.js',
            },
            rollupOptions: {
              external: ['electron'],
            },
          },
        },
      },
    ]),
  ],
  // [핵심 수정] Electron 빌드 시 상대 경로 사용 (흰 화면 해결)
  // 이 설정이 없으면 리소스 로딩 경로가 깨져서 화면이 나오지 않습니다.
  base: './', 
  server: {
    port: 5173,
    strictPort: true,
  },
});