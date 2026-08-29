---
name: image-to-code
description: Converts UI design screenshots, wireframes, and mockups into pixel-perfect, clean, modern HTML/CSS/JS or framework code. Analyzes typography, layout hierarchy, color palettes, spacing, and micro-interactions from user-provided images.
---

# Image-to-Code Skill

This skill guides the agent to convert user-provided UI screenshots, mockups, and reference images into exact, production-ready frontend code.

## 🎯 Core Principles

1. **Pixel-Accurate Visual Decomposition**:
   - **Layout Hierarchy**: Identify container structures, grids (CSS Grid), flexboxes, padding, margins, and alignment.
   - **Color Extraction**: Extract exact hex/rgba color codes for background, surface, text (primary, secondary, muted), borders, and accents.
   - **Typography Matching**: Match font families, weights (400, 500, 600, 700, 800), font sizes (px/rem), line-heights, and letter-spacing (`-0.02em`).
   - **Borders & Shadows**: Replicate exact corner radius (`border-radius`), subtle hairline borders (`1px solid rgba(...)`), and elevation shadows.

2. **Clean Component Architecture**:
   - Write clean, semantic HTML5 markup.
   - Separate reusable CSS custom properties (variables) from component styles.
   - Avoid hardcoded ad-hoc styles; bind all colors and typography to the design token system.

3. **Responsive & Half-Screen Optimization**:
   - Ensure the UI renders flawlessly both on full desktop screens and half-screen widths (700~960px).
   - Prevent horizontal scrollbars and text truncation/wrapping issues.

## 🔄 Step-by-Step Workflow

1. **Analyze Image Details**:
   - Break the image down into Top Bar / Header, Navigation / Explorer, Main Workspace, and Cards.
   - Note key interactive elements (buttons, hover effects, active badges, input fields).
2. **Define Design Tokens (CSS Variables)**:
   - Map colors, border-radii, and font sizes extracted directly from the reference image.
3. **Build Markup & CSS**:
   - Implement the exact structure matching the visual proportions of the screenshot.
4. **Verify & Self-Critique**:
   - Compare the rendered output with the original image to ensure 100% aesthetic alignment.
