import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { autoUpdater } from 'electron-updater'; // [추가]
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

  // [추가] 앱이 준비되고 창이 뜨면 업데이트 체크 시작 (배포 환경에서만 동작)
  mainWindow.once('ready-to-show', () => {
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ----- [자동 업데이트 이벤트 핸들러] -----
autoUpdater.on('update-available', () => {
  // 업데이트가 있음을 알림 (필요 시 렌더러로 메시지 전송 가능)
  console.log('Update available.');
});

autoUpdater.on('update-downloaded', () => {
  // 다운로드가 완료되면 사용자에게 알리고 재시작 유도
  dialog.showMessageBox({
    type: 'info',
    title: '업데이트 설치',
    message: '새로운 버전이 다운로드되었습니다. 지금 재시작하여 설치하시겠습니까?',
    buttons: ['재시작', '나중에']
  }).then((returnValue) => {
    if (returnValue.response === 0) autoUpdater.quitAndInstall();
  });
});

// ----- [기존 IPC 핸들러들] -----
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

ipcMain.handle('file:exists', async (_event, { rootPath, relativePath }) => {
  try {
    const fullPath = path.join(rootPath, relativePath);
    return fs.existsSync(fullPath);
  } catch (error) {
    return false;
  }
});

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

ipcMain.handle('dialog:openDirectory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: '파일 저장소 루트 폴더 선택',
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});