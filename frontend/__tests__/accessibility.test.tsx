import React from 'react';
import { render, screen } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import AccessibilityToggle from '../components/AccessibilityToggle';

expect.extend(toHaveNoViolations);

describe('Accessibility Testing', () => {
  it('Accessibility Toggle component should have no accessibility violations', async () => {
    // Provide the required props
    const { container } = render(<AccessibilityToggle enabled={false} onToggle={() => {}} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
