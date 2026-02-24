/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                'fart-bg': '#f2f2f2',
                'fart-blue': '#3378f6',
                'fart-text': '#1a1a1a',
                'fart-gray': '#e6e6e6',
                'fart-green-start': '#45b803',
                'fart-green-end': '#3ab300',
            },
            boxShadow: {
                'card': '0 20px 40px rgba(0, 0, 0, 0.45)',
                'toggle': '0 2px 4px rgba(0,0,0,0.2)',
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'], // Keep Inter but it looks standard
            }
        },
    },
    plugins: [],
}
