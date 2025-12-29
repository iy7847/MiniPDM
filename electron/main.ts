import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import path from 'path';
import fs from 'fs';

// [설정] 로그 레벨 설정
autoUpdater.logger = log;
log.transports.file.level = 'info';

// [중요] 코드 서명 검증 무시 (개인 개발자 인증서 없는 경우 필수)
(autoUpdater as any).verifyUpdateCodeSignature = false;

log.info('App starting...');

let mainWindow: BrowserWindow | null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 900,
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

  // 앱이 준비되면 업데이트 체크 시작
  mainWindow.once('ready-to-show', () => {
    if (!isDev) {
      log.info('Checking for updates...');
      autoUpdater.checkForUpdatesAndNotify();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------
// [추가] 자동 업데이트 상세 로그 및 이벤트 처리
// ---------------------------------------------------------

autoUpdater.on('checking-for-update', () => {
  log.info('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info);
  mainWindow?.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  log.info('Update not available:', info);
});

autoUpdater.on('error', (err) => {
  log.error('Error in auto-updater:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = "Download speed: " + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
  log.info(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded');
  mainWindow?.webContents.send('update-downloaded', info);
});

// 재시작 요청 처리
ipcMain.on('restart_app', () => {
  log.info('Quitting and installing...');
  autoUpdater.quitAndInstall(true, true); // true, true: 강제 종료 및 즉시 설치
});

// [추가] 앱 버전 반환
ipcMain.handle('app:version', () => app.getVersion());


// ---------------------------------------------------------
// 기존 파일 시스템 핸들러 (유지)
// ---------------------------------------------------------

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
    log.error('file:save error', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('file:write', async (_event, { fileData, fileName, rootPath, relativePath }) => {
  try {
    const destFolder = path.join(rootPath, relativePath);
    const destPath = path.join(destFolder, fileName);

    if (!fs.existsSync(destFolder)) {
      fs.mkdirSync(destFolder, { recursive: true });
    }

    fs.writeFileSync(destPath, Buffer.from(fileData));
    return { success: true, savedPath: destPath };
  } catch (error: any) {
    log.error('file:write error', error);
    return { success: false, error: error.message };
  }
});

// [추가] 이미지 파일을 Base64로 읽어오기 (화면 표시용)
ipcMain.handle('file:readBase64', async (_event, filePath) => {
  try {
    if (!fs.existsSync(filePath)) return null;
    const fileData = fs.readFileSync(filePath);
    // 확장자에 따른 MIME 타입 추론 (간단하게)
    const ext = path.extname(filePath).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    
    // Base64 문자열 반환
    return `data:${mimeType};base64,${fileData.toString('base64')}`;
  } catch (error) {
    console.error('File read error:', error);
    return null;
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

// 이미지 파일 선택 핸들러
ipcMain.handle('dialog:openImage', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] }],
    title: '이미지 선택 (로고/직인)',
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