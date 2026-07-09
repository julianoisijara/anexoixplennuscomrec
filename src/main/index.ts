import { app, shell, BrowserWindow, ipcMain, dialog, Menu } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'
import { join, dirname } from 'path'
import fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

function createMenu(): void {
  const template: MenuItemConstructorOptions[] = [
    // No macOS os menus padrão (app/editar) são necessários para atalhos como copiar/colar
    ...(process.platform === 'darwin'
      ? ([{ role: 'appMenu' }, { role: 'editMenu' }] as MenuItemConstructorOptions[])
      : []),
    {
      label: 'Sobre',
      submenu: [
        {
          label: 'Sobre o Programa',
          click: (): void => {
            const window = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
            window?.webContents.send('open-about')
          }
        }
      ]
    }
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: true,
    autoHideMenuBar: false,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('export-pdf', async (event, { defaultFileName }: { defaultFileName: string }) => {
    const webContents = event.sender
    const window = BrowserWindow.fromWebContents(webContents)
    if (!window) {
      return { canceled: true }
    }

    const configPath = join(app.getPath('userData'), 'settings.json')

    // Helper function to get the last save directory
    const getLastSaveDir = (): string => {
      try {
        if (fs.existsSync(configPath)) {
          const settings = JSON.parse(fs.readFileSync(configPath, 'utf-8'))
          if (settings && typeof settings.lastSaveDir === 'string') {
            let dir = settings.lastSaveDir
            while (dir) {
              try {
                if (fs.existsSync(dir) && fs.statSync(dir).isDirectory()) {
                  console.log('getLastSaveDir: Usando pasta recuperada:', dir)
                  return dir
                }
              } catch {
                // Ignora erros de stat para caminhos inexistentes
              }
              const parent = dirname(dir)
              if (parent === dir) break
              dir = parent
            }
          }
        }
      } catch (error) {
        console.error('Error reading settings:', error)
      }
      const defaultDir = app.getPath('documents')
      console.log('getLastSaveDir: Usando pasta padrão (Documents):', defaultDir)
      return defaultDir
    }

    // Helper function to save the last save directory
    const saveLastSaveDir = (dir: string): void => {
      try {
        const parentDir = dirname(configPath)
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true })
        }
        fs.writeFileSync(configPath, JSON.stringify({ lastSaveDir: dir }), 'utf-8')
        console.log('saveLastSaveDir: Configuração de pasta salva com sucesso:', dir)
      } catch (error) {
        console.error('Error saving settings:', error)
      }
    }

    const lastDir = getLastSaveDir()
    const defaultPath = join(lastDir, defaultFileName)
    console.log('export-pdf: defaultPath resolvido:', defaultPath)

    const { canceled, filePath } = await dialog.showSaveDialog(window, {
      title: 'Exportar PDF',
      defaultPath,
      filters: [{ name: 'Adobe PDF Document', extensions: ['pdf'] }]
    })

    if (canceled || !filePath) {
      console.log('export-pdf: Operação cancelada pelo usuário.')
      return { canceled: true }
    }

    const newDir = dirname(filePath)
    saveLastSaveDir(newDir)

    try {
      const data = await webContents.printToPDF({
        margins: {
          marginType: 'none'
        },
        pageSize: 'A4',
        printBackground: true,
        preferCSSPageSize: true
      })
      fs.writeFileSync(filePath, data)
      console.log('export-pdf: PDF gravado com sucesso em:', filePath)
      return { canceled: false, filePath }
    } catch (error) {
      console.error('Failed to write PDF:', error)
      throw error
    }
  })

  createMenu()
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
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
