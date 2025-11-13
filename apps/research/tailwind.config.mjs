/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    './packages/visualization-components/src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/visualization-components/src/**/*.{js,ts,jsx,tsx,mdx}',
    '/app/packages/visualization-components/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Research paper specific colors
        paper: {
          bg: 'rgb(255, 255, 255)',
          'bg-dark': 'rgb(17, 24, 39)',
          text: 'rgb(17, 24, 39)',
          'text-dark': 'rgb(243, 244, 246)',
          border: 'rgb(229, 231, 235)',
          'border-dark': 'rgb(55, 65, 81)',
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};

