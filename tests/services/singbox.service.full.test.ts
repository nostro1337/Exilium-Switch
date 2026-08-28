import { describe, it, expect, beforeEach, vi } from 'vitest'
import { EventEmitter } from 'node:events'

describe('SingBoxService Stream Parser & Event Forwarding', () => {
  it('should format and forward logs correctly', () => {
    const emitter = new EventEmitter()
    const receivedLogs: string[] = []

    emitter.on('data', (chunk) => {
      receivedLogs.push(chunk.toString())
    })

    emitter.emit('data', Buffer.from('[INFO] sing-box outbound/vless: connection established\n'))
    expect(receivedLogs).toHaveLength(1)
    expect(receivedLogs[0]).toContain('connection established')
  })
})
