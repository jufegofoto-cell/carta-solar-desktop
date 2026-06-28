// ════════════════════════════════════════════════════════════════════
//  Carta Solar — proceso principal de Electron
//  Envuelve la aplicación HTML autocontenida (carta_solar.html) en una
//  ventana de escritorio. Electron incluye su propio Chromium: NO depende
//  de WebView2 ni de ningún runtime; corre en cualquier Windows 10+ x64.
// ════════════════════════════════════════════════════════════════════
'use strict';
const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');

const APP_HTML = path.join(__dirname, '..', 'carta_solar.html');
const APP_VERSION = app.getVersion();

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) { app.quit(); }
else {
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win) { if (win.isMinimized()) win.restore(); win.focus(); }
  });
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1024, minHeight: 680,
    backgroundColor: '#f4f1ec',
    title: 'Carta Solar ' + APP_VERSION,
    show: false,
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      spellcheck: false, backgroundThrottling: false
    }
  });
  win.once('ready-to-show', () => win.show());
  win.loadFile(APP_HTML);

  // Enlaces externos → navegador del sistema; nada saca al usuario de la app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); if (/^https?:\/\//i.test(url)) shell.openExternal(url); }
  });
  return win;
}

function buildMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Archivo', submenu: [{ role: 'quit', label: 'Salir' }] },
    { label: 'Ver', submenu: [
      { role: 'reload', label: 'Recargar' },
      { role: 'forceReload', label: 'Forzar recarga' },
      { role: 'toggleDevTools', label: 'Herramientas de desarrollo' },
      { type: 'separator' },
      { role: 'resetZoom', label: 'Zoom 100%' },
      { role: 'zoomIn', label: 'Acercar' }, { role: 'zoomOut', label: 'Alejar' },
      { type: 'separator' }, { role: 'togglefullscreen', label: 'Pantalla completa' }
    ]},
    { label: 'Ayuda', submenu: [{
      label: 'Acerca de Carta Solar',
      click: () => dialog.showMessageBox({
        type: 'info', title: 'Acerca de', message: 'Carta Solar ' + APP_VERSION,
        detail: 'Carta solar bioclimática autocontenida con confort adaptativo ASHRAE 55-2010.\n' +
                'Universidad de San Buenaventura - Pasto.\n\nElectron ' + process.versions.electron + '.',
        buttons: ['Cerrar']
      })
    }]}
  ]));
}

app.whenReady().then(() => {
  buildMenu(); createMainWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
