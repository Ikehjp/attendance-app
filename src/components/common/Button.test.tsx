import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
  test('renders button with correct text', () => {
    render(<Button>Click Me</Button>);
    const buttonElement = screen.getByText(/Click Me/i);
    expect(buttonElement).toBeInTheDocument();
  });

  test('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click Me</Button>);
    const buttonElement = screen.getByText(/Click Me/i);
    fireEvent.click(buttonElement);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('renders disabled button when disabled prop is true', () => {
    render(<Button disabled>Click Me</Button>);
    const buttonElement = screen.getByRole('button', { name: /Click Me/i });
    expect(buttonElement).toBeDisabled();
  });

  test('applies variant class', () => {
    render(<Button variant="primary">Primary Button</Button>);
    const buttonElement = screen.getByRole('button', { name: /Primary Button/i });
    expect(buttonElement).toHaveClass('btn--primary');
  });
});
