import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { AiService } from '../services/ai.service'
import { AiCacheService } from '../services/ai-cache.service'
import { TelemetryService } from '../services/telemetry.service'
import type { AuditDiagnosisResult } from '../../shared/types/audit.types'

export function registerAiIpcHandlers(): void {
  // 1. Explain specific log line (via Gemini / Cache)
  ipcMain.handle(IPC_CHANNELS.AI_EXPLAIN_LOG, async (_event, logLine: string) => {
    return await AiService.getInstance().explainLog(logLine || '')
  })

  // 2. Retrieve cached card by template ID
  ipcMain.handle(IPC_CHANNELS.AI_GET_CARD, (_event, templateId: string) => {
    return AiCacheService.getInstance().get(templateId || '')
  })

  // 3. Get all cached cards
  ipcMain.handle(IPC_CHANNELS.AI_GET_ALL_CARDS, () => {
    return AiCacheService.getInstance().getAll()
  })

  // 4. Clear knowledge cache
  ipcMain.handle(IPC_CHANNELS.AI_CLEAR_CACHE, () => {
    AiCacheService.getInstance().clear()
    return { success: true }
  })

  // 5. Get cache statistics
  ipcMain.handle(IPC_CHANNELS.AI_GET_CACHE_STATS, () => {
    return AiCacheService.getInstance().getStats()
  })

  // 6. Test Gemini API Key connectivity
  ipcMain.handle(IPC_CHANNELS.AI_TEST_CONNECTION, async (_event, apiKey: string) => {
    return await AiService.getInstance().testApiKey(apiKey || '')
  })

  // 7. Get current live telemetry snapshot
  ipcMain.handle(IPC_CHANNELS.AI_GET_TELEMETRY, () => {
    return TelemetryService.getInstance().getTelemetry()
  })

  // 8. Explain system audit results
  ipcMain.handle(IPC_CHANNELS.AI_EXPLAIN_AUDIT, async (_event, audit: AuditDiagnosisResult) => {
    return await AiService.getInstance().explainSystemAudit(audit)
  })
}

