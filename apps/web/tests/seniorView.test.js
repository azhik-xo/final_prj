import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SeniorGlucoseView from '../src/components/SeniorGlucoseView';
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

describe('SeniorGlucoseView Component (ADR-008 & TASK-M3-SENIOR)', () => {
  let mockSpeak;
  let mockCancel;

  beforeEach(() => {
    mockSpeak = jest.fn();
    mockCancel = jest.fn();

    // Mock Web Speech API in JSDOM
    window.speechSynthesis = {
      speak: mockSpeak,
      cancel: mockCancel,
      speaking: false,
    };

    // Mock SpeechSynthesisUtterance constructor
    window.SpeechSynthesisUtterance = jest.fn().mockImplementation((text) => ({
      text,
      rate: 1,
      pitch: 1,
      lang: 'en-US',
      onstart: null,
      onend: null,
      onerror: null,
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockSafeReading = {
    glucose: 125,
    rateOfChange: 0.1,
    trend: 'stable',
    trendArrow: '→',
    timestamp: new Date().toISOString(),
    source: 'simulation',
  };

  const mockLowReading = {
    glucose: 62,
    rateOfChange: -2.4,
    trend: 'falling_rapidly',
    trendArrow: '↓↓',
    timestamp: new Date().toISOString(),
    source: 'simulation',
  };

  const mockHighReading = {
    glucose: 215,
    rateOfChange: 2.8,
    trend: 'rising_rapidly',
    trendArrow: '↑↑',
    timestamp: new Date().toISOString(),
    source: 'simulation',
  };

  const mockPrediction = {
    currentGlucose: 125,
    predictions: [
      { minutesAhead: 15, projectedGlucose: 128 },
      { minutesAhead: 30, projectedGlucose: 130 },
      { minutesAhead: 45, projectedGlucose: 132 },
    ],
    breachWarning: { breachPredicted: false },
  };

  const mockPersona = {
    id: 'VP-03',
    name: 'Sarah Jenkins (Brittle Type 1)',
    baseline: 140,
  };

  it('renders giant glucose readout (minimum 72px font size class) and safe status badge', () => {
    render(
      <SeniorGlucoseView
        reading={mockSafeReading}
        prediction={mockPrediction}
        persona={mockPersona}
      />
    );

    const glucoseEl = screen.getByTestId('senior-glucose-value');
    expect(glucoseEl).toBeInTheDocument();
    expect(glucoseEl).toHaveTextContent('125');
    // Verifies giant typography classes (text-8xl, text-9xl, etc.)
    expect(glucoseEl.className).toMatch(/text-8xl/);

    expect(screen.getByText(/YOUR SUGAR IS HEALTHY & SAFE/i)).toBeInTheDocument();
    expect(screen.getAllByText(/mg\/dL/i).length).toBeGreaterThan(0);
  });

  it('displays low sugar alert and actionable 3-step checklist when glucose is below 70', () => {
    render(
      <SeniorGlucoseView
        reading={mockLowReading}
        prediction={mockPrediction}
        persona={mockPersona}
      />
    );

    expect(screen.getByText(/LOW SUGAR WARNING/i)).toBeInTheDocument();
    expect(screen.getByTestId('senior-glucose-value')).toHaveTextContent('62');

    // 3-step actionable checklist for lows
    expect(screen.getByText(/Have Fast Sugar Immediately/i)).toBeInTheDocument();
    expect(screen.getByText(/Sit Down and Rest/i)).toBeInTheDocument();
    expect(screen.getByText(/Check Again in 15 Minutes/i)).toBeInTheDocument();
  });

  it('displays high sugar alert and tailored hydration guidance when glucose is above 180', () => {
    render(
      <SeniorGlucoseView
        reading={mockHighReading}
        prediction={mockPrediction}
        persona={mockPersona}
      />
    );

    expect(screen.getByText(/HIGH SUGAR ALERT/i)).toBeInTheDocument();
    expect(screen.getByTestId('senior-glucose-value')).toHaveTextContent('215');

    // 3-step actionable checklist for highs
    expect(screen.getByText(/Drink 1 to 2 Glasses of Fresh Water/i)).toBeInTheDocument();
    expect(screen.getByText(/Avoid Sweets, Rice, and Soda/i)).toBeInTheDocument();
  });

  it('renders the 3-zone visual safety traffic light gauge with position marker', () => {
    render(
      <SeniorGlucoseView
        reading={mockSafeReading}
        prediction={mockPrediction}
        persona={mockPersona}
      />
    );

    expect(screen.getByText(/Visual Sugar Safety Gauge/i)).toBeInTheDocument();
    expect(screen.getByText(/HEALTHY SAFE ZONE/i)).toBeInTheDocument();
    expect(screen.getByTestId('senior-gauge-pointer')).toBeInTheDocument();
  });

  it('provides plain-language trend descriptions without technical calculus symbols', () => {
    const { rerender } = render(
      <SeniorGlucoseView
        reading={mockSafeReading}
        prediction={mockPrediction}
        persona={mockPersona}
      />
    );
    expect(screen.getByText(/Sugar is calm and steady/i)).toBeInTheDocument();

    rerender(
      <SeniorGlucoseView
        reading={mockLowReading}
        prediction={mockPrediction}
        persona={mockPersona}
      />
    );
    expect(screen.getByText(/Sugar is dropping quickly/i)).toBeInTheDocument();

    rerender(
      <SeniorGlucoseView
        reading={mockHighReading}
        prediction={mockPrediction}
        persona={mockPersona}
      />
    );
    expect(screen.getByText(/Sugar is rising after food/i)).toBeInTheDocument();
  });

  it('triggers Web Speech API audio narration upon clicking Listen to Sugar Status', () => {
    render(
      <SeniorGlucoseView
        reading={mockSafeReading}
        prediction={mockPrediction}
        persona={mockPersona}
      />
    );

    const speechBtn = screen.getByTestId('senior-voice-readout-button');
    expect(speechBtn).toBeInTheDocument();

    fireEvent.click(speechBtn);

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const spokenUtterance = mockSpeak.mock.calls[0][0];
    expect(spokenUtterance.text).toMatch(/Your current glucose reading is 125 milligrams per deciliter/i);
    expect(spokenUtterance.text).toMatch(/healthy safe zone/i);
    expect(spokenUtterance.lang).toBe('en-US');
  });

  it('supports bilingual voice selection between English and Tamil with localStorage persistence (TASK-M3-VOICE-TA)', () => {
    localStorage.clear();

    render(
      <SeniorGlucoseView
        reading={mockSafeReading}
        prediction={mockPrediction}
        persona={mockPersona}
      />
    );

    const enToggle = screen.getByTestId('toggle-voice-en');
    const taToggle = screen.getByTestId('toggle-voice-ta');
    const speechBtn = screen.getByTestId('senior-voice-readout-button');

    expect(enToggle).toBeInTheDocument();
    expect(taToggle).toBeInTheDocument();

    // Default is English
    expect(speechBtn).toHaveTextContent(/Listen to Sugar Status/i);

    // Switch to Tamil
    fireEvent.click(taToggle);

    // Persisted in localStorage
    expect(localStorage.getItem('glucoguard_voice_lang')).toBe('ta');

    // Button label dynamically updates to Tamil
    expect(speechBtn).toHaveTextContent(/சர்க்கரை அளவை தமிழில் கேட்க/i);

    // Trigger voice readout in Tamil
    fireEvent.click(speechBtn);

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const tamilUtterance = mockSpeak.mock.calls[0][0];
    expect(tamilUtterance.lang).toBe('ta-IN');
    expect(tamilUtterance.rate).toBe(0.85);
    expect(tamilUtterance.text).toContain('உங்கள் சர்க்கரை அளவு 125');
    expect(tamilUtterance.text).toContain('பாதுகாப்பான அளவில் உள்ளது');
    expect(tamilUtterance.text).toContain('சர்க்கரை அளவு சீராக உள்ளது');
  });

  it('speaks authentic clinical Tamil advice for hypoglycemia and hyperglycemia ranges (TASK-M3-VOICE-TA)', () => {
    localStorage.setItem('glucoguard_voice_lang', 'ta');

    const { rerender } = render(
      <SeniorGlucoseView
        reading={mockLowReading}
        prediction={mockPrediction}
        persona={mockPersona}
      />
    );

    const speechBtn = screen.getByTestId('senior-voice-readout-button');
    fireEvent.click(speechBtn);

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const lowUtterance = mockSpeak.mock.calls[0][0];
    expect(lowUtterance.lang).toBe('ta-IN');
    expect(lowUtterance.text).toContain('எச்சரிக்கை! உங்கள் சர்க்கரை அளவு குறைவாக உள்ளது (62)');
    expect(lowUtterance.text).toContain('அரை டம்ளர் பழச்சாறு');
    expect(lowUtterance.text).toContain('சர்க்கரை அளவு வேகமாக குறைகிறது');

    mockSpeak.mockClear();

    rerender(
      <SeniorGlucoseView
        reading={mockHighReading}
        prediction={mockPrediction}
        persona={mockPersona}
      />
    );

    fireEvent.click(speechBtn);

    expect(mockSpeak).toHaveBeenCalledTimes(1);
    const highUtterance = mockSpeak.mock.calls[0][0];
    expect(highUtterance.lang).toBe('ta-IN');
    expect(highUtterance.text).toContain('கவனிக்கவும்! சர்க்கரை அளவு அதிகமாக உள்ளது (215)');
    expect(highUtterance.text).toContain('தண்ணீர் குடிக்கவும்');
    expect(highUtterance.text).toContain('சர்க்கரை அளவு வேகமாக உயர்கிறது');
  });

  it('renders conversational AI 30-minute outlook summary', () => {
    render(
      <SeniorGlucoseView
        reading={mockSafeReading}
        prediction={mockPrediction}
        persona={mockPersona}
      />
    );

    expect(screen.getByText(/Simple AI 30-Minute Sugar Outlook/i)).toBeInTheDocument();
    expect(screen.getByText(/AI Forecast: Sugar projected to stay safe around 130 mg\/dL over the next 30 minutes/i)).toBeInTheDocument();
  });

  it('renders primary caregiver contact card and simulated call trigger', async () => {
    render(
      <SeniorGlucoseView
        reading={mockSafeReading}
        prediction={mockPrediction}
        persona={mockPersona}
      />
    );

    expect(screen.getByText(/Primary Contact: Sarah \(Daughter\)/i)).toBeInTheDocument();
    expect(screen.getByText(/\+91 98765 43210/i)).toBeInTheDocument();

    const callBtn = screen.getByTestId('senior-caregiver-call-button');
    fireEvent.click(callBtn);

    expect(screen.getByText(/Connecting call to Sarah/i)).toBeInTheDocument();
  });

  it('contains mandatory simulation disclaimer per ADR-007 and ADR-008', () => {
    render(
      <SeniorGlucoseView
        reading={mockSafeReading}
        prediction={mockPrediction}
        persona={mockPersona}
      />
    );

    expect(screen.getByText(/Non-Clinical Simulation Prototype Notice \(ADR-007\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/simulation/i).length).toBeGreaterThan(0);
  });
});

describe('PatientDashboard Mode Switcher (Clinical vs Senior Care Mode)', () => {
  beforeEach(() => {
    localStorage.clear();

    global.fetch = jest.fn((url) => {
      if (url.includes('/personas')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: [
                { id: 'VP-03', name: 'Sarah Jenkins', baseline: 140, deviceId: 'CGM-SENSOR-VP03' }
              ]
            })
        });
      }
      if (url.includes('/status')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { isRunning: true, isPaused: false, personaId: 'VP-03' } })
        });
      }
      if (url.includes('/prediction')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: { currentGlucose: 125, predictions: [{ minutesAhead: 30, projectedGlucose: 130 }] } })
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

  it('allows seamless toggling between Clinical View and Senior Care View', async () => {
    render(<PatientDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId('toggle-clinical-view')).toBeInTheDocument();
      expect(screen.getByTestId('toggle-senior-view')).toBeInTheDocument();
    });

    // Starts in Clinical View by default
    expect(screen.getByText(/Interstitial Glucose/i)).toBeInTheDocument();
    expect(screen.queryByTestId('senior-glucose-value')).not.toBeInTheDocument();

    // Click Senior Care View toggle
    fireEvent.click(screen.getByTestId('toggle-senior-view'));

    // Should now render Senior Care View elements
    await waitFor(() => {
      expect(screen.getByText(/Senior & Elder Accessibility View/i)).toBeInTheDocument();
      expect(screen.getByTestId('senior-voice-readout-button')).toBeInTheDocument();
    });

    // Preference persisted in localStorage
    expect(localStorage.getItem('glucoguard_view_mode')).toBe('senior');

    // Click back to Clinical View
    fireEvent.click(screen.getByTestId('toggle-clinical-view'));

    await waitFor(() => {
      expect(screen.getByText(/Interstitial Glucose/i)).toBeInTheDocument();
      expect(screen.queryByTestId('senior-glucose-value')).not.toBeInTheDocument();
    });

    expect(localStorage.getItem('glucoguard_view_mode')).toBe('clinical');
  });
});
