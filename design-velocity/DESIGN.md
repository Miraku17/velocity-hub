```markdown
# Design System Strategy: The Kinetic Court

## 1. Overview & Creative North Star
This design system is built upon the Creative North Star of **"Kinetic Precision."** It rejects the static, boxy nature of traditional sports apps in favor of an editorial, high-performance aesthetic that mirrors the speed of a pickleball match. 

We achieve a "High-End Editorial" feel through intentional asymmetry—placing bold, oversized typography against tight, technical data. By breaking the grid with overlapping elements and shifting away from traditional borders, we create a sense of forward motion. This system isn't just a booking tool; it is a premium digital clubhouse for the modern athlete.

---

## 2. Colors & Surface Architecture
The palette is rooted in the heritage of the sport but executed with modern sophistication. 

### The Palette
*   **Primary (`#182916`):** Our Deep Forest Green. Used for core branding and high-intent actions.
*   **Surface (`#fbf9f2`):** A warm, luxurious cream that provides a softer, more premium high-contrast base than pure white.
*   **Tertiary (`#282515`):** Our Black variant, used for grounded elements and deep contrast.

### The "No-Line" Rule
To maintain an elite, editorial feel, **1px solid borders are strictly prohibited** for sectioning or containment. Boundaries must be defined solely through background color shifts or tonal transitions.
*   Use a `surface-container-low` (`#f5f4ed`) section sitting on a `surface` (`#fbf9f2`) background to create a logical break.
*   Vertical white space from our Spacing Scale (specifically `12` or `16` units) should be the primary method for separating content blocks.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use tonal layering to define importance:
1.  **Base:** `surface` (`#fbf9f2`)
2.  **Sectioning:** `surface-container-low` (`#f5f4ed`)
3.  **Floating Cards/Modals:** `surface-container-lowest` (`#ffffff`) for maximum "pop" and lift.

### The "Glass & Gradient" Rule
To avoid a flat "template" look, utilize **Glassmorphism** for floating elements (like navigation bars or hovering court filters). Use semi-transparent versions of `surface` with a `backdrop-blur` of 12px–20px. For main CTAs, apply a subtle linear gradient from `primary` (`#182916`) to `primary-container` (`#2d3f2a`) at a 145-degree angle to add depth and "soul."

---

## 3. Typography
Typography is our primary vehicle for expressing "Velocity." We utilize a high-contrast scale to create an editorial hierarchy.

*   **Display & Headline (Space Grotesk):** This typeface conveys technical precision. Use `display-lg` and `headline-lg` for hero sections, often with negative letter-spacing (-0.02em) to feel tighter and more aggressive.
*   **Body (Manrope):** A clean, modern sans-serif that ensures readability for court rules and booking details.
*   **Labels (Lexend):** Used for "Micro-data" (e.g., "Court 4", "10:00 AM"). Lexend’s geometric clarity makes small numbers and technical specs feel high-performance.

**Editorial Tip:** Pair a `display-lg` headline with a `label-md` uppercase tag immediately above it to create an "asymmetric stack" common in high-end sports magazines.

---

## 4. Elevation & Depth
Depth is achieved through **Tonal Layering** rather than structural shadows.

*   **The Layering Principle:** Place a `surface-container-lowest` card on a `surface-container-low` background to create a soft, natural lift without shadows.
*   **Ambient Shadows:** When a true "floating" effect is required (e.g., a booking confirmation modal), use extra-diffused shadows.
    *   *Shadow Color:* Use a 6% opacity version of `on-surface` (`#1b1c18`).
    *   *Blur:* 40px to 60px for a soft, ambient glow that mimics stadium lighting.
*   **The Ghost Border Fallback:** If a boundary is required for accessibility, use a "Ghost Border": the `outline-variant` (`#c4c8bf`) at 15% opacity. Never use 100% opaque lines.

---

## 5. Components

### Buttons (The "Performance" Variant)
*   **Primary:** Background `primary` (`#182916`), Text `on-primary` (`#ffffff`). Use `md` (0.375rem) rounded corners.
*   **Secondary:** Background `secondary_container` (`#e2dfde`), Text `on-secondary_container` (`#636262`). No border.
*   **Interaction:** On hover, primary buttons should transition to a `primary_container` color with a slight horizontal expansion (2px).

### Chips (Availability & Skills)
*   Use `secondary_fixed` (`#e5e2e1`) for unselected states and `primary` for selected. 
*   Corners should be `full` (9999px) for a streamlined, aerodynamic look.

### Input Fields
*   **Style:** Minimalist. No bottom line or full box. Use a `surface-container-high` (`#eae8e1`) background with `sm` roundedness. 
*   **Focus State:** A 2px "Ghost Border" of the `primary` color at 40% opacity.

### Court Cards & Lists
*   **Rule:** Forbid the use of divider lines between court listings. 
*   **Layout:** Use `spacing-6` (1.5rem) of vertical gap. Apply a subtle `surface-variant` background to every second item in a list to create a "Zebra" rhythm that feels intentional and premium.
*   **Asymmetry:** Place the court number in a large `display-sm` font on the right, slightly overlapping the card's edge, to create a custom, "non-app" look.

---

## 6. Do’s and Don’ts

### Do:
*   **Embrace Whitespace:** Treat it as a luxury material. Let the Cream `surface` breathe.
*   **Use Intentional Asymmetry:** Align text to the left but place technical data or "Book Now" CTAs in unexpected, floating positions.
*   **Layer Surfaces:** Always think "What layer is this on?" before picking a background color.

### Don't:
*   **Don't use 1px Borders:** This is the quickest way to make the design system look like a generic template.
*   **Don't use Pure Black:** Always use `tertiary` (`#282515`) for a softer, more organic professional look.
*   **Don't use Standard Shadows:** Avoid the "drop shadow" look. Use tonal shifts or ambient, wide-blur glows only.
*   **Don't Over-round:** Stick to `md` (0.375rem) for most containers. Avoid "bubbly" UI; keep it sharp and high-performance.```