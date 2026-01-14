import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Input from './Input';

describe('Input Component', () => {
  test('renders input with label', () => {
    render(<Input label="Username" name="username" />);
    const labelElement = screen.getByText(/Username/i);
    expect(labelElement).toBeInTheDocument();
  });

  test('calls onChange handler when typed', () => {
    const handleChange = jest.fn();
    render(<Input label="Username" name="username" onChange={handleChange} />);
    const inputElement = screen.getByRole('textbox');
    fireEvent.change(inputElement, { target: { value: 'testuser' } });
    expect(handleChange).toHaveBeenCalledTimes(1);
  });

  test('displays error message when error prop is provided', () => {
    render(<Input label="Username" name="username" error="Invalid username" />);
    const errorElement = screen.getByText(/Invalid username/i);
    expect(errorElement).toBeInTheDocument();
    const inputElement = screen.getByRole('textbox');
    expect(inputElement).toHaveClass('input--error');
  });

  test('renders required indicator when required prop is true', () => {
    render(<Input label="Username" name="username" required />);
    const requiredIndicator = screen.getByText('*');
    expect(requiredIndicator).toBeInTheDocument();
  });
});
