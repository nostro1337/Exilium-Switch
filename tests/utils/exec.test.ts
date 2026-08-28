import { describe, it, expect } from 'vitest'
import { runPowerShell, execFileSyncSafe } from '../../electron/utils/exec'

describe('Exec Utilities & PowerShell Runner', () => {
  it('should execute PowerShell script and return trimmed output', async () => {
    const res = await runPowerShell('"HELLO_EXILIUM"')
    expect(res).toBe('HELLO_EXILIUM')
  })

  it('should handle mathematical evaluations in PowerShell', async () => {
    const res = await runPowerShell('10 + 25')
    expect(res).toBe('35')
  })

  it('should handle script errors gracefully with meaningful exception', async () => {
    await expect(runPowerShell('Throw "CustomError"')).rejects.toThrowError('PowerShell execution error')
  })

  it('should safely execute execFileSyncSafe and handle nonexistent binary', () => {
    const res = execFileSyncSafe('nonexistent_bin_xyz.exe', [])
    expect(res).toBe('')
  })
})
