import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import Page from '../app/page';

describe('Coverage for KeyPress', () => {
    it('handles enter key press on QR code', () => {
        const { getByRole } = render(<Page />);
        const qrButton = getByRole('button', { name: /Toggle Google Wallet QR Code/i });
        fireEvent.keyDown(qrButton, { key: 'Enter', code: 'Enter' });
    });
    it('handles space key press on QR code', () => {
        const { getByRole } = render(<Page />);
        const qrButton = getByRole('button', { name: /Toggle Google Wallet QR Code/i });
        fireEvent.keyDown(qrButton, { key: ' ', code: 'Space' });
    });
});
