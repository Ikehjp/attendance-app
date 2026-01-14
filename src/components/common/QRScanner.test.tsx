import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import QRScannerComponent from './QRScanner';

// react-qr-scannerのモック
jest.mock('@yudiel/react-qr-scanner', () => ({
  Scanner: ({ onScan }) => (
    <div data-testid="mock-scanner">
      <button onClick={() => onScan([{ rawValue: 'test-qr-code' }])}>
                Simulate Scan
      </button>
    </div>
  ),
}));

describe('QRScannerComponent', () => {
  const mockOnScan = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnScan.mockClear();
    mockOnClose.mockClear();
  });

  test('does not render when isOpen is false', () => {
    render(
      <QRScannerComponent
        isOpen={false}
        onScan={mockOnScan}
        onClose={mockOnClose}
      />,
    );
    expect(screen.queryByTestId('mock-scanner')).not.toBeInTheDocument();
  });

  test('renders when isOpen is true', () => {
    render(
      <QRScannerComponent
        isOpen={true}
        onScan={mockOnScan}
        onClose={mockOnClose}
      />,
    );
    expect(screen.getByTestId('mock-scanner')).toBeInTheDocument();
    // Check for "スキャン開始" (Start Scan) button using regex
    expect(screen.getByText(/スキャン開始/)).toBeInTheDocument();
  });

  test('calls onScan when scan is successful', () => {
    render(
      <QRScannerComponent
        isOpen={true}
        onScan={mockOnScan}
        onClose={mockOnClose}
      />,
    );

    // Click "Start Scan" first
    const startButton = screen.getByText(/スキャン開始/);
    fireEvent.click(startButton);

    // Click mock scan button
    fireEvent.click(screen.getByText('Simulate Scan'));

    expect(mockOnScan).toHaveBeenCalledWith('test-qr-code');
  });

  test('calls onClose when close button is clicked', () => {
    render(
      <QRScannerComponent
        isOpen={true}
        onScan={mockOnScan}
        onClose={mockOnClose}
      />,
    );

    // Click close button (×)
    fireEvent.click(screen.getByText('×'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
