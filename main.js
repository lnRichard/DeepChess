/* eslint-disable no-unused-vars */
/* eslint-disable no-undef */
// Modules to control application life and create native browser window
require('@electron/remote/main').initialize()
const { app, BrowserWindow, ipcMain, nativeTheme } = require("electron")
const path = require("path")

// Load electron reload extension
require("electron-reload")(__dirname, {
  ignored: /data|[/\\]\./,
  electron: path.join(__dirname, "node_modules", ".bin", "electron"),
  hardResetMethod: "exit"
});

// Load file system
const fs = require("fs");
const root = "./data";

// Create default files
mkDirectory(root);
mkStore(root + "/account.json");
mkStore(root + "/settings.json", JSON.stringify({ hue: 200, elo: 250, dynamic_elo: true, dark_mode: nativeTheme.shouldUseDarkColors }));

// Create a store
function mkStore(path, json = "{}") {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(path, json);
  }
}

// Create directory
function mkDirectory(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, {
      recursive: true
    });
  }
}

// Check if user is logged in
function isLoggedIn() {
  let account = JSON.parse(fs.readFileSync(root + "/account.json"));
  if (account["username"] && account["password"]) {
    return true;
  }
}

// Create the electron process
function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    frame: true,
    sandbox: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
    }
  })

  // Load file based on login state
  if (isLoggedIn()) mainWindow.loadFile("./src/html/menu.html");
  else mainWindow.loadFile("./src/html/index.html")

  // Sync system theme
  ipcMain.handle("dark-mode:system", () => {
    nativeTheme.themeSource = "system"
  })

  // Enable remote module
  require("@electron/remote/main").enable(mainWindow.webContents);
}

// Create window when ready
app.whenReady().then(() => {
  createWindow()

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when window is closed
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit()
})

// Enable SharedArrayBuffer for compatibility with Electron
app.commandLine.appendSwitch("enable-features", "SharedArrayBuffer")
