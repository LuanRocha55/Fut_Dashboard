const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

// Melhora a nitidez em telas High-DPI
app.commandLine.appendSwitch('high-dpi-support', '1');
app.commandLine.appendSwitch('force-device-scale-factor', '1');

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "Fut Dashboard Pro",
    backgroundColor: '#0f172a', // Cor de fundo do seu dashboard
    icon: path.join(__dirname, 'assets/icon.png'), // Se tiver um ícone
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });

  // Remove a barra de menu padrão (opcional, deixa mais limpo)
  win.setMenuBarVisibility(false);

  win.loadFile('index.html');
  // Abre o DevTools automaticamente para ajudar na depuração inicial
  win.webContents.openDevTools();

  // Habilita atalhos para abrir/fechar o console (F12 e Ctrl+Shift+I)
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12' || (input.control && input.shift && input.key.toLowerCase() === 'i')) {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });
}

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
