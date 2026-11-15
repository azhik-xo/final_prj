/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/app/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        glucose: {
          veryLow: '#dc2626', // < 54 mg/dL
          low: '#ea580c',     // 54-69 mg/dL
          target: '#16a34a',  // 70-180 mg/dL
          high: '#eab308',    // 181-250 mg/dL
          veryHigh: '#b91c1c' // > 250 mg/dL
        }
      }
    },
  },
  plugins: [],
};

