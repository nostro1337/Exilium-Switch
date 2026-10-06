import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import { AIExplanationModal } from '../../src/components/AIExplanationModal'
import type { AiExplanationCard } from '../../shared/types/ai.types'

describe('AIExplanationModal Component', () => {
  const mockCard: AiExplanationCard = {
    templateId: 'a7f8c9b1',
    pattern: 'outbound/vless: dial tcp <IP>:<PORT>: i/o timeout',
    title: 'Таймаут соединения',
    severity: 'low',
    isDangerous: false,
    humanExplanation: 'Целевой сервер не ответил вовремя.',
    technicalDetails: 'TCP handshake timeout.',
    recommendedAction: 'Действий не требуется.',
    actionCommand: 'restart_vpn',
    firstSeen: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    occurrences: 5
  }

  it('should render modal content when open', () => {
    render(
      <AIExplanationModal
        isOpen={true}
        card={mockCard}
        onClose={vi.fn()}
      />
    )

    expect(screen.getByText(/Когнитивный анализ события/i)).toBeDefined()
    expect(screen.getByText(/Таймаут соединения/i)).toBeDefined()
    expect(screen.getByText(/Целевой сервер не ответил вовремя/i)).toBeDefined()
    expect(screen.getByText(/#a7f8c9b1/i)).toBeDefined()
  })

  it('should trigger action callback when action button is clicked', () => {
    const onActionMock = vi.fn()

    render(
      <AIExplanationModal
        isOpen={true}
        card={mockCard}
        onClose={vi.fn()}
        onAction={onActionMock}
      />
    )

    const actionButton = screen.getByText(/Перезапустить/i)
    fireEvent.click(actionButton)
    expect(onActionMock).toHaveBeenCalledWith('restart_vpn')
  })

  it('should not render anything when isOpen is false or card is null', () => {
    const { container } = render(
      <AIExplanationModal
        isOpen={false}
        card={mockCard}
        onClose={vi.fn()}
      />
    )
    expect(container.firstChild).toBeNull()
  })
})
