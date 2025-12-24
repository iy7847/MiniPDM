import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 1. 파일 복사 (기존 파일)
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

// [추가] 1-1. 파일 쓰기 (생성된 파일용)
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
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});