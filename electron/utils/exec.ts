import { execFile, execFileSync } from 'node:child_process'
import { promisify } from 'node:util'

export const execFileAsync = promisify(execFile)

/**
 * Synchronous fail-safe execution for emergency exit and crash cleanup
 */
export function execFileSyncSafe(file: string, args: string[], timeoutMs = 3000): string {
  try {
    const res = execFileSync(file, args, { timeout: timeoutMs, windowsHide: true, encoding: 'utf8' })
    return res.trim()
  } catch {
    return ''
  }
}

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
