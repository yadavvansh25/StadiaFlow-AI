import { render, screen, fireEvent } from '@testing-library/react'
import AccessibilityToggle from '../components/AccessibilityToggle'

describe('AccessibilityToggle', () => {
  it('renders correctly', () => {
    render(<AccessibilityToggle enabled={false} onToggle={() => {}} />)
    expect(screen.getByRole('switch')).toBeInTheDocument()
    expect(screen.getByText('Accessibility Mode')).toBeInTheDocument()
  })

  it('displays correct text when enabled', () => {
    render(<AccessibilityToggle enabled={true} onToggle={() => {}} />)
    expect(screen.getByText('Haptics ON • Step-free Active')).toBeInTheDocument()
  })

  it('calls onToggle when clicked', () => {
    const mockOnToggle = jest.fn()
    render(<AccessibilityToggle enabled={false} onToggle={mockOnToggle} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(mockOnToggle).toHaveBeenCalledWith(true)
  })
})
