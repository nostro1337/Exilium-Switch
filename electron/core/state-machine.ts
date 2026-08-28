import type { ConnectionState } from '../../shared/types'

export class StateMachine {
  private static instance: StateMachine
  private state: ConnectionState = 'disconnected'
  private isLocked = false

  private constructor() {}

  public static getInstance(): StateMachine {
    if (!StateMachine.instance) {
      StateMachine.instance = new StateMachine()
    }
    return StateMachine.instance
  }

  public getState(): ConnectionState {
    return this.state
  }

  public setState(nextState: ConnectionState): void {
    this.state = nextState
  }

  /**
   * Execute an async state transition with mutex protection
   */
  public async withLock<T>(action: () => Promise<T>): Promise<T> {
    if (this.isLocked) {
      throw new Error('Операция уже выполняется. Пожалуйста, подождите.')
    }

    this.isLocked = true
    try {
      return await action()
    } finally {
      this.isLocked = false
    }
  }

  public isBusy(): boolean {
    return this.isLocked || this.state === 'connecting' || this.state === 'disconnecting'
  }
}
