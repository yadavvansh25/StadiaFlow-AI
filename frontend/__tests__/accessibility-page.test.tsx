import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import Page from '../app/page';

expect.extend(toHaveNoViolations);

describe('Home Page Accessibility', () => {
  it('Home Page should have no accessibility violations', async () => {
    const { container } = render(<Page />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
