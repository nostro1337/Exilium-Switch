import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { AuditService } from '../services/audit.service'
import { NetworkService } from '../services/network.service'
import { LogService } from '../services/log.service'

export function registerSystemIpc(): void {
  const auditService = AuditService.getInstance()
  const networkService = NetworkService.getInstance()
  const logService = LogService.getInstance()

  ipcMain.handle(IPC_CHANNELS.RUN_SYSTEM_AUDIT, async () => {
    logService.addLog('Запуск комплексного аудита сетевого окружения Windows...', 'info')
    return await auditService.performAudit()
  })

  ipcMain.handle(IPC_CHANNELS.TEST_LATENCY, async () => {
    logService.addLog('Замер задержки через туннель до европейского узла...', 'info')
    const res = await networkService.testLatency()
    if (res.latencyMs !== null) {
      logService.addLog(`Пинг: ${res.latencyMs} ms`, 'success')
    } else {
      logService.addLog('Пинг: превышен таймаут ответа', 'warn')
    }
    return res
  })
}
