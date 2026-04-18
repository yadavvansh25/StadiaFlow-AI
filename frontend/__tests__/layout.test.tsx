import { render } from '@testing-library/react'
import RootLayout from '../app/layout'

// Mock the next/font/google module
jest.mock('next/font/google', () => ({
  Inter: () => ({ className: 'mocked-inter-class' })
}))

describe('RootLayout', () => {
  it('renders children and service worker script', () => {
    const { container } = render(
      <RootLayout>
        <div data-testid="child-element">Test Content</div>
      </RootLayout>
    )
    
    // Check if child is rendered
    expect(container.querySelector('[data-testid="child-element"]')).toBeInTheDocument()
    
    // Check if html wrapper is present
    expect(container.querySelector('html')).toHaveClass('dark')
  })
})
