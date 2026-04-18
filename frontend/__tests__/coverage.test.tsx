import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Page from '../app/page';

describe('Coverage tests', () => {
  it('Should handle unmounting', () => {
    const { unmount } = render(<Page />);
    unmount();
  });
});
