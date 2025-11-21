/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}',
    './packages/visualization-components/src/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/visualization-components/src/**/*.{js,ts,jsx,tsx,mdx}',
    '/app/packages/visualization-components/src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

