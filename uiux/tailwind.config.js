/**
 * Cấu hình Tailwind 3 cho BizCare ERP.
 *
 * Design system: Emerald Prestige (emerald + antique gold trên nền kem ấm).
 * Mọi màu đều trỏ về biến CSS trong src/styles.css, dạng "thành phần oklch"
 * (ví dụ --primary: 0.478 0.096 166) để Tailwind chèn được độ trong suốt
 * qua cú pháp bg-primary/90.
 */
import tailwindcssAnimate from "tailwindcss-animate";

const withAlpha = (variable) => `oklch(var(${variable}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        border: withAlpha('--border'),
        input: withAlpha('--input'),
        ring: withAlpha('--ring'),
        background: withAlpha('--background'),
        foreground: withAlpha('--foreground'),

        primary: {
          DEFAULT: withAlpha('--primary'),
          foreground: withAlpha('--primary-foreground'),
          deep: withAlpha('--primary-deep'),
        },
        secondary: {
          DEFAULT: withAlpha('--secondary'),
          foreground: withAlpha('--secondary-foreground'),
        },
        muted: {
          DEFAULT: withAlpha('--muted'),
          foreground: withAlpha('--muted-foreground'),
        },
        accent: {
          DEFAULT: withAlpha('--accent'),
          foreground: withAlpha('--accent-foreground'),
        },
        gold: {
          DEFAULT: withAlpha('--gold'),
          foreground: withAlpha('--gold-foreground'),
        },
        destructive: {
          DEFAULT: withAlpha('--destructive'),
          foreground: withAlpha('--destructive-foreground'),
        },
        success: {
          DEFAULT: withAlpha('--success'),
          foreground: withAlpha('--success-foreground'),
        },
        warning: {
          DEFAULT: withAlpha('--warning'),
          foreground: withAlpha('--warning-foreground'),
        },
        info: {
          DEFAULT: withAlpha('--info'),
          foreground: withAlpha('--info-foreground'),
        },
        card: {
          DEFAULT: withAlpha('--card'),
          foreground: withAlpha('--card-foreground'),
        },
        popover: {
          DEFAULT: withAlpha('--popover'),
          foreground: withAlpha('--popover-foreground'),
        },
        sidebar: {
          DEFAULT: withAlpha('--sidebar'),
          foreground: withAlpha('--sidebar-foreground'),
          primary: withAlpha('--sidebar-primary'),
          'primary-foreground': withAlpha('--sidebar-primary-foreground'),
          accent: withAlpha('--sidebar-accent'),
          'accent-foreground': withAlpha('--sidebar-accent-foreground'),
          border: withAlpha('--sidebar-border'),
          ring: withAlpha('--sidebar-ring'),
        },
        chart: {
          1: withAlpha('--chart-1'),
          2: withAlpha('--chart-2'),
          3: withAlpha('--chart-3'),
          4: withAlpha('--chart-4'),
          5: withAlpha('--chart-5'),
        },
      },
      borderRadius: {
        sm: 'calc(var(--radius) - 4px)',
        md: 'calc(var(--radius) - 2px)',
        lg: 'var(--radius)',
        xl: 'calc(var(--radius) + 4px)',
        '2xl': 'calc(var(--radius) + 8px)',
        '3xl': 'calc(var(--radius) + 12px)',
      },
      fontFamily: {
        sans: ['Manrope', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Sora', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      ringOffsetColor: {
        background: withAlpha('--background'),
      },
    },
  },
  plugins: [tailwindcssAnimate],
};
