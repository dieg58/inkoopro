# INKOO Visual Identity Guide

## Brand Personality
- **Sustainable & eco-friendly**: Natural, organic, calm aesthetic
- **B2B professional**: Trustworthy, clean, minimalist
- **High-quality focus**: Editorial layout, generous whitespace
- **Tagline**: "Sustainable Custom Merch"

---

## Color Palette

### Primary Colors
```css
/* Text & Headings */
--inkoo-text-primary: #1A1A1A;      /* Very dark gray, almost black */
--inkoo-text-body: #4A4A4A;          /* Medium gray for body text */

/* Backgrounds */
--inkoo-bg-primary: #FAF9F6;         /* Warm off-white */
--inkoo-bg-subtle: #F7F6F2;          /* Alternative warm beige */

/* Accents & Interactive */
--inkoo-accent-primary: #6B7769;     /* Soft muted green (earth tone) */
--inkoo-accent-hover: #5A6658;       /* Slightly darker for hover */

/* Borders & Dividers */
--inkoo-border: #E0DFDB;              /* Very soft gray */
--inkoo-border-subtle: #F0EFEB;       /* Even softer for subtle dividers */

/* Status Colors (muted, natural) */
--inkoo-success: #6B7769;             /* Natural green */
--inkoo-error: #8B6F6F;               /* Muted terracotta */
--inkoo-warning: #9A8B6F;             /* Soft amber */
```

### Usage Guidelines
- **Primary text**: Use `#1A1A1A` for headings and important text
- **Body text**: Use `#4A4A4A` for readable content
- **Backgrounds**: Always use warm off-white tones, never pure white
- **Accents**: Use sparingly, only for CTAs and interactive elements
- **Borders**: Keep very subtle, almost imperceptible

---

## Typography

### Font Stack
```css
font-family: 'Inter', 'IBM Plex Sans', 'Source Sans 3', system-ui, sans-serif;
```

### Type Scale
```css
/* Headings */
--inkoo-h1: 36px / 1.4;              /* 36px, line-height 1.4 */
--inkoo-h2: 28px / 1.4;              /* 28px, line-height 1.4 */
--inkoo-h3: 22px / 1.5;              /* 22px, line-height 1.5 */
--inkoo-h4: 18px / 1.5;              /* 18px, line-height 1.5 */

/* Body */
--inkoo-body: 16px / 1.6;            /* 16px, line-height 1.6 */
--inkoo-small: 14px / 1.5;           /* 14px, line-height 1.5 */
--inkoo-caption: 12px / 1.4;         /* 12px, line-height 1.4 */
```

### Font Weights
- **Regular**: 400 (body text)
- **Medium**: 500 (emphasis, buttons)
- **Semibold**: 600 (headings)
- **Bold**: 700 (strong emphasis, sparingly)

---

## Component Guidelines

### Buttons

#### Primary Button
```css
background: #6B7769;                  /* Soft muted green */
color: #FFFFFF;
border: none;
border-radius: 4px;
padding: 12px 24px;
font-weight: 500;
transition: background-color 0.2s ease;

/* Hover */
background: #5A6658;                   /* Slightly darker */

/* Disabled */
opacity: 0.5;
cursor: not-allowed;
```

#### Secondary Button
```css
background: transparent;
color: #1A1A1A;
border: 1px solid #E0DFDB;
border-radius: 4px;
padding: 12px 24px;
font-weight: 500;

/* Hover */
background: #F7F6F2;
border-color: #6B7769;
```

#### Ghost Button
```css
background: transparent;
color: #4A4A4A;
border: none;
padding: 8px 16px;

/* Hover */
background: #F7F6F2;
color: #1A1A1A;
```

### Cards
```css
background: #FFFFFF;
border: 1px solid #E0DFDB;
border-radius: 8px;
padding: 24px;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);  /* Very subtle shadow */
```

### Input Fields
```css
background: #FFFFFF;
border: 1px solid #E0DFDB;
border-radius: 4px;
padding: 10px 12px;
color: #1A1A1A;
font-size: 16px;

/* Focus */
border-color: #6B7769;
outline: none;
box-shadow: 0 0 0 3px rgba(107, 119, 105, 0.1);
```

### Navigation
- Clean top navbar
- No heavy shadows
- Subtle hover states
- Clear section labels
- Generous spacing between items

### Spacing System
```css
--inkoo-space-xs: 4px;
--inkoo-space-sm: 8px;
--inkoo-space-md: 16px;
--inkoo-space-lg: 24px;
--inkoo-space-xl: 32px;
--inkoo-space-2xl: 48px;
--inkoo-space-3xl: 64px;
```

---

## Animation & Transitions

### Principles
- **Subtle only**: Fade, minor scale, gentle color transitions
- **Duration**: 150-200ms for micro-interactions
- **Easing**: `ease-out` or `cubic-bezier(0.4, 0, 0.2, 1)`
- **No bouncy or dramatic animations**

### Examples
```css
/* Button hover */
transition: background-color 0.2s ease-out;

/* Card hover */
transition: box-shadow 0.2s ease-out;

/* Fade in */
transition: opacity 0.15s ease-out;
```

---

## Imagery Guidelines

- **Lifestyle product images** with neutral backgrounds
- **Soft, natural lighting**
- **Avoid bold color backgrounds** (stick to soft and natural)
- **Plenty of whitespace** around images
- **Editorial content rhythm**

---

## Accessibility

### Contrast Ratios
- **Text on background**: Minimum 4.5:1 (WCAG AA)
- **Large text**: Minimum 3:1
- **Interactive elements**: Clear focus states

### Focus States
```css
outline: 2px solid #6B7769;
outline-offset: 2px;
```

---

## Implementation Notes

1. **Never use pure white** (#FFFFFF) for backgrounds - always use warm off-white
2. **Avoid saturated colors** - keep everything muted and natural
3. **Generous whitespace** - don't crowd elements
4. **Subtle borders** - almost imperceptible
5. **Clean, minimal** - remove unnecessary decorative elements
6. **Professional B2B tone** - calm, trustworthy, quality-driven

