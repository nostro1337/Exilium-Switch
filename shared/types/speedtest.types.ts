export interface SpeedtestResult {
  pingMs: number | null
  downloadMbps: number | null
  uploadMbps: number | null
  timestamp: string
}

export type SpeedtestStage = 'idle' | 'ping' | 'download' | 'upload' | 'completed' | 'error'

export interface SpeedtestProgress {
  stage: SpeedtestStage
  progressPct: number
  currentSpeedMbps: number
  pingMs: number | null
  downloadMbps: number | null
  uploadMbps: number | null
  error?: string
}
