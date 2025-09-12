import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'background-dark': 'var(--background-dark)',
        'background-light': 'var(--background-light)',
        'sidebar-bg': 'var(--sidebar-bg)',
        foreground: 'var(--foreground)',
        primary: 'var(--primary)',
        'primary-hover': 'var(--primary-hover)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        'border-color': 'var(--border-color)',
        'input-bg': 'var(--input-bg)',
        'text-secondary': 'var(--text-secondary)',
      },
    },
  },
  plugins: [],
};
export default config;
