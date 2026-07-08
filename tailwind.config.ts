import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['selector', '[data-theme="dark"]'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    screens: {
      xs: '380px',
      sm: '480px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif',
        ],
      },
      colors: {
        brand: {
          DEFAULT: '#0091ff',
          glow: '#0091ff',
          solid: '#2563eb',
        },
        success: '#43ad6b',
        danger: '#ff3b30',
        warning: '#ff9500',
        info: '#0a84ff',
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
        },
        card: {
          DEFAULT: 'var(--card-bg)',
          solid: 'var(--card-bg-solid)',
          border: 'var(--card-border)',
        },
        divider: 'var(--divider-color)',
        input: {
          DEFAULT: 'var(--input-bg)',
          border: 'var(--input-border)',
        },
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        pill: '9999px',
      },
      backdropBlur: {
        glass: '20px',
      },
      boxShadow: {
        glowBrand: '0 0 0 3px rgba(0,145,255,0.18), 0 4px 12px rgba(0,0,0,0.22)',
        glowSuccess: '0 0 0 1px rgba(34,197,94,0.2), 0 4px 20px rgba(34,197,94,0.15)',
        glowDanger: '0 0 0 4px rgba(255,59,48,0.1)',
      },
      keyframes: {
        splashLogoIn: {
          '0%': { opacity: '0', transform: 'scale(0.5)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        splashFadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        splashShimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(350%)' },
        },
        splashGlow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        modalScaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96) translateY(8px)' },
          '100%': { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        fabBreathe: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.04)' },
        },
        coinShine: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        underlineGrow: {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
      animation: {
        splashLogoIn: 'splashLogoIn 0.7s cubic-bezier(0.34,1.56,0.64,1) both',
        splashFadeUp: 'splashFadeUp 0.6s cubic-bezier(0.4,0,0.2,1) both',
        splashShimmer: 'splashShimmer 1.6s ease-in-out infinite',
        splashGlow: 'splashGlow 3s ease-in-out infinite alternate',
        modalScaleIn: 'modalScaleIn 0.25s cubic-bezier(0.4,0,0.2,1) both',
        fabBreathe: 'fabBreathe 2.4s ease-in-out infinite',
        coinShine: 'coinShine 2.2s linear infinite',
        underlineGrow: 'underlineGrow 0.25s ease-out both',
      },
    },
  },
  plugins: [],
};

export default config;
