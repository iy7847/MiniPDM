import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const isDev = process.env.NODE_ENV === 'development' || process.env.npm_lifecycle_event === 'electron:dev';

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(e => console.error('Failed to load URL:', e));
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 앱이 준비되고 창이 뜨면 업데이트 체크 시작 (배포 환경에서만 동작)
  mainWindow.once('ready-to-show', () => {
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// [추가] 앱 버전 반환
ipcMain.handle('app:version', () => app.getVersion());

// [수정] 업데이트 이벤트 전달 (info 포함)
autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-available', info);
});

autoUpdater.on('update-downloaded', (info) => {
  // 메인 프로세스에서 dialog를 띄우지 않고, 렌더러로 정보만 보냅니다.
  // (UI 제어권을 React로 넘김)
  mainWindow?.webContents.send('update-downloaded', info);
});

// [추가] 재시작 IPC 핸들러
ipcMain.on('restart_app', () => {
  autoUpdater.quitAndInstall();
});

// 1. 파일 저장
ipcMain.handle('file:save', async (_event, { sourcePath, rootPath, relativePath }) => {
  try {
    const destFolder = path.join(rootPath, relativePath);
    const fileName = path.basename(sourcePath);
    const destPath = path.join(destFolder, fileName);

    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }

    fs.copyFileSync(sourcePath, destPath);
    return { success: true, savedPath: destPath };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// 1-1. 파일 쓰기 (생성된 파일용)
ipcMain.handle('file:write', async (_event, { fileData, fileName, rootPath, relativePath }) => {
  try {
    const destFolder = path.join(rootPath, relativePath);
    const destPath = path.join(destFolder, fileName);

    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }

    // Uint8Array 데이터를 Buffer로 변환하여 저장
    fs.writeFileSync(destPath, Buffer.from(fileData));
    return { success: true, savedPath: destPath };
  } catch (error: any) {
    console.error('File write error:', error);
    return { success: false, error: error.message };
  }
});

// 2. 파일 존재 확인
ipcMain.handle('file:exists', async (_event, { rootPath, relativePath }) => {
  try {
    const fullPath = path.join(rootPath, relativePath);
    return fs.existsSync(fullPath);
  } catch (error) {
    return false;
  }
});

// 3. 파일 삭제
ipcMain.handle('file:delete', async (_event, { rootPath, relativePath }) => {
  try {
    const fullPath = path.join(rootPath, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// 4. 파일 열기
ipcMain.handle('file:open', async (_event, { rootPath, relativePath }) => {
  try {
    const fullPath = path.join(rootPath, relativePath);
    if (fs.existsSync(fullPath)) {
      await shell.openPath(fullPath);
      return { success: true };
    }
    return { success: false, error: 'File not found' };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});

// 5. 폴더 선택
ipcMain.handle('dialog:openDirectory', async (_event, defaultPath) => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '파일 저장소 루트 폴더 선택',
    defaultPath: defaultPath || undefined
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});