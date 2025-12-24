import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
});

contextBridge.exposeInMainWorld('fileSystem', {
  saveFile: (sourcePath: string, rootPath: string, relativePath: string) => 
    ipcRenderer.invoke('file:save', { sourcePath, rootPath, relativePath }),
  
  checkFileExists: (rootPath: string, relativePath: string) =>
    ipcRenderer.invoke('file:exists', { rootPath, relativePath }),
    
  deleteFile: (rootPath: string, relativePath: string) =>
    ipcRenderer.invoke('file:delete', { rootPath, relativePath }),

  openFile: (rootPath: string, relativePath: string) =>
    ipcRenderer.invoke('file:open', { rootPath, relativePath }),

  // [추가] 폴더 선택
  selectDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
});