/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['Satoshi', 'sans-serif'],
      },
      colors: {
        surface: {
          base: '#0a0e1a',
          raised: '#0f1629',
          card: '#141d35',
          glass: 'rgba(20, 29, 53, 0.6)',
        },
        border: {
          DEFAULT: 'rgba(56, 97, 150, 0.12)',
          hover: 'rgba(56, 97, 150, 0.25)',
          glow: 'rgba(6, 182, 212, 0.3)',
        },
        accent: {
          cyan: '#06b6d4',
          neon: '#22d3ee',
          blue: '#3b82f6',
          indigo: '#6366f1',
          DEFAULT: '#3b82f6',
          hover: '#2563eb',
          muted: 'rgba(59, 130, 246, 0.1)',
        },
        text: {
          primary: '#f0f4f8',
          secondary: '#7b8fa8',
          muted: '#4a5e78',
        },
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
      },
      boxShadow: {
        card: '0 4px 24px -4px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(56, 97, 150, 0.08)',
        elevated: '0 8px 40px -8px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(6, 182, 212, 0.15)',
        glow: '0 0 24px -4px rgba(6, 182, 212, 0.4)',
        'glow-sm': '0 0 12px -2px rgba(6, 182, 212, 0.3)',
      },
    },
  },
  plugins: [],
}
