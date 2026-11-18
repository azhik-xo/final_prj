import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DietPlannerPage from '../src/app/diet/page';

// Mock fetch globally
beforeEach(() => {
  global.fetch = jest.fn((url, options) => {
    if (url.includes('/api/v1/diet/meals') && (!options || options.method === 'GET' || !options.method)) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: 'ok',
            data: [
              {
                _id: 'mock_m1',
                name: 'Avocado Toast with Poached Egg',
                mealType: 'breakfast',
                carbs: 22,
                protein: 12,
                fat: 14,
                fiber: 6,
                glycemicIndex: 40,
                estimatedSpikeMgDl: 18,
                timeToPeakMinutes: 55,
                riskLevel: 'safe',
                timestamp: new Date().toISOString()
              }
            ]
          })
      });
    }

    if (url.includes('/api/v1/diet/meals') && options && options.method === 'POST') {
      const body = JSON.parse(options.body);
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: 'ok',
            data: {
              meal: {
                _id: 'new_m_' + Date.now(),
                ...body,
                estimatedSpikeMgDl: 34,
                timeToPeakMinutes: 50,
                riskLevel: 'moderate',
                timestamp: new Date().toISOString()
              }
            }
          })
      });
    }

    if (url.includes('/api/v1/diet/foods')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: 'ok',
            data: [
              {
                id: 'oatmeal_almonds',
                name: 'Steel-Cut Oatmeal with Almonds',
                category: 'breakfast',
                carbs: 32,
                protein: 8,
                fat: 7,
                fiber: 6,
                glycemicIndex: 42,
                calories: 220,
                giCategory: 'low'
              },
              {
                id: 'grilled_chicken_salad',
                name: 'Mediterranean Grilled Chicken Salad',
                category: 'dinner',
                carbs: 8,
                protein: 28,
                fat: 9,
                fiber: 4,
                glycemicIndex: 20,
                calories: 230,
                giCategory: 'low'
              }
            ]
          })
      });
    }

    if (url.includes('/api/v1/diet/recommendations')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            success: true,
            status: 'ok',
            data: {
              swaps: [
                {
                  originalFood: 'Polished White Rice',
                  originalGi: 73,
                  recommendedSwap: 'Brown Basmati Rice or Quinoa',
                  recommendedGi: 45,
                  glycemicBenefit: 'Reduces peak post-meal spike by ~28 mg/dL',
                  fiberIncreaseGrams: 5.0,
                  reason: 'High insoluble fiber buffers glucose.'
                }
              ],
              guidelines: [
                'Prioritize non-starchy vegetables on half your plate.',
                'Combine complex carbs with protein and fats.'
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

const renderDietPage = async () => {
  let utils;
  await React.act(async () => {
    utils = render(<DietPlannerPage />);
  });
  return utils;
};

describe('AI Diet Planner Page (Module M5 / TASK-M5-FULL)', () => {
  it('renders title, module badge, and mandatory non-clinical simulation disclaimer', async () => {
    await renderDietPage();

    expect(
      screen.getByText(/AI Diet Planner & Nutritional Telemetry/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Module M5/i)).toBeInTheDocument();
    expect(screen.getByText(/source: simulation/i)).toBeInTheDocument();

    // Clinical Safety Disclaimer Check
    const disclaimer = screen.getByText(/Non-Clinical Medical Simulation Boundary/i);
    expect(disclaimer).toBeInTheDocument();
    expect(disclaimer.parentElement.textContent).toMatch(/prescribe, or titrate insulin doses/i);
    expect(disclaimer.parentElement.textContent).toMatch(/educational simulation prototype/i);
  });

  it('renders 1-click preset cards and updates form when clicked', async () => {
    await renderDietPage();

    await waitFor(() => {
      expect(screen.getAllByText(/Steel-Cut Oatmeal with Almonds/i).length).toBeGreaterThan(0);
    });

    // Check custom logger has initial preset loaded
    const mealInput = screen.getByPlaceholderText(/Quinoa Salad/i);
    expect(mealInput).toBeInTheDocument();

    // Click another preset if available
    const saladPreset = screen.getByText(/Mediterranean Grilled Chicken Salad/i);
    await React.act(async () => {
      fireEvent.click(saladPreset);
    });

    // Form should update description to Grilled Chicken Salad
    expect(mealInput.value).toBe('Mediterranean Grilled Chicken Salad');
  });

  it('calculates real-time predicted glycemic excursion and peak time', async () => {
    await renderDietPage();

    // Check estimated delta readout exists
    expect(screen.getByText(/Estimated Peak Delta/i)).toBeInTheDocument();
    expect(screen.getByText(/2-Hour Excursion Projection/i)).toBeInTheDocument();
    expect(screen.getByText(/Macro Composition/i)).toBeInTheDocument();
  });

  it('submits meal form, logs meal via API, and updates meal history', async () => {
    await renderDietPage();

    const mealInput = screen.getByPlaceholderText(/Quinoa Salad/i);
    await React.act(async () => {
      fireEvent.change(mealInput, { target: { value: 'Lentil Soup with Spinach' } });
    });

    const submitBtn = screen.getByRole('button', {
      name: /Log Meal & Calculate Excursion/i
    });
    await React.act(async () => {
      fireEvent.click(submitBtn);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/successfully logged/i)
      ).toBeInTheDocument();
    });

    // Table should contain the newly logged meal
    expect(screen.getByText('Lentil Soup with Spinach')).toBeInTheDocument();
  });

  it('renders intelligent low-GI food substitutions and guidelines', async () => {
    await renderDietPage();

    await waitFor(() => {
      expect(
        screen.getByText(/Intelligent Low-GI Food Substitutions/i)
      ).toBeInTheDocument();
    });

    expect(screen.getAllByText(/Polished White Rice/i).length).toBeGreaterThan(0);
    expect(
      screen.getByText(/Diabetic Healthy Plate Guidelines/i)
    ).toBeInTheDocument();
  });

  it('strictly adheres to zero-emoji policy in rendered DOM', async () => {
    const { container } = await renderDietPage();
    const textContent = container.textContent || '';
    const emojiRegex = /[\uD83C-\uDBFF\uDC00-\uDFFF\u2600-\u26FF\u2700-\u27BF]/;
    expect(emojiRegex.test(textContent)).toBe(false);
  });
});
