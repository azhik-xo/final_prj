import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PatientDashboard from '../src/app/page';

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  };
  const mockIo = jest.fn(() => mockSocket);
  return {
    __esModule: true,
    default: mockIo,
    io: mockIo,
  };
});

// Mock fetch globally
beforeEach(() => {
  global.fetch = jest.fn((url) => {
    if (url.includes('/personas')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: [
              { id: 'VP-01', name: 'Healthy Individual', baseline: 95, deviceId: 'VIRTUAL_CGM_VP01' },
              { id: 'VP-03', name: 'Brittle Type 1', baseline: 140, deviceId: 'VIRTUAL_CGM_VP03' }
            ]
          })
      });
    }
    if (url.includes('/status')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { isRunning: false, isPaused: false, personaId: 'VP-01' }
          })
      });
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    });
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('PatientDashboard Component (TASK-INT-01)', () => {
  it('renders dashboard title and E2E pipeline badge', async () => {
    render(<PatientDashboard />);

    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent(/Patient Continuous Glucose Monitor/i);
    });

    // Check TASK-INT-01 status badge
    expect(screen.getByText(/TASK-INT-01/i)).toBeInTheDocument();

    // Check Simulation notice
    expect(screen.getByText(/Non-Clinical Simulation Prototype Notice/i)).toBeInTheDocument();
  });

  it('renders simulator control buttons and event injectors', async () => {
    render(<PatientDashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Start Simulation/i })).toBeInTheDocument();
    });

    // Stop Engine button
    expect(screen.getByRole('button', { name: /Stop Engine/i })).toBeInTheDocument();

    // Event injection buttons
    expect(screen.getByRole('button', { name: /Meal Spike/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Hypo Drop/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Workout/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Rescue Carbs/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reset Normal/i })).toBeInTheDocument();
  });

  it('renders metric cards with simulation source label', async () => {
    render(<PatientDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Interstitial Glucose/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/simulation/i).length).toBeGreaterThan(0);
  });
});
