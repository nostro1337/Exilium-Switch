export interface UpdateInfo {
  version: string
  releaseNotes?: string | Array<{ version: string; note: string }>
  releaseDate?: string
}

export interface UpdateProgress {
  percent: number
  bytesPerSecond: number
  transferred: number
  total: number
}
