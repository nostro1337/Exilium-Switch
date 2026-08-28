import { describe, it, expect, beforeEach, vi } from 'vitest'

const eventListeners: Record<string, Function> = {}
let mockWindowInstance: any

vi.mock('electron', () => {
  class MockBrowserWindow {
    public isDestroyed = vi.fn(() => false)
    public isMinimized = vi.fn(() => true)
    public isVisible = vi.fn(() => false)
    public show = vi.fn()
    public focus = vi.fn()
    public restore = vi.fn()
    public minimize = vi.fn()
    public hide = vi.fn()
    public close = vi.fn()
    public destroy = vi.fn()
    public loadURL = vi.fn(async () => {})
    public loadFile = vi.fn(async () => {})
    public once = vi.fn((event: string, cb: Function) => {
      eventListeners[`once:${event}`] = cb
    })
    public on = vi.fn((event: string, cb: Function) => {
      eventListeners[`on:${event}`] = cb
    })
    public webContents = {
      openDevTools: vi.fn(),
      send: vi.fn()
    }
    constructor() {
      mockWindowInstance = this
    }
  }

  class MockTray {
    public setToolTip = vi.fn()
    public setContextMenu = vi.fn()
    public setImage = vi.fn()
    public destroy = vi.fn()
    public on = vi.fn((event: string, cb: Function) => {
      eventListeners[`tray:${event}`] = cb
    })
  }

  return {
    BrowserWindow: MockBrowserWindow,
    Tray: MockTray,
    Menu: {
      buildFromTemplate: vi.fn((template) => template)
    },
    nativeImage: {
      createFromPath: vi.fn(() => ({
        resize: vi.fn(() => ({}))
      }))
    },
    app: {
      getPath: vi.fn(() => 'C:\\MockAppData'),
      getAppPath: vi.fn(() => 'C:\\MockAppPath'),
      getVersion: vi.fn(() => '1.5.3'),
      quit: vi.fn()
    }
  }
})

import { WindowManager } from '../../electron/core/window-manager'
import { TrayManager } from '../../electron/core/tray-manager'

describe('WindowManager & TrayManager Full Lifecycle', () => {
  let windowManager: WindowManager
  let trayManager: TrayManager

  beforeEach(() => {
    windowManager = WindowManager.getInstance()
    trayManager = TrayManager.getInstance()
  })

  it('should create BrowserWindow and handle window events', () => {
    const win = windowManager.createWindow()
    expect(win).toBeDefined()
    expect(windowManager.getWindow()).toBe(win)

    // Trigger ready-to-show
    if (eventListeners['once:ready-to-show']) {
      eventListeners['once:ready-to-show']()
    }

    // Trigger showAndFocus
    windowManager.showAndFocus()
    expect(win.show).toHaveBeenCalled()
    expect(win.focus).toHaveBeenCalled()

    // Trigger close when app is quitting
    windowManager.setQuitting(true)
    const mockEvent = { defaultPrevented: false, preventDefault: vi.fn() }
    if (eventListeners['on:close']) {
      eventListeners['on:close'](mockEvent)
    }

    // Trigger window closed
    if (eventListeners['on:closed']) {
      eventListeners['on:closed']()
    }
    expect(windowManager.getWindow()).toBeNull()
  })

  it('should create Tray and update context menu on VPN state change', () => {
    trayManager.createTray()
    expect(trayManager).toBeDefined()

    trayManager.updateTrayMenu(true)
    trayManager.updateTrayMenu(false)

    // Trigger tray double click
    if (eventListeners['tray:double-click']) {
      eventListeners['tray:double-click']()
    }

    // Trigger tray single click
    if (eventListeners['tray:click']) {
      eventListeners['tray:click']()
    }
  })
})
