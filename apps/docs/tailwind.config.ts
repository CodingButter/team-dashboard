// TailwindCSS v4 configuration - most configuration is now in theme.css using @theme directive
const config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    '../../packages/ui/src/**/*.{js,ts,jsx,tsx}',
  ],
  // Note: theme configuration moved to ./src/app/theme.css using @theme directive
  // This aligns with TailwindCSS v4's CSS-first configuration approach
}

export default config