import { describe, it, expect, beforeEach, vi } from 'vitest'

const handlers: Record<string, Function> = {}
const listeners: Record<string, Function> = {}

vi.mock('electron', () => ({
  ipcMain: {
    handle: vi.fn((channel: string, handler: Function) => {
      handlers[channel] = handler
    }),
    on: vi.fn((channel: string, listener: Function) => {
      listeners[channel] = listener
    })
  },
  dialog: {
    showOpenDialog: vi.fn(async () => ({ canceled: false, filePaths: ['C:\\sample.json'] })),
    showSaveDialog: vi.fn(async () => ({ canceled: false, filePath: 'C:\\exported.log' }))
  },
  shell: {
    openPath: vi.fn(async () => ''),
    writeShortcutLink: vi.fn()
  },
  app: {
    getPath: vi.fn(() => 'C:\\MockAppData'),
    getAppPath: vi.fn(() => 'C:\\MockAppPath'),
    getVersion: vi.fn(() => '1.5.3'),
    quit: vi.fn()
  },
  BrowserWindow: vi.fn(),
  Notification: {
    isSupported: vi.fn(() => false)
  }
}))

import { registerAllIpcHandlers } from '../../electron/ipc'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

describe('IPC Handlers Execution Suite', () => {
  beforeEach(() => {
    registerAllIpcHandlers()
  })

  it('should execute VPN handlers (GET_STATUS, TOGGLE_VPN, SET_APP_MODE)', async () => {
    expect(handlers[IPC_CHANNELS.GET_STATUS]).toBeDefined()
    const status = await handlers[IPC_CHANNELS.GET_STATUS]()
    expect(status).toBeDefined()

    expect(handlers[IPC_CHANNELS.TOGGLE_VPN]).toBeDefined()
    const toggleRes = await handlers[IPC_CHANNELS.TOGGLE_VPN]({}, false)
    expect(toggleRes).toBeDefined()

    expect(handlers[IPC_CHANNELS.SET_APP_MODE]).toBeDefined()
    const modeRes = await handlers[IPC_CHANNELS.SET_APP_MODE]({}, 'office')
    expect(modeRes).toEqual({ success: true, mode: 'office' })
  }, 20000)

  it('should execute Profile handlers (GET_PROFILES, SELECT_PROFILE, DELETE_PROFILE)', async () => {
    expect(handlers[IPC_CHANNELS.GET_PROFILES]).toBeDefined()
    const profiles = await handlers[IPC_CHANNELS.GET_PROFILES]({}, 'home')
    expect(Array.isArray(profiles)).toBe(true)

    expect(handlers[IPC_CHANNELS.SELECT_PROFILE]).toBeDefined()
    const selectRes = await handlers[IPC_CHANNELS.SELECT_PROFILE]({}, 'non-existent-id')
    expect(selectRes).toBeDefined()

    expect(handlers[IPC_CHANNELS.DELETE_PROFILE]).toBeDefined()
    const deleteRes = await handlers[IPC_CHANNELS.DELETE_PROFILE]({}, 'non-existent-id')
    expect(deleteRes).toBeDefined()
  })

  it('should execute Settings handlers (GET_SETTINGS, SAVE_SETTINGS)', async () => {
    expect(handlers[IPC_CHANNELS.GET_SETTINGS]).toBeDefined()
    const settings = await handlers[IPC_CHANNELS.GET_SETTINGS]()
    expect(settings).toBeDefined()

    expect(handlers[IPC_CHANNELS.SAVE_SETTINGS]).toBeDefined()
    const updated = await handlers[IPC_CHANNELS.SAVE_SETTINGS]({}, { autoStart: true })
    expect(updated.autoStart).toBe(true)
  })

  it('should execute System handlers (RUN_SYSTEM_AUDIT, TEST_LATENCY, IS_DEV_BUILD)', async () => {
    expect(handlers[IPC_CHANNELS.RUN_SYSTEM_AUDIT]).toBeDefined()
    const audit = await handlers[IPC_CHANNELS.RUN_SYSTEM_AUDIT]()
    expect(audit).toBeDefined()

    expect(handlers[IPC_CHANNELS.TEST_LATENCY]).toBeDefined()
    const latency = await handlers[IPC_CHANNELS.TEST_LATENCY]()
    expect(latency).toBeDefined()

    expect(handlers[IPC_CHANNELS.IS_DEV_BUILD]).toBeDefined()
    const isDev = await handlers[IPC_CHANNELS.IS_DEV_BUILD]()
    expect(typeof isDev).toBe('boolean')
  }, 20000)

  it('should execute Log handlers (GET_RECENT_LOGS, OPEN_LOGS_FOLDER)', async () => {
    expect(handlers[IPC_CHANNELS.GET_RECENT_LOGS]).toBeDefined()
    const logs = await handlers[IPC_CHANNELS.GET_RECENT_LOGS]()
    expect(Array.isArray(logs)).toBe(true)

    expect(handlers[IPC_CHANNELS.OPEN_LOGS_FOLDER]).toBeDefined()
    await expect(handlers[IPC_CHANNELS.OPEN_LOGS_FOLDER]()).resolves.not.toThrow()
  })

  it('should execute Updater handlers (GET_APP_VERSION, CHECK_FOR_UPDATES, START_UPDATE_DOWNLOAD)', async () => {
    expect(handlers[IPC_CHANNELS.GET_APP_VERSION]).toBeDefined()
    const version = await handlers[IPC_CHANNELS.GET_APP_VERSION]()
    expect(version).toBe('1.5.3')

    expect(handlers[IPC_CHANNELS.CHECK_FOR_UPDATES]).toBeDefined()
    const check = await handlers[IPC_CHANNELS.CHECK_FOR_UPDATES]()
    expect(check).toBeDefined()

    expect(handlers[IPC_CHANNELS.START_UPDATE_DOWNLOAD]).toBeDefined()
    const download = await handlers[IPC_CHANNELS.START_UPDATE_DOWNLOAD]()
    expect(download).toBeDefined()
  })

  it('should execute Window listeners (WINDOW_MINIMIZE, WINDOW_CLOSE)', () => {
    expect(listeners[IPC_CHANNELS.WINDOW_MINIMIZE]).toBeDefined()
    expect(() => listeners[IPC_CHANNELS.WINDOW_MINIMIZE]()).not.toThrow()

    expect(listeners[IPC_CHANNELS.WINDOW_CLOSE]).toBeDefined()
    expect(() => listeners[IPC_CHANNELS.WINDOW_CLOSE]()).not.toThrow()
  })
})
