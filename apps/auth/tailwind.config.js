/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  // Structural prefix so this app's utility classes can never collide with
  // another MFE's utilities once both are mounted in the host DOM.
  // See docs/04-style-isolation.md.
  prefix: "auth-",
  theme: {
    extend: {},
  },
  plugins: [],
};
