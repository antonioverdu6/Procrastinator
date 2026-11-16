const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow = null;
let pythonProcess = null;

function startBackendIfNeeded() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const backendScript = path.join(__dirname, '../backend/run.py');

  if (fs.existsSync(backendScript)) {
    try {
      pythonProcess = spawn('python', [backendScript], {
        cwd: path.join(__dirname, '../backend'),
        stdio: 'ignore',
        detached: false
      });
      console.log('Servidor FastAPI iniciado en segundo plano');
    } catch (e) {
      console.warn('No se pudo arrancar el proceso de Python automáticamente:', e);
    }
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1240,
    height: 840,
    minWidth: 960,
    minHeight: 680,
    title: 'Procrastinator',
    backgroundColor: '#F8FAFC',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  const distPath = path.join(__dirname, '../dist/index.html');

  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Iniciar backend si no hay otro proceso corriendo
  startBackendIfNeeded();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  if (pythonProcess) {
    pythonProcess.kill();
  }
});

// IPC Handler para notificaciones nativas de Windows
ipcMain.handle('show-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
    return true;
  }
  return false;
});
