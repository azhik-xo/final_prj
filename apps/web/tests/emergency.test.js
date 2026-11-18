import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import EmergencyAlertModal from '../src/components/EmergencyAlertModal';
import EmergencyHubPage from '../src/app/emergency/page';

// Mock Web Audio API
beforeAll(() => {
  window.AudioContext = jest.fn().mockImplementation(() => ({
    state: 'running',
    resume: jest.fn(),
    currentTime: 0,
    destination: {},
    createOscillator: jest.fn().mockReturnValue({
      type: 'sawtooth',
      frequency: {
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn()
      },
      connect: jest.fn(),
      start: jest.fn(),
      stop: jest.fn()
    }),
    createGain: jest.fn().mockReturnValue({
      gain: {
        setValueAtTime: jest.fn(),
        exponentialRampToValueAtTime: jest.fn()
      },
      connect: jest.fn()
    })
  }));
});

// Mock fetch globally
beforeEach(() => {
  global.fetch = jest.fn((url, options) => {
    if (url.includes('/api/v1/alerts/active')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: 'ok',
            hasActiveAlert: false,
            data: null
          })
      });
    }

    if (url.includes('/api/v1/alerts/history')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: 'ok',
            count: 1,
            data: [
              {
                _id: 'mock_alert_01',
                alertId: 'mock_alert_01',
                alertType: 'CRITICAL_HYPO',
                title: 'CRITICAL HYPOGLYCEMIA ALERT',
                glucose: 48,
                rateOfChange: -1.5,
                severity: 'CRITICAL',
                status: 'acknowledged',
                actionTaken: 'consumed_15g_carbs',
                caregiverNotified: true,
                simulatedSos: { dispatched: false },
                timestamp: new Date().toISOString()
              }
            ]
          })
      });
    }

    if (url.includes('/api/v1/alerts/acknowledge')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: 'ok',
            message: 'Alert acknowledged'
          })
      });
    }

    if (url.includes('/api/v1/alerts/simulate')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: 'ok',
            data: {
              alertId: 'sim_123',
              glucose: 46,
              rateOfChange: -1.2,
              alertType: 'CRITICAL_HYPO',
              severity: 'CRITICAL',
              title: 'CRITICAL HYPOGLYCEMIA ALERT',
              message: 'Severe Hypo simulated (<54 mg/dL)',
              actionProtocol: 'Immediate fast carbs required.',
              status: 'triggered',
              stage: 1,
              countdownSeconds: 60,
              source: 'simulation'
            }
          })
      });
    }

    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', data: {} })
    });
  });
});

afterEach(() => {
  jest.clearAllMocks();
});

const renderEmergencyPage = async () => {
  let utils;
  await React.act(async () => {
    utils = render(<EmergencyHubPage />);
  });
  return utils;
};

describe('EmergencyAlertModal Component (Module M7)', () => {
  const mockCriticalAlert = {
    alertId: 'alt_test_001',
    glucose: 48,
    rateOfChange: -2.0,
    alertType: 'CRITICAL_HYPO',
    severity: 'CRITICAL',
    title: 'CRITICAL HYPOGLYCEMIA ALERT',
    actionProtocol: 'Consume 15g to 20g of fast-acting simple carbohydrates.',
    status: 'triggered',
    countdownSeconds: 60
  };

  it('renders critical hypo alert details and countdown', () => {
    render(<EmergencyAlertModal alert={mockCriticalAlert} />);

    expect(screen.getByText(/CRITICAL HYPOGLYCEMIA ALERT/i)).toBeInTheDocument();
    expect(screen.getByText('48')).toBeInTheDocument();
    expect(screen.getByText(/Immediate Action Protocol/i)).toBeInTheDocument();
    expect(screen.getByText(/Consume 15g to 20g of fast-acting/i)).toBeInTheDocument();
    expect(screen.getByText(/SIMULATION ONLY/i)).toBeInTheDocument();
  });

  it('handles safety acknowledgment when button clicked', async () => {
    const handleAck = jest.fn();
    render(<EmergencyAlertModal alert={mockCriticalAlert} onAcknowledge={handleAck} />);

    const ackBtn = screen.getByRole('button', { name: /I AM SAFE — ACKNOWLEDGE ALERT/i });
    await React.act(async () => {
      fireEvent.click(ackBtn);
    });

    expect(handleAck).toHaveBeenCalled();
  });
});

describe('EmergencyHubPage (Module M7 / TASK-M7-FULL)', () => {
  it('renders title, module badge, and simulation notice', async () => {
    await renderEmergencyPage();

    expect(
      screen.getByText(/Emergency Response Hub & Simulated SOS Dispatch/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Module M7/i)).toBeInTheDocument();
    expect(screen.getByText(/source: simulation/i)).toBeInTheDocument();

    // Disclaimer
    const disclaimer = screen.getByText(/Simulated Emergency Boundary Notice/i);
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer.parentElement.textContent).toMatch(/NO ACTUAL EMERGENCY SERVICES/i);
  });

  it('renders All Systems Normal banner when no active alert is present', async () => {
    await renderEmergencyPage();

    expect(screen.getByText(/All Systems Normal/i)).toBeInTheDocument();
    expect(screen.getByText(/No Active Emergency Detected/i)).toBeInTheDocument();
    expect(screen.getByText(/70 – 180 mg\/dL/i)).toBeInTheDocument();
  });

  it('renders Multi-Stage Escalation Protocol visualizer', async () => {
    await renderEmergencyPage();

    expect(screen.getByText(/Multi-Stage Escalation Protocol Architecture/i)).toBeInTheDocument();
    expect(screen.getByText(/Stage 1 \(0 – 60s\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Stage 2 \(60s\+\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Stage 3 \(SOS Dispatch\)/i)).toBeInTheDocument();
  });

  it('renders 1-Click Simulation Triggers for testing', async () => {
    await renderEmergencyPage();

    expect(screen.getByText(/Severe Hypo \(<54 mg\/dL\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Precipitous Drop Velocity/i)).toBeInTheDocument();
    expect(screen.getByText(/Hyper Crisis \(>300 mg\/dL\)/i)).toBeInTheDocument();
  });

  it('renders Emergency Contact Notification Roster', async () => {
    await renderEmergencyPage();

    expect(screen.getByText(/Emergency Contact Notification Roster/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Jane Doe \(Spouse\)/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Dr\. Robert Vance, MD/i)).toBeInTheDocument();
    expect(screen.getByText(/Metro EMS Ambulance Services/i)).toBeInTheDocument();
  });

  it('renders The Clinical "Rule of 15" Protocol', async () => {
    await renderEmergencyPage();

    expect(screen.getByText(/The Clinical "Rule of 15" Protocol/i)).toBeInTheDocument();
    expect(screen.getByText(/15g Fast Carbohydrates/i)).toBeInTheDocument();
    expect(screen.getByText(/Wait 15 Minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/Recheck Blood Glucose/i)).toBeInTheDocument();
  });

  it('renders Emergency Incident Audit Log table with past incidents', async () => {
    await renderEmergencyPage();

    await waitFor(() => {
      expect(screen.getByText(/Emergency Incident Audit Log/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText(/CRITICAL HYPOGLYCEMIA ALERT/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/48 mg\/dL/i)).toBeInTheDocument();
  });

  it('strictly adheres to zero-emoji policy in rendered DOM', async () => {
    const { container } = await renderEmergencyPage();
    const textContent = container.textContent || '';
    const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u26FF\u2700-\u27BF]/;
    expect(emojiRegex.test(textContent)).toBe(false);
  });
});
