export type LogType = 'info' | 'warn' | 'error' | 'success' | 'dev'
export type LogCategory = 'system' | 'traffic' | 'security' | 'error'

export interface LogEntry {
  time: string
  text: string
  type: LogType
  category?: LogCategory
  templateId?: string
}
