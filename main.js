/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
// Modules to control application life and create native browser window
const {app, BrowserWindow, ipcMain, nativeTheme} = require('electron')
const path = require('path')

require('electron-reload')(__dirname, {
  electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
  hardResetMethod: 'exit'
});

// Load file system
const fs = require("fs");
const root = "./data";

mkDir(root);
mkStore(root+"/account.json");
mkStore(root+"/settings.json");
mkStore(root+"/stats.json", JSON.stringify({wins: 0, losses: 0, elo: 700}));

function mkStore(path, json="{}") {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, json);
  }
}

function mkDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
        recursive: true
    });
  }
}

function isLoggedIn() {
  let account = JSON.parse(fs.readFileSync(root+"/account.json"));
  if (account["username"] && account["password"]) {
    return true;
  }
}

// Create the electron process
function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    frame: true,
    webPreferences: {
      // preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  })

  if (isLoggedIn() === true) {
    // Load the main.html if the user is logged in
    mainWindow.loadFile('./src/html/menu.html')
  } else {
    // or load the index.html of the app.
    mainWindow.loadFile('./src/html/index.html')
  }

  // Sync system theme
  ipcMain.handle('dark-mode:system', () => {
    nativeTheme.themeSource = 'system'
  })
  
  // Open the DevTools.
  // mainWindow.webContents.openDevTools()
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
