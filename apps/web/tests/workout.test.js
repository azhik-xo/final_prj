import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import WorkoutPlannerPage from '../src/app/workout/page';

// Mock fetch globally
beforeEach(() => {
  global.fetch = jest.fn((url, options) => {
    if (url.includes('/api/v1/activity/logs') && (!options || options.method === 'GET' || !options.method)) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: 'ok',
            data: [
              {
                _id: 'mock_act_01',
                name: 'Morning Power Walk',
                intensity: 'moderate',
                durationMinutes: 30,
                caloriesBurned: 135,
                startGlucose: 130,
                estimatedDrawdownMgDl: -24,
                projectedPostGlucose: 106,
                safetyStatus: 'safe',
                timestamp: new Date().toISOString()
              }
            ]
          })
      });
    }

    if (url.includes('/api/v1/activity/logs') && options && options.method === 'POST') {
      const body = JSON.parse(options.body);
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: 'ok',
            data: {
              activity: {
                _id: 'new_act_' + Date.now(),
                ...body,
                caloriesBurned: 160,
                estimatedDrawdownMgDl: -32,
                projectedPostGlucose: 108,
                safetyStatus: 'safe',
                timestamp: new Date().toISOString()
              },
              advice: {
                isSafe: true,
                safetyStatus: 'safe',
                estimatedDrawdownMgDl: -32,
                projectedPostGlucose: 108
              }
            }
          })
      });
    }

    if (url.includes('/api/v1/activity/activities')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: 'ok',
            data: [
              {
                id: 'brisk_walking',
                name: '30m Brisk Walking',
                category: 'aerobic',
                met: 3.8,
                intensity: 'moderate',
                defaultDuration: 30,
                description: 'Steady aerobic walk.'
              },
              {
                id: 'light_jogging',
                name: '20m Light Jogging',
                category: 'aerobic',
                met: 8.3,
                intensity: 'high',
                defaultDuration: 20,
                description: 'Vigorous stride.'
              }
            ]
          })
      });
    }

    if (url.includes('/api/v1/activity/recommendations')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: 'ok',
            data: {
              guidelines: [
                'Verify blood glucose before starting: 90–250 mg/dL is the target safe training zone.',
                'Always carry 15g of fast-acting simple carbohydrates.'
              ]
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

const renderWorkoutPage = async () => {
  let utils;
  await React.act(async () => {
    utils = render(<WorkoutPlannerPage />);
  });
  return utils;
};

describe('AI Workout Planner Page (Module M6 / TASK-M6-FULL)', () => {
  it('renders title, module badge, and non-clinical simulation disclaimer', async () => {
    await renderWorkoutPage();

    expect(
      screen.getByText(/AI Workout Planner & Glycemic Safety Engine/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Module M6/i)).toBeInTheDocument();
    expect(screen.getByText(/source: simulation/i)).toBeInTheDocument();

    // Disclaimer
    const disclaimer = screen.getByText(/Non-Clinical Exercise Simulation Boundary/i);
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer.parentElement.textContent).toMatch(/educational simulation prototype/i);
  });

  it('renders Clinical Safety Interlock Hero Banner in Safe state initially', async () => {
    await renderWorkoutPage();

    expect(screen.getByText(/Safe to Exercise/i)).toBeInTheDocument();
    expect(screen.getByText(/Interlock Disengaged/i)).toBeInTheDocument();
  });

  it('activates Hypoglycemia Lockout when blood glucose drops below 90 mg/dL', async () => {
    await renderWorkoutPage();

    // Click the scenario switcher button for Low / Hypo
    const hypoBtn = screen.getByRole('button', { name: /Low \/ Hypo \(78 mg\/dL\)/i });
    await React.act(async () => {
      fireEvent.click(hypoBtn);
    });

    // Check lockout state
    expect(screen.getByText(/Clinical Lockout Active/i)).toBeInTheDocument();
    expect(screen.getByText(/Exercise Locked: Low Glucose Level/i)).toBeInTheDocument();
    expect(screen.getByText(/DO NOT EXERCISE/i)).toBeInTheDocument();

    // Submit button should indicate locked state
    expect(
      screen.getByRole('button', { name: /Locked: Hypoglycemia Countermeasure Required/i })
    ).toBeDisabled();
  });

  it('renders calibrated 1-click workout presets and updates form on selection', async () => {
    await renderWorkoutPage();

    await waitFor(() => {
      expect(screen.getAllByText(/30m Brisk Walking/i).length).toBeGreaterThan(0);
    });

    const jogPreset = screen.getByRole('button', { name: /20m Light Jogging/i });
    await React.act(async () => {
      fireEvent.click(jogPreset);
    });

    // Custom workout title input should reflect selected preset
    const titleInput = screen.getByPlaceholderText(/Lakeside Jog/i);
    expect(titleInput.value).toBe('20m Light Jogging');
  });

  it('submits a safe workout, logs via API, and updates activity history', async () => {
    await renderWorkoutPage();

    const titleInput = screen.getByPlaceholderText(/Lakeside Jog/i);
    await React.act(async () => {
      fireEvent.change(titleInput, { target: { value: 'Evening Park Walk' } });
    });

    const submitBtn = screen.getByRole('button', {
      name: /Log Workout Session & Apply Drawdown/i
    });
    await React.act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(screen.getAllByText(/Evening Park Walk/i).length).toBeGreaterThan(0);
    });
  });

  it('renders Rule of 15 emergency protocol and ADA guidelines', async () => {
    await renderWorkoutPage();

    expect(
      screen.getByText(/Hypoglycemia Emergency Protocol: The Rule of 15/i)
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/15g of fast-acting simple carbohydrates/i).length
    ).toBeGreaterThan(0);
  });

  it('strictly adheres to zero-emoji policy in rendered DOM', async () => {
    const { container } = await renderWorkoutPage();
    const textContent = container.textContent || '';
    const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u26FF\u2700-\u27BF]/;
    expect(emojiRegex.test(textContent)).toBe(false);
  });
});
