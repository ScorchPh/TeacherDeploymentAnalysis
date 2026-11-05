const { app, BrowserWindow, ipcMain, Menu, shell } = require('electron')
const path = require('node:path')
const fs = require('node:fs')

const DATA_FILENAME = 'tna-database.json'

function getDataFilePath() {
  return path.join(app.getPath('userData'), DATA_FILENAME)
}

function createWindow() {
  const iconCandidate = fs.existsSync(path.join(__dirname, '../dist/logo.ico'))
    ? path.join(__dirname, '../dist/logo.ico')
    : path.join(__dirname, '../public/logo.ico')

  const win = new BrowserWindow({
    width: 1400,
    height: 880,
    minWidth: 1024,
    minHeight: 680,
    title: 'DepEd TNA - Teacher Needs Analysis',
    icon: iconCandidate,
    backgroundColor: '#f8fafc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  const menuTemplate = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Local Database Folder',
          click: () => {
            const filePath = getDataFilePath()
            if (fs.existsSync(filePath)) {
              shell.showItemInFolder(filePath)
            } else {
              shell.openPath(app.getPath('userData'))
            }
          },
        },
        { type: 'separator' },
        { role: 'quit', label: 'Exit' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(menuTemplate))

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

ipcMain.handle('tna:load-data', async () => {
  try {
    const filePath = getDataFilePath()
    if (!fs.existsSync(filePath)) {
      return { ok: true, data: null }
    }
    const raw = fs.readFileSync(filePath, 'utf-8')
    return { ok: true, data: JSON.parse(raw) }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

ipcMain.handle('tna:save-data', async (_event, payload) => {
  try {
    const dir = app.getPath('userData')
    fs.mkdirSync(dir, { recursive: true })
    const filePath = getDataFilePath()
    const tmpPath = `${filePath}.tmp`
    fs.writeFileSync(tmpPath, JSON.stringify(payload, null, 2), 'utf-8')
    fs.renameSync(tmpPath, filePath)
    return { ok: true, path: filePath }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

ipcMain.handle('tna:get-data-path', async () => {
  return getDataFilePath()
})

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

