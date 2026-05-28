/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/observatory/**/*.{js,ts,jsx,tsx,mdx}',
    './src/hooks/**/*.{js,ts,jsx,tsx,mdx}',
    './src/lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        gold: '#D4AF37',
        goldSoft: '#C8A951',
        void: '#0A0905',
        ink: '#1A1817',
        paper: '#F7F4EA',
        signalRed: '#B85050',
        signalBlue: '#4A7AAA'
      },
      fontFamily: {
        mono: ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
        serif: ['var(--font-serif)', 'Cormorant Garamond', 'Georgia', 'serif'],
        display: ['var(--font-display)', 'Syncopate', 'Montserrat', 'sans-serif']
      },
      boxShadow: {
        terminal: '0 24px 70px rgba(0, 0, 0, 0.42)'
      }
    }
  },
  plugins: []
}
