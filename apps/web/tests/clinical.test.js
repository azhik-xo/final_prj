import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import CaregiverPortalPage from '../src/app/caregiver/page';
import ClinicalAgpPage from '../src/app/clinical/page';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: jest.fn((param) => (param === 'patient' ? 'VP-03' : null))
  })
}));

// Mock window.print
beforeAll(() => {
  window.print = jest.fn();
});

// Mock Mock Data
const MOCK_PATIENTS = [
  {
    id: 'VP-01',
    name: 'Healthy Individual (Non-Diabetic)',
    userId: 'usr_patient_01',
    baseline: 95,
    targetRange: { low: 70, high: 140 },
    volatility: 1.2,
    currentGlucose: 98,
    trend: 'stable',
    trendArrow: '→',
    rateOfChange: 0.1,
    statusCategory: 'in_range',
    riskTier: 'LOW',
    caregiver: {
      caregiverName: 'Sarah Miller',
      relation: 'Self',
      phone: '+1 (555) 012-4411',
      assignedDoctor: 'Dr. Evelyn Reed, MD'
    },
    activeAlert: null,
    source: 'simulation'
  },
  {
    id: 'VP-03',
    name: 'Brittle Type 1 (High Risk)',
    userId: 'usr_patient_03',
    baseline: 150,
    targetRange: { low: 70, high: 180 },
    volatility: 4.8,
    currentGlucose: 52,
    trend: 'falling',
    trendArrow: '↓',
    rateOfChange: -1.8,
    statusCategory: 'very_low',
    riskTier: 'HIGH',
    caregiver: {
      caregiverName: 'Jane Doe',
      relation: 'Spouse',
      phone: '+1 (555) 019-2834',
      assignedDoctor: 'Dr. Evelyn Reed, MD'
    },
    activeAlert: {
      alertId: 'alert_test_m8_01',
      severity: 'CRITICAL',
      alertType: 'CRITICAL_HYPO',
      title: 'CRITICAL HYPOGLYCEMIA ALERT',
      message: 'Blood glucose dropped to 52 mg/dL.',
      stage: 2,
      triggeredAt: new Date().toISOString(),
      caregiverNotified: true
    },
    source: 'simulation'
  }
];

const MOCK_AGP_REPORT = {
  patient: {
    id: 'VP-03',
    name: 'Brittle Type 1 (High Risk)',
    userId: 'usr_patient_03',
    targetRange: { low: 70, high: 180 },
    baseline: 150,
    volatility: 4.8
  },
  reportingPeriod: {
    readingsCount: 288,
    durationDays: 14,
    dataSufficiency: 'Optimal (100% active CGM)'
  },
  metrics: {
    meanGlucose: 158.4,
    stdDev: 62.1,
    cvPercent: 39.2,
    cvStatus: 'Elevated Glycemic Variability (> 36%)',
    gmi: 7.1,
    minGlucose: 48,
    maxGlucose: 312
  },
  timeInRange: {
    veryLow: 2.1,
    low: 3.5,
    inRange: 61.8,
    high: 22.4,
    veryHigh: 10.2,
    targets: {
      inRange: '> 70%',
      high: '< 25%',
      veryHigh: '< 5%',
      low: '< 4%',
      veryLow: '< 1%'
    }
  },
  percentileCurve: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    timeLabel: `${String(i).padStart(2, '0')}:00`,
    p10: 75 + i,
    p25: 110 + i,
    p50: 150 + i,
    p75: 190 + i,
    p90: 230 + i,
    count: 12
  })),
  hourlyHeatmap: Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    timeLabel: `${String(i).padStart(2, '0')}:00`,
    medianGlucose: 150 + i,
    status: 'in_range'
  }))
};

const MOCK_NOTES = [
  {
    _id: 'note_1',
    patientId: 'VP-03',
    doctorName: 'Dr. Evelyn Reed, MD (Endocrinology)',
    noteType: 'routine_review',
    assessment: 'Patient displays high glycemic variability with evening spikes.',
    recommendations: 'Encourage low-GI carbohydrates for dinner and 20-minute post-meal walk.',
    tirSummary: { inRangePercent: 61.8, cvPercent: 39.2, gmiPercent: 7.1 },
    timestamp: new Date().toISOString()
  }
];

beforeEach(() => {
  global.fetch = jest.fn((url, options) => {
    // Caregiver Patient Roster
    if (url.includes('/api/v1/clinical/patients')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: 'ok',
            count: MOCK_PATIENTS.length,
            data: MOCK_PATIENTS
          })
      });
    }

    // Caregiver Acknowledge
    if (url.includes('/api/v1/clinical/caregiver/acknowledge')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: 'ok',
            message: 'Alert acknowledged remotely.'
          })
      });
    }

    // AGP Report
    if (url.includes('/api/v1/clinical/agp/')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: 'ok',
            data: MOCK_AGP_REPORT
          })
      });
    }

    // Clinical Notes GET
    if (url.includes('/api/v1/clinical/notes/')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: 'ok',
            count: MOCK_NOTES.length,
            data: MOCK_NOTES
          })
      });
    }

    // Clinical Notes POST
    if (url.includes('/api/v1/clinical/notes') && options?.method === 'POST') {
      const body = JSON.parse(options.body);
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: 'created',
            data: {
              _id: 'new_note_01',
              ...body,
              timestamp: new Date().toISOString()
            }
          })
      });
    }

    return Promise.reject(new Error(`Unhandled URL in test mock: ${url}`));
  });
});

describe('Caregiver Oversight Portal Page (apps/web/src/app/caregiver/page.js)', () => {
  it('renders caregiver portal header, patient roster cards, and metrics', async () => {
    render(<CaregiverPortalPage />);

    expect(screen.getByText('Caregiver Oversight Portal')).toBeInTheDocument();
    expect(
      screen.getByText(/Multi-Patient Family & Dependent Remote Monitoring/i)
    ).toBeInTheDocument();

    // Wait for patients to load
    await waitFor(() => {
      expect(screen.getByText('Healthy Individual (Non-Diabetic)')).toBeInTheDocument();
      expect(screen.getAllByText('Brittle Type 1 (High Risk)')[0]).toBeInTheDocument();
    });

    // Check glucose readings rendered
    expect(screen.getByText('98')).toBeInTheDocument();
    expect(screen.getByText('52')).toBeInTheDocument();

    // Check risk tier badges
    expect(screen.getByText('LOW RISK')).toBeInTheDocument();
    expect(screen.getByText('HIGH RISK')).toBeInTheDocument();

    // Non-device simulation disclaimer
    expect(screen.getByText(/Healthcare Simulation Notice/i)).toBeInTheDocument();
  });

  it('renders urgent caregiver escalation banner when a dependent has an active emergency alert', async () => {
    render(<CaregiverPortalPage />);

    await waitFor(() => {
      expect(screen.getByText(/Caregiver Urgent Notification/i)).toBeInTheDocument();
      expect(screen.getByText(/Blood glucose dropped to 52 mg\/dL/i)).toBeInTheDocument();
    });

    // Remote caregiver acknowledgment button
    const ackButton = screen.getByRole('button', {
      name: /Acknowledge as Caregiver/i
    });
    expect(ackButton).toBeInTheDocument();

    fireEvent.click(ackButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/clinical/caregiver/acknowledge'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  it('filters patient roster by risk tier', async () => {
    render(<CaregiverPortalPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Brittle Type 1 (High Risk)')[0]).toBeInTheDocument();
    });

    // Click 'LOW' filter
    const lowFilterBtn = screen.getByRole('button', { name: 'LOW' });
    fireEvent.click(lowFilterBtn);

    expect(screen.getByText('Healthy Individual (Non-Diabetic)')).toBeInTheDocument();
    expect(screen.getByText('LOW RISK')).toBeInTheDocument();
    expect(screen.queryByText('HIGH RISK')).not.toBeInTheDocument();
  });

  it('contains zero emojis in caregiver portal DOM output', async () => {
    const { container } = render(<CaregiverPortalPage />);
    await waitFor(() => {
      expect(screen.getByText('Caregiver Oversight Portal')).toBeInTheDocument();
    });

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(container.innerHTML)).toBe(false);
  });
});

describe('Doctor / Clinical AGP Portal Page (apps/web/src/app/clinical/page.js)', () => {
  it('renders AGP summary cards, TIR stacked meter, and 24-hour percentile curve', async () => {
    render(<ClinicalAgpPage />);

    expect(
      screen.getByText('Ambulatory Glucose Profile (AGP) Clinical Report')
    ).toBeInTheDocument();

    // Wait for AGP report data
    await waitFor(() => {
      expect(screen.getByText('158.4')).toBeInTheDocument(); // Mean glucose
      expect(screen.getAllByText('7.1%')[0]).toBeInTheDocument(); // GMI
      expect(screen.getAllByText('39.2%')[0]).toBeInTheDocument(); // CV
    });

    // Check Time-in-Range percentages
    expect(screen.getAllByText('61.8%')[0]).toBeInTheDocument(); // In Range
    expect(screen.getAllByText('22.4%')[0]).toBeInTheDocument(); // High
    expect(screen.getAllByText('10.2%')[0]).toBeInTheDocument(); // Very High
    expect(screen.getAllByText('3.5%')[0]).toBeInTheDocument(); // Low
    expect(screen.getAllByText('2.1%')[0]).toBeInTheDocument(); // Very Low

    // Check 24-Hour Percentile Curve section
    expect(
      screen.getByText(/24-Hour Ambulatory Glucose Profile Percentile Curve/i)
    ).toBeInTheDocument();

    // Check Modal Day Stability Profile
    expect(
      screen.getByText(/Hourly Modal Day Stability Profile/i)
    ).toBeInTheDocument();

    // Check Non-device disclaimer
    expect(
      screen.getByText(/Healthcare Non-Medical Device Disclaimer/i)
    ).toBeInTheDocument();
  });

  it('opens clinical note modal and saves a consultation note', async () => {
    render(<ClinicalAgpPage />);

    await waitFor(() => {
      expect(screen.getByText('158.4')).toBeInTheDocument();
    });

    // Click 'Add Clinical Note' button
    const openModalButtons = screen.getAllByRole('button', { name: /Add Clinical Note|New Consultation Note/i });
    fireEvent.click(openModalButtons[0]);

    // Modal opens
    expect(screen.getByText(/Add Physician Consultation Note/i)).toBeInTheDocument();

    // Fill form
    const assessmentInput = screen.getByPlaceholderText(/Document observations on Time-in-Range/i);
    const recommendationsInput = screen.getByPlaceholderText(/Dietary substitutions/i);

    fireEvent.change(assessmentInput, {
      target: { value: 'Elevated post-dinner glycemic excursions noted.' }
    });
    fireEvent.change(recommendationsInput, {
      target: { value: 'Recommend replacing white rice with quinoa and increasing evening hydration.' }
    });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Save Consultation Note/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/v1/clinical/notes'),
        expect.objectContaining({
          method: 'POST'
        })
      );
    });
  });

  it('prevents direct insulin titration prescriptions in consultation note form (ADR-007)', async () => {
    render(<ClinicalAgpPage />);

    await waitFor(() => {
      expect(screen.getByText('158.4')).toBeInTheDocument();
    });

    const openModalButtons = screen.getAllByRole('button', { name: /Add Clinical Note|New Consultation Note/i });
    fireEvent.click(openModalButtons[0]);

    const assessmentInput = screen.getByPlaceholderText(/Document observations on Time-in-Range/i);
    const recommendationsInput = screen.getByPlaceholderText(/Dietary substitutions/i);

    fireEvent.change(assessmentInput, {
      target: { value: 'Persistent high values.' }
    });
    fireEvent.change(recommendationsInput, {
      target: { value: 'Prescribe 12 units of Humalog before dinner.' }
    });

    const submitBtn = screen.getByRole('button', { name: /Save Consultation Note/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Safety Violation: Recommendations must NOT prescribe specific insulin units/i)
      ).toBeInTheDocument();
    });
  });

  it('triggers window.print when print button is clicked', async () => {
    render(<ClinicalAgpPage />);

    await waitFor(() => {
      expect(screen.getByText('158.4')).toBeInTheDocument();
    });

    const printBtn = screen.getByRole('button', { name: /Print \/ PDF/i });
    fireEvent.click(printBtn);

    expect(window.print).toHaveBeenCalled();
  });

  it('contains zero emojis in clinical portal DOM output', async () => {
    const { container } = render(<ClinicalAgpPage />);
    await waitFor(() => {
      expect(
        screen.getByText('Ambulatory Glucose Profile (AGP) Clinical Report')
      ).toBeInTheDocument();
    });

    const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
    expect(emojiRegex.test(container.innerHTML)).toBe(false);
  });
});
