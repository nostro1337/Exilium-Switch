import { describe, it, expect, beforeEach, vi } from 'vitest'
import path from 'node:path'
import fs from 'node:fs'

const handlers: Record<string, Function> = {}

const tempFilePath = path.join(process.cwd(), 'temp_test_profile.json')
const tempInvalidPath = path.join(process.cwd(), 'temp_invalid_profile.json')

let dialogOpenResult = { canceled: false, filePaths: [tempFilePath] }
let dialogSaveResult = { canceled: false, filePath: path.join(process.cwd(), 'temp_exported_logs.log') }

vi.mock('electron', () => {
  class MockBrowserWindow {
    public isDestroyed = vi.fn(() => false)
    public isMinimized = vi.fn(() => false)
    public isVisible = vi.fn(() => false)
    public show = vi.fn()
    public focus = vi.fn()
    public restore = vi.fn()
    public hide = vi.fn()
    public close = vi.fn()
    public loadURL = vi.fn()
    public loadFile = vi.fn()
    public on = vi.fn()
    public once = vi.fn()
    public webContents = { send: vi.fn() }
  }

  return {
    BrowserWindow: MockBrowserWindow,
    ipcMain: {
      handle: vi.fn((channel: string, handler: Function) => {
        handlers[channel] = handler
      }),
      on: vi.fn()
    },
    dialog: {
      showOpenDialog: vi.fn(async () => dialogOpenResult),
      showSaveDialog: vi.fn(async () => dialogSaveResult)
    },
    app: {
      getPath: vi.fn(() => 'C:\\MockAppData'),
      getAppPath: vi.fn(() => 'C:\\MockAppPath'),
      getVersion: vi.fn(() => '1.5.3'),
      quit: vi.fn()
    },
    shell: {
      openPath: vi.fn(async () => '')
    }
  }
})

import { registerProfilesIpc } from '../../electron/ipc/profiles.ipc'
import { registerLogsIpc } from '../../electron/ipc/logs.ipc'
import { WindowManager } from '../../electron/core/window-manager'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

describe('Profiles & Logs IPC Deep Branch Coverage', () => {
  beforeEach(() => {
    fs.writeFileSync(tempFilePath, JSON.stringify({
      log: { level: 'info' },
      outbounds: [{ type: 'vless', tag: 'proxy-out' }]
    }))
    fs.writeFileSync(tempInvalidPath, 'not a valid json')

    WindowManager.getInstance().createWindow()
    registerProfilesIpc()
    registerLogsIpc()
  })

  it('should handle import-profile dialog file selection and import successfully', async () => {
    dialogOpenResult = { canceled: false, filePaths: [tempFilePath] }
    const res = await handlers[IPC_CHANNELS.IMPORT_PROFILE]({}, 'home')
    expect(res).toBeDefined()
    expect(res.success).toBe(true)
  })

  it('should handle import-profile when user cancels dialog', async () => {
    dialogOpenResult = { canceled: true, filePaths: [] }
    const res = await handlers[IPC_CHANNELS.IMPORT_PROFILE]({}, 'home')
    expect(res).toEqual({ success: false, error: 'Импорт отменен' })
  })

  it('should handle import-profile with invalid JSON content', async () => {
    dialogOpenResult = { canceled: false, filePaths: [tempInvalidPath] }
    const res = await handlers[IPC_CHANNELS.IMPORT_PROFILE]({}, 'home')
    expect(res.success).toBe(false)
  })

  it('should handle import-vless-link IPC successfully', async () => {
    const validLink = 'vless://uuid-1234@89.124.94.246:443?type=tcp&security=reality&pbk=test#Deep-IPC-Test'
    const res = await handlers[IPC_CHANNELS.IMPORT_VLESS_LINK]({}, validLink, 'home')
    expect(res.success).toBe(true)
    expect(res.profile).toBeDefined()
  })

  it('should handle export-logs when file path selected', async () => {
    dialogSaveResult = { canceled: false, filePath: path.join(process.cwd(), 'temp_exported_logs.log') }
    const res = await handlers[IPC_CHANNELS.EXPORT_LOGS]()
    expect(res).toBeDefined()
    expect(res.success).toBe(true)
  })

  it('should handle export-logs when user cancels save dialog', async () => {
    dialogSaveResult = { canceled: true, filePath: '' }
    const res = await handlers[IPC_CHANNELS.EXPORT_LOGS]()
    expect(res).toEqual({ success: false, error: 'Отменено пользователем' })
  })
})
