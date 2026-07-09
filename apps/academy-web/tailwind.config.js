/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Florence brand — sampled from the Florence Field Guide to RN: deep navy
        // ink, royal-purple indigo, and a cyan-teal accent, so the academy reads
        // as the same product as the guide.
        florence: {
          teal: "#15ABA8", // guide cyan-teal accent (#28B4B4 / #1EAAAA family)
          "teal-dark": "#0B7E80", // AA text/hover on white
          "teal-soft": "#E2F5F4", // pale teal tint for selected states
          indigo: "#2A2A8C", // guide royal indigo (#28288C)
          "indigo-dark": "#1B0E54", // guide deep royal purple (#1E0A50 / #1C0A50)
          "indigo-soft": "#EAE8F6",
          ink: "#141E32", // guide navy chrome (dominant #141E32)
          slate: "#545E72", // navy-leaning slate
          mist: "#F4F7FB", // cool off-white page
          line: "#E2E7F0", // navy-tinted hairline
        },
        // Clinical signal colors for the monitor + rationale callouts
        vital: {
          hr: "#E5484D", // heart rate — red (clinical, unchanged)
          bp: "#2A2A8C", // blood pressure — brand indigo
          spo2: "#15ABA8", // oxygen saturation — brand teal
          warn: "#E8A53D",
          danger: "#E5484D",
          ok: "#2B915F",
        },
      },
      fontFamily: {
        serif: ['"Newsreader"', "Georgia", "serif"],
        sans: ['"Inter"', "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.25rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,30,50,0.04), 0 8px 24px -12px rgba(20,30,50,0.12)",
        "card-lg": "0 2px 4px rgba(20,30,50,0.05), 0 18px 48px -18px rgba(27,14,84,0.22)",
      },
      backgroundImage: {
        // Jewel-tone hero: cyan-teal into the guide's deep royal purple.
        "florence-gradient":
          "linear-gradient(135deg, #15ABA8 0%, #0B7E80 45%, #1B0E54 130%)",
        "indigo-gradient": "linear-gradient(135deg, #2A2A8C 0%, #1B0E54 100%)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "pulse-dot": "pulse-dot 1.1s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
