import { describe, it, expect } from 'vitest'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { DEFAULT_SETTINGS } from '../../shared/types'

describe('Shared Contracts & IPC Channels Integrity', () => {
  it('should define distinct, non-empty channel names for all IPC operations', () => {
    const channelValues = Object.values(IPC_CHANNELS)
    const uniqueChannels = new Set(channelValues)

    expect(channelValues.length).toBeGreaterThan(15)
    expect(uniqueChannels.size).toBe(channelValues.length) // No duplicate channel names!

    expect(IPC_CHANNELS.GET_STATUS).toBe('get-status')
    expect(IPC_CHANNELS.TOGGLE_VPN).toBe('toggle-vpn')
    expect(IPC_CHANNELS.SET_APP_MODE).toBe('set-app-mode')
    expect(IPC_CHANNELS.RUN_SYSTEM_AUDIT).toBe('run-system-audit')
    expect(IPC_CHANNELS.STATUS_UPDATED).toBe('status-updated')
    expect(IPC_CHANNELS.SING_BOX_LOG).toBe('sing-box-log')
  })

  it('should provide complete DEFAULT_SETTINGS conforming to AppSettings contract', () => {
    expect(DEFAULT_SETTINGS.autoStart).toBe(false)
    expect(DEFAULT_SETTINGS.minimizeToTray).toBe(true)
    expect(DEFAULT_SETTINGS.startMinimized).toBe(false)
    expect(DEFAULT_SETTINGS.appMode).toBe('home')
    expect(DEFAULT_SETTINGS.realZone).toBe('Russian Standard Time')
    expect(DEFAULT_SETTINGS.fakeZone).toBe('W. Europe Standard Time')
  })
})
