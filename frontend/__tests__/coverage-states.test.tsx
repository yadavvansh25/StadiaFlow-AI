import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Page from '../app/page';
import '@testing-library/jest-dom';

describe('Coverage for different tabs in Page', () => {
  it('Should handle tab switches', async () => {
    const { getByRole } = render(<Page />);
    
    const concessionsTab = getByRole('tab', { name: /Concessions/i });
    fireEvent.click(concessionsTab);
    
    // waiting for element
    await waitFor(() => {
        expect(screen.getByText('JIT Concessions')).toBeInTheDocument();
    });
    
    const arTab = getByRole('tab', { name: /AR Finder/i });
    fireEvent.click(arTab);
    
    await waitFor(() => {
        expect(screen.getByText('AR-Friend Finder')).toBeInTheDocument();
    });
  });
});
