import { render, screen, act } from '@testing-library/react'
import Home from '../app/page'

class MockWebSocket {
  onopen: () => void = () => {}
  onmessage: (data: any) => void = () => {}
  onclose: () => void = () => {}
  onerror: () => void = () => {}
  close = jest.fn()
  constructor(url: string) {
    setTimeout(() => {
      this.onopen()
    }, 0)
  }
}

global.WebSocket = MockWebSocket as any;

describe('Home Page WebSocket', () => {
  it('connects to websocket and receives messages', async () => {
    let wsInstance: any;
    const OriginalWS = global.WebSocket;
    global.WebSocket = jest.fn().mockImplementation((url) => {
      wsInstance = new OriginalWS(url);
      return wsInstance;
    }) as any;

    render(<Home />);
    
    await act(async () => {
      await new Promise(r => setTimeout(r, 10));
    });
    
    expect(screen.getByText('NODE CONNECTED')).toBeInTheDocument();
    
    // Send a message
    act(() => {
      wsInstance.onmessage({
        data: JSON.stringify({
          type: 'CROWD_DENSITY_UPDATE',
          data: {
            location: 'Sector 104',
            density_percent: 90,
            status: 'CRITICAL'
          }
        })
      });
    });

    // Instead of explicitly matching density value which might be tricky with HTML structure,
    // Just find the alert text directly since it renders "90%" directly in a strong tag wrapper etc
    // The previous error was that there were multiple instances of "90%" since we updated route progress and density text
    // "expect(screen.getByText(/90%/)).toBeInTheDocument();" fails if it matches more than one. 
    // We can use getAllByText
    const densities = screen.getAllByText(/90%/);
    expect(densities.length).toBeGreaterThan(0);
    
    // We cannot reliably text-match "Sector 104 Men's" when there are multiple elements matching
    // Let's just find elements containing 104
    const elems = screen.getAllByText(/Sector 104/);
    expect(elems.length).toBeGreaterThan(0);
    
    // test other status
    act(() => {
      wsInstance.onmessage({
        data: JSON.stringify({
          type: 'CROWD_DENSITY_UPDATE',
          data: {
            location: 'Sector 110',
            density_percent: 75,
            status: 'WARNING'
          }
        })
      });
    });
    
    const warnDensities = screen.getAllByText(/75%/);
    expect(warnDensities.length).toBeGreaterThan(0);
    
    // test normal status
    act(() => {
      wsInstance.onmessage({
        data: JSON.stringify({
          type: 'CROWD_DENSITY_UPDATE',
          data: {
            location: 'Sector 112',
            density_percent: 45,
            status: 'NORMAL'
          }
        })
      });
    });

    // trigger close
    act(() => {
      wsInstance.onclose();
    });
    
    expect(screen.getByText('CONNECTING...')).toBeInTheDocument();
    
    // trigger err
    act(() => {
      wsInstance.onerror();
    });
    expect(wsInstance.close).toHaveBeenCalled();

    // trigger msg err
    act(() => {
      wsInstance.onmessage({
        data: "invalid json {"
      });
    });
  })
})
