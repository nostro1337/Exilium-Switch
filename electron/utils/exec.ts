import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

export const execFileAsync = promisify(execFile)

/**
 * Execute a PowerShell command with -NoProfile and -NonInteractive flags
 */
export async function runPowerShell(script: string, timeoutMs = 15000): Promise<string> {
  try {
    const { stdout } = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      script
    ], { timeout: timeoutMs })
    return stdout.trim()
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    throw new Error(`PowerShell execution error: ${message}`)
  }
}

/**
 * Fast registry write via reg.exe (10x faster than PowerShell Set-ItemProperty)
 */
export async function setRegistryDword(keyPath: string, valueName: string, value: number): Promise<boolean> {
  try {
    await execFileAsync('reg.exe', [
      'add',
      keyPath,
      '/v',
      valueName,
      '/t',
      'REG_DWORD',
      '/d',
      value.toString(),
      '/f'
    ])
    return true
  } catch {
    return false
  }
}
