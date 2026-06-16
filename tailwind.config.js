/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: ['IBM Plex Sans', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      colors: {
        'primary-blue': '#2f6df0',
        'primary-blue-dark': '#1f57d6',
        'primary-blue-tint': '#eef3fe',
        'primary-blue-tint-line': '#d6e4ff',
        'primary-surface': '#ffffff',
        'primary-surface-2': '#fbfcfd',
        'primary-bg': '#eef0f3',
        'primary-ink': '#1b2230',
        'primary-ink-soft': '#59616f',
        'primary-ink-faint': '#8b919c',
        'primary-line': '#e6e8ec',
        'primary-line-soft': '#eef0f2',
      },
      backgroundColor: {
        'bg': '#eef0f3',
        'surface': '#ffffff',
        'surface-2': '#fbfcfd',
        'blue': '#2f6df0',
        'blue-dark': '#1f57d6',
        'blue-tint': '#eef3fe',
      },
      textColor: {
        'ink': '#1b2230',
        'ink-soft': '#59616f',
        'ink-faint': '#8b919c',
      },
      borderColor: {
        'line': '#e6e8ec',
        'line-soft': '#eef0f2',
        'blue-tint-line': '#d6e4ff',
      },
      borderRadius: {
        '3xl': '16px',
      },
    },
  },
}
