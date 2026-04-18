import React from 'react';
import { render, fireEvent, act, waitFor, screen } from '@testing-library/react';
import Page from '../app/page';

let wsInstances: any[] = [];

class MockWebSocket {
  url: string;
  onopen: () => void = () => {};
  onmessage: (data: any) => void = () => {};
  onclose: () => void = () => {};
  onerror: () => void = () => {};
  readyState: number = 1;

  constructor(url: string) {
    this.url = url;
    wsInstances.push(this);
    setTimeout(() => this.onopen(), 0);
  }

  send(data: string) {}
  close() {
    this.readyState = 3;
    this.onclose();
  }
}

describe('Coverage for uncover branches', () => {
    let originalWebSocket: any;

    beforeEach(() => {
        wsInstances = [];
        originalWebSocket = global.WebSocket;
        (global as any).WebSocket = MockWebSocket;
    });

    afterEach(() => {
        (global as any).WebSocket = originalWebSocket;
    });

    it('covers branches 97 and 101', async () => {
        const { unmount } = render(<Page />);
        await waitFor(() => {
            expect(wsInstances.length).toBeGreaterThan(0);
        });

        const ws = wsInstances[0];

        // Trigger message for 104
        act(() => {
            ws.onmessage({
                data: JSON.stringify({
                    type: 'CROWD_DENSITY_UPDATE',
                    data: {
                        location: 'Sector 104',
                        density_percent: 85,
                        status: 'WARNING'
                    }
                })
            });
        });

        // Trigger message for 110
        act(() => {
            ws.onmessage({
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

        unmount();
    });
});
