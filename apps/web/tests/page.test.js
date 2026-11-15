import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PatientDashboard from '../src/app/page';
import SimulatorPage from '../src/app/simulator/page';

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
              { id: 'VP-01', name: 'Healthy Individual', baseline: 95, deviceId: 'CGM-SENSOR-VP01', targetRange: { low: 70, high: 140 }, volatility: 1.0, description: 'Normal baseline' },
              { id: 'VP-03', name: 'Brittle Type 1', baseline: 140, deviceId: 'CGM-SENSOR-VP03', targetRange: { low: 70, high: 180 }, volatility: 2.2, description: 'High volatility' }
            ]
          })
      });
    }
    if (url.includes('/status')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: { isRunning: false, isPaused: false, personaId: 'VP-03' }
          })
      });
    }
    if (url.includes('/prediction')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              currentGlucose: 125,
              trend: { rateOfChange: 0.5, category: 'stable', arrow: '→', momentum: 'steady' },
              predictions: [
                { minutesAhead: 15, projectedGlucose: 132, lowerBound: 122, upperBound: 142 },
                { minutesAhead: 30, projectedGlucose: 140, lowerBound: 126, upperBound: 154 },
                { minutesAhead: 45, projectedGlucose: 148, lowerBound: 130, upperBound: 166 }
              ],
              breachWarning: {
                breachPredicted: false,
                severity: 'safe',
                message: 'Target Glycemic Stability Projected'
              },
              modelMetrics: { mae: 4.65, rmse: 6.32, zeroLeakageValidated: true },
              anomaly: { is_anomaly: false }
            }
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

describe('PatientDashboard Component (Clinical View - Route Isolation)', () => {
  it('renders clean clinical patient dashboard header and disclaimer', async () => {
    render(<PatientDashboard />);

    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toHaveTextContent(/Patient Continuous Glucose Monitor/i);
    });

    // Check Simulation safety notice
    expect(screen.getByText(/Non-Clinical Simulation Prototype Notice/i)).toBeInTheDocument();
  });

  it('ensures simulator control buttons are NOT in the Patient Dashboard (Clean Patient Separation)', async () => {
    render(<PatientDashboard />);

    await waitFor(() => {
      const heading = screen.getByRole('heading', { level: 1 });
      expect(heading).toBeInTheDocument();
    });

    // Simulator controls should NOT be present on the patient dashboard
    expect(screen.queryByRole('button', { name: /Start Simulation/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Stop Engine/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Inject Meal Spike/i })).not.toBeInTheDocument();
  });

  it('renders AI Predictive Early-Warning card with multi-step forecasts', async () => {
    render(<PatientDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/AI Trajectory Forecast & Predictive Early-Warning/i)).toBeInTheDocument();
    });

    // Forecast horizons
    expect(screen.getByText(/\+15 Minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/\+30 Minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/\+45 Minutes/i)).toBeInTheDocument();

    // Accuracy metrics
    expect(screen.getByText(/MAE:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Zero-Leakage/i).length).toBeGreaterThan(0);
  });

  it('renders metric cards with clinical labels and simulation source badge', async () => {
    render(<PatientDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Interstitial Glucose/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/simulation/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Metabolic Status/i)).toBeInTheDocument();
  });
});

describe('SimulatorPage Component (/simulation Dedicated Route)', () => {
  it('renders simulator control buttons, persona selector, and event injectors in /simulation', async () => {
    render(<SimulatorPage />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Virtual CGM Simulator Lab/i);
    });

    // Start Simulation button in Simulator Lab
    expect(screen.getByRole('button', { name: /Start Simulation/i })).toBeInTheDocument();

    // Event injection triggers in Simulator Lab
    expect(screen.getByRole('button', { name: /Inject Carb Meal Spike/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Inject Hypo Drop/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Inject Intense Exercise/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Inject Rescue Carbs/i })).toBeInTheDocument();
  });
});
