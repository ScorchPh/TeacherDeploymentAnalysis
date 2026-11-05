const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  loadData: () => ipcRenderer.invoke('tna:load-data'),
  saveData: (data) => ipcRenderer.invoke('tna:save-data', data),
  getDataPath: () => ipcRenderer.invoke('tna:get-data-path'),
})

