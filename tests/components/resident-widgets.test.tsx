import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ResidentWidgets } from '../../src/components/ResidentWidgets'

describe('ResidentWidgets Component', () => {
  it('should render Timezone, Geo and Speedtest widgets', async () => {
    await act(async () => {
      render(
        <ResidentWidgets
          isRunning={true}
          currentZone="W. Europe Standard Time"
          fakeZone="W. Europe Standard Time"
          realZone="Tomsk Standard Time"
          lfsvcStatus="Stopped"
          currentMode="home"
        />
      )
    })

    expect(screen.getByText(/Часовой пояс/i)).toBeDefined()
    expect(screen.getByText(/ГЕО Служба/i)).toBeDefined()
    expect(screen.getByText(/Замер скорости и задержки/i)).toBeDefined()
    expect(screen.getByText(/Speedtest/i)).toBeDefined()
  })

  it('should open modal details on widget click', async () => {
    render(
      <ResidentWidgets
        isRunning={true}
        currentZone="W. Europe Standard Time"
        fakeZone="W. Europe Standard Time"
        realZone="Tomsk Standard Time"
        lfsvcStatus="Stopped"
        currentMode="home"
      />
    )

    const tzWidget = screen.getByText(/Часовой пояс/i)
    await act(async () => {
      fireEvent.click(tzWidget)
    })

    expect(screen.getByText(/Маскировка часового пояса/i)).toBeDefined()

    const closeBtn = screen.getByRole('button', { name: /Закрыть/i })
    expect(closeBtn).toBeDefined()
    await act(async () => {
      fireEvent.click(closeBtn)
    })
  })

  it('should trigger quick ping when ping button is clicked', async () => {
    const testLatencyMock = vi.fn().mockResolvedValue({ latencyMs: 98 })
    window.electronAPI = {
      ...window.electronAPI,
      testLatency: testLatencyMock
    } as any

    render(
      <ResidentWidgets
        isRunning={true}
        currentZone="W. Europe Standard Time"
        fakeZone="W. Europe Standard Time"
        realZone="Tomsk Standard Time"
        lfsvcStatus="Stopped"
        currentMode="home"
      />
    )

    const pingBtn = screen.getByTitle(/Быстрый замер задержки/i)
    await act(async () => {
      fireEvent.click(pingBtn)
    })

    expect(testLatencyMock).toHaveBeenCalled()
  })
})
