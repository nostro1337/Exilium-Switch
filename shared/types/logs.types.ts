export type LogType = 'info' | 'warn' | 'error' | 'success' | 'dev'

export interface LogEntry {
  time: string
  text: string
  type: LogType
  templateId?: string
}
