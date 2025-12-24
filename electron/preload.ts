import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
});

contextBridge.exposeInMainWorld('fileSystem', {
  saveFile: (sourcePath: string, rootPath: string, relativePath: string) => 
    ipcRenderer.invoke('file:save', { sourcePath, rootPath, relativePath }),
  
  // [추가] 파일 쓰기
  writeFile: (fileData: Uint8Array, fileName: string, rootPath: string, relativePath: string) =>
    ipcRenderer.invoke('file:write', { fileData, fileName, rootPath, relativePath }),

  checkFileExists: (rootPath: string, relativePath: string) =>
    ipcRenderer.invoke('file:exists', { rootPath, relativePath }),
    
  deleteFile: (rootPath: string, relativePath: string) =>
    ipcRenderer.invoke('file:delete', { rootPath, relativePath }),

  openFile: (rootPath: string, relativePath: string) =>
    ipcRenderer.invoke('file:open', { rootPath, relativePath }),

  selectDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
});