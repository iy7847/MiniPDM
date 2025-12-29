import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  app: () => ipcRenderer.invoke('app:version'),
});

contextBridge.exposeInMainWorld('fileSystem', {
  // 1. 파일 저장 (복사)
  saveFile: (sourcePath: string, rootPath: string, relativePath: string) => 
    ipcRenderer.invoke('file:save', { sourcePath, rootPath, relativePath }),
  
  // 2. 파일 쓰기 (생성)
  writeFile: (fileData: Uint8Array, fileName: string, rootPath: string, relativePath: string) =>
    ipcRenderer.invoke('file:write', { fileData, fileName, rootPath, relativePath }),

  // 3. 파일 존재 확인
  checkFileExists: (rootPath: string, relativePath: string) =>
    ipcRenderer.invoke('file:exists', { rootPath, relativePath }),
    
  // 4. 파일 삭제
  deleteFile: (rootPath: string, relativePath: string) =>
    ipcRenderer.invoke('file:delete', { rootPath, relativePath }),

  // 5. 파일 열기 (실행)
  openFile: (rootPath: string, relativePath: string) =>
    ipcRenderer.invoke('file:open', { rootPath, relativePath }),

  // 6. 폴더 선택 다이얼로그
  selectDirectory: (defaultPath?: string) => 
    ipcRenderer.invoke('dialog:openDirectory', defaultPath),

  // [추가] 7. 이미지 파일 선택 다이얼로그 (경로 반환)
  selectImage: () => ipcRenderer.invoke('dialog:openImage'),

  // [추가] 8. 이미지 파일 읽기 (Base64 반환 - 화면 표시용)
  readImage: (path: string) => ipcRenderer.invoke('file:readBase64', path),
});

contextBridge.exposeInMainWorld('updater', {
  // 업데이트 이벤트 리스너 (정보 전달 포함)
  onUpdateAvailable: (callback: (info: any) => void) => ipcRenderer.on('update-available', (_event, info) => callback(info)),
  onUpdateDownloaded: (callback: (info: any) => void) => ipcRenderer.on('update-downloaded', (_event, info) => callback(info)),
  // 재시작 명령 전송
  restart: () => ipcRenderer.send('restart_app'),
});