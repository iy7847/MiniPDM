import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  app: () => ipcRenderer.invoke('app:version'),
});

contextBridge.exposeInMainWorld('fileSystem', {
  saveFile: (sourcePath: string, rootPath: string, relativePath: string) => 
    ipcRenderer.invoke('file:save', { sourcePath, rootPath, relativePath }),
  
  writeFile: (fileData: Uint8Array, fileName: string, rootPath: string, relativePath: string) =>
    ipcRenderer.invoke('file:write', { fileData, fileName, rootPath, relativePath }),

  checkFileExists: (rootPath: string, relativePath: string) =>
    ipcRenderer.invoke('file:exists', { rootPath, relativePath }),
    
  deleteFile: (rootPath: string, relativePath: string) =>
    ipcRenderer.invoke('file:delete', { rootPath, relativePath }),

  openFile: (rootPath: string, relativePath: string) =>
    ipcRenderer.invoke('file:open', { rootPath, relativePath }),

  selectDirectory: (defaultPath?: string) => 
    ipcRenderer.invoke('dialog:openDirectory', defaultPath),
});

contextBridge.exposeInMainWorld('updater', {
  onUpdateAvailable: (callback: any) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback: any) => ipcRenderer.on('update-downloaded', callback),
  restart: () => ipcRenderer.send('restart_app'),
});