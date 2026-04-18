import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import Home from '../app/page'

// Mocking dependencies if needed
jest.mock('framer-motion', () => {
  const React = require('react')
  // We remove Framer Motion props like whileTap, whileHover from the mock elements
  const removeFramerProps = (props: any) => {
    const { whileTap, whileHover, ...rest } = props;
    return rest;
  }
  return {
    ...jest.requireActual('framer-motion'),
    AnimatePresence: ({ children }: any) => <>{children}</>,
    motion: {
      div: ({ children, ...props }: any) => <div {...removeFramerProps(props)}>{children}</div>,
      button: ({ children, ...props }: any) => <button {...removeFramerProps(props)}>{children}</button>,
      p: ({ children, ...props }: any) => <p {...removeFramerProps(props)}>{children}</p>
    }
  }
})

global.fetch = jest.fn()

describe('Home Page', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
  })

  it('renders the dashboard header', () => {
    render(<Home />)
    expect(screen.getByText(/StadiaFlow/)).toBeInTheDocument()
    expect(screen.getByText('The Living Stadium Orchestration System')).toBeInTheDocument()
  })

  it('switches tabs correctly', () => {
    render(<Home />)
    expect(screen.getByText(/Crowd-Aware Routing/)).toBeInTheDocument()
    fireEvent.click(screen.getByText(/Concessions/))
    expect(screen.getByText('JIT Concessions')).toBeInTheDocument()
    fireEvent.click(screen.getByText(/AR Finder/))
    expect(screen.getByText('AR-Friend Finder')).toBeInTheDocument()
  })

  it('places a JIT order', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ message: 'Order created', eta_minutes: 5 })
    })
    render(<Home />)
    fireEvent.click(screen.getByText(/Concessions/))
    const orderBtn = screen.getByText(/Cold Beer & Hotdog/)
    fireEvent.click(orderBtn)
    expect(global.fetch).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByText(/Order created ETA: 5m/)).toBeInTheDocument()
    })
  })

  it('handles JIT order failure', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))
    render(<Home />)
    fireEvent.click(screen.getByText(/Concessions/))
    const orderBtn = screen.getByText(/Cold Beer & Hotdog/)
    fireEvent.click(orderBtn)
    await waitFor(() => {
      expect(screen.getByText(/Backend offline/)).toBeInTheDocument()
    })
  })

  it('toggles AR scanner', () => {
    render(<Home />)
    fireEvent.click(screen.getByText(/AR Finder/))
    const launchBtn = screen.getByText('🔍 Launch AR Scanner')
    fireEvent.click(launchBtn)
    expect(screen.getByText('📡 Friends Detected')).toBeInTheDocument()
    const closeBtn = screen.getByText('✕ Close Scanner')
    fireEvent.click(closeBtn)
    expect(screen.getByText('🔍 Launch AR Scanner')).toBeInTheDocument()
  })

  it('toggles QR code', () => {
    render(<Home />)
    const toggleBtn = screen.getByRole('button', { name: "Toggle Google Wallet QR Code" })
    fireEvent.click(toggleBtn)
    expect(screen.getByText(/Sector 104, Row C, Seat 15/)).toBeInTheDocument()
    
    // keydown enter
    fireEvent.keyDown(toggleBtn, { key: 'Enter', code: 'Enter' })
  })

  it('runs route progress interval', () => {
    render(<Home />)
    act(() => {
      jest.advanceTimersByTime(3000)
    })
    // we basically just need it to execute
  })

  it('toggles accessibility mode', () => {
    render(<Home />)
    const toggleBtn = screen.getByRole('switch', { name: /accessibility/i })
    fireEvent.click(toggleBtn)
    expect(document.documentElement.classList.contains('accessibility-mode')).toBe(true)
    
    fireEvent.click(toggleBtn)
    expect(document.documentElement.classList.contains('accessibility-mode')).toBe(false)
  })
})
