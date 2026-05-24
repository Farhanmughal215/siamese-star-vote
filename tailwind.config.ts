import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./data/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#fdf5ec",
        brown: {
          DEFAULT: "#5a3114",
          50: "#fbf3ec",
          100: "#f1dcc7",
          200: "#dbb38c",
          300: "#b88456",
          400: "#8e5a30",
          500: "#5a3114",
          600: "#48270f",
          700: "#371d0b",
          800: "#261408",
          900: "#160b04",
        },
        mint: {
          DEFAULT: "#bbddd3",
          light: "#d4ebe2",
          dark: "#8fc4b3",
        },
        pink: {
          DEFAULT: "#e79eae",
          light: "#f3c5cf",
          dark: "#d57a8e",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 30px rgba(90, 49, 20, 0.08)",
        card: "0 10px 40px -10px rgba(90, 49, 20, 0.18)",
        glow: "0 0 40px rgba(231, 158, 174, 0.35)",
        "glass-inset":
          "inset 0 1px 0 0 rgba(255,255,255,0.6), 0 20px 50px -20px rgba(90,49,20,0.25)",
      },
      backgroundImage: {
        "cream-radial":
          "radial-gradient(ellipse at top, #fff8ef 0%, #fdf5ec 50%, #f6e6d1 100%)",
        "soft-noise":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.353 0 0 0 0 0.192 0 0 0 0 0.078 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)'/%3E%3C/svg%3E\")",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) rotate(0deg)" },
          "50%": { transform: "translateY(-20px) rotate(8deg)" },
        },
        twinkle: {
          "0%, 100%": { opacity: "0.3", transform: "scale(0.8)" },
          "50%": { opacity: "1", transform: "scale(1.1)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        "float-slow": "float 9s ease-in-out infinite",
        twinkle: "twinkle 3s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
};

export default config;
