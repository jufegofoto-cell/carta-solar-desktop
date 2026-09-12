// ════════════════════════════════════════════════════════════════════
//  Carta Solar — proceso principal de Electron
//  Envuelve la aplicación HTML autocontenida (carta_solar.html) en una
//  ventana de escritorio. Electron incluye su propio Chromium: NO depende
//  de WebView2 ni de ningún runtime; corre en cualquier Windows 10+ x64.
// ════════════════════════════════════════════════════════════════════
'use strict';
const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

const APP_HTML = path.join(__dirname, '..', 'carta_solar.html');

// En Windows el .exe ya lleva el icono incrustado por electron-builder, pero
// en desarrollo (npm start) y en Linux hace falta pasarlo a la ventana. Se
// devuelve undefined si no esta, para no romper el arranque por un icono.
function iconoApp() {
  for (const p of [path.join(__dirname, '..', 'build', 'icon.ico'),
                   path.join(__dirname, '..', 'build', 'icon.png')]) {
    if (fs.existsSync(p)) return p;
  }
  return undefined;
}
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
  // Si el HTML no quedó dentro del paquete, avisar en vez de abrir una ventana
  // en blanco. Desde un .exe ya distribuido ese fallo es casi imposible de
  // diagnosticar; el mensaje apunta directo a la clave "files" de package.json.
  if (!fs.existsSync(APP_HTML)) {
    dialog.showErrorBox('Carta Solar — instalación incompleta',
      'No se encontró carta_solar.html dentro de la aplicación.\n\n' +
      'Ruta esperada:\n' + APP_HTML + '\n\n' +
      'Revise la clave "files" de package.json y que el archivo exista en la ' +
      'raíz del repositorio.');
    app.quit();
    return null;
  }

  const win = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1024, minHeight: 680,
    backgroundColor: '#f4f1ec',
    title: 'Carta Solar ' + APP_VERSION,
    icon: iconoApp(),
    show: false,
    webPreferences: {
      contextIsolation: true, nodeIntegration: false, sandbox: true,
      spellcheck: false, backgroundThrottling: false
    }
  });
  win.once('ready-to-show', () => win.show());
  configurarDescargas(win);
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

// ── Descargas: DXF y PNG ─────────────────────────────────────────────
// El HTML exporta con <a download> sobre un Blob (DXF) o un data URL (PNG).
// Sin esto Electron guarda en la carpeta de descargas sin preguntar, que no
// sirve en una herramienta de proyecto: hay que poder elegir la carpeta de la
// entrega. Los nombres ya vienen saneados a [a-z0-9_] desde el HTML, así que
// el nombre de estación del EPW no puede fabricar rutas.
function configurarDescargas(win) {
  win.webContents.session.on('will-download', (_e, item) => {
    const nombre = item.getFilename() || 'carta_solar';
    const ext = path.extname(nombre).toLowerCase();
    const filtros = {
      '.dxf': [{ name: 'Dibujo DXF (AutoCAD R12)', extensions: ['dxf'] }],
      '.png': [{ name: 'Imagen PNG', extensions: ['png'] }]
    }[ext] || [];

    item.setSaveDialogOptions({
      title: ext === '.dxf' ? 'Guardar DXF' : 'Guardar imagen',
      defaultPath: path.join(app.getPath('documents'), nombre),
      filters: filtros.concat([{ name: 'Todos los archivos', extensions: ['*'] }])
    });

    item.once('done', (_ev, estado) => {
      if (estado !== 'completed' || win.isDestroyed()) return;
      // Aviso discreto en el título: el HTML ya informa en su barra de estado,
      // así que no hace falta un diálogo modal que interrumpa.
      win.setTitle('Carta Solar — guardado: ' + path.basename(item.getSavePath()));
      setTimeout(() => {
        if (!win.isDestroyed()) win.setTitle('Carta Solar ' + APP_VERSION);
      }, 4000);
    });
  });
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
        detail: 'Carta solar bioclimática autocontenida.\n\n' +
                '· Proyecciones estereográfica, polar equidistante y cartesiana\n' +
                '· Declinación por Cooper (1969); ecuación del tiempo por Spencer (1971)\n' +
                '· Superposición climática EPW convertida a hora solar verdadera con la\n' +
                '  longitud y la zona horaria del propio archivo\n' +
                '· Confort adaptativo ASHRAE 55-2010, banda del 90 % (±2,5 K)\n' +
                '· Máscaras de sombreado: VSA del volado y HSA de las aletas\n' +
                '· Exportación a DXF R12 por capas y a PNG\n\n' +
                'Universidad de San Buenaventura - Pasto.\n\n' +
                'Electron ' + process.versions.electron +
                ' · Chromium ' + process.versions.chrome + '.',
        buttons: ['Cerrar']
      })
    }]}
  ]));
}

app.whenReady().then(() => {
  // Sin AppUserModelID, Windows agrupa la ventana bajo el icono generico de
  // Electron en la barra de tareas aunque el ejecutable lleve el suyo.
  if (process.platform === 'win32') app.setAppUserModelId('co.edu.usb.cartasolar');
  buildMenu(); createMainWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createMainWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
