import { describe, it, expect, beforeEach } from 'vitest'
import { StateMachine } from '../../electron/core/state-machine'

describe('StateMachine & Mutex Protection', () => {
  let stateMachine: StateMachine

  beforeEach(() => {
    stateMachine = StateMachine.getInstance()
    stateMachine.setState('disconnected')
  })

  it('should initialize with disconnected state', () => {
    expect(stateMachine.getState()).toBe('disconnected')
    expect(stateMachine.isBusy()).toBe(false)
  })

  it('should transition between states correctly', () => {
    stateMachine.setState('connecting')
    expect(stateMachine.getState()).toBe('connecting')
    expect(stateMachine.isBusy()).toBe(true)

    stateMachine.setState('connected')
    expect(stateMachine.getState()).toBe('connected')
    expect(stateMachine.isBusy()).toBe(false)

    stateMachine.setState('disconnecting')
    expect(stateMachine.getState()).toBe('disconnecting')
    expect(stateMachine.isBusy()).toBe(true)

    stateMachine.setState('disconnected')
    expect(stateMachine.getState()).toBe('disconnected')
    expect(stateMachine.isBusy()).toBe(false)
  })

  it('should protect concurrent execution using mutex lock', async () => {
    let executionCount = 0

    const slowOperation = () => new Promise<string>((resolve) => {
      setTimeout(() => {
        executionCount++
        resolve('done')
      }, 50)
    })

    const p1 = stateMachine.withLock(slowOperation)
    // Simultaneous attempt must be rejected by mutex
    await expect(stateMachine.withLock(slowOperation)).rejects.toThrowError('Операция уже выполняется')

    const res = await p1
    expect(res).toBe('done')
    expect(executionCount).toBe(1)

    // After lock is released, next operation succeeds
    const p2 = await stateMachine.withLock(slowOperation)
    expect(p2).toBe('done')
    expect(executionCount).toBe(2)
  })
})
