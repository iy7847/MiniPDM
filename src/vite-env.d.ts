/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// [핵심] Window 객체 확장 - 모든 페이지에서 공통으로 사용
interface Window {
  fileSystem: {
    saveFile: (sourcePath: string, rootPath: string, relativePath: string) => Promise<{ success: boolean; savedPath?: string; error?: string }>;
    writeFile: (fileData: Uint8Array, fileName: string, rootPath: string, relativePath: string) => Promise<{ success: boolean; savedPath?: string; error?: string }>;
    checkFileExists: (rootPath: string, relativePath: string) => Promise<boolean>;
    deleteFile: (rootPath: string, relativePath: string) => Promise<{ success: boolean; error?: string }>;
    openFile: (rootPath: string, relativePath: string) => Promise<{ success: boolean; error?: string }>;
    selectDirectory: (defaultPath?: string) => Promise<string | null>;
    selectImage: () => Promise<string | null>;
    readImage: (path: string) => Promise<string | null>;
  };
}