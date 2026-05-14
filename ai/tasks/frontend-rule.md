# Rules & Task Plan for POS Web Application Development – Accessibility-First

> **Goal:** Build a web-based Point of Sale application with an intuitive interface, high performance, working seamlessly across devices (desktop, tablet), and strictly adhering to WCAG 2.1 AA accessibility standards. This ensures every cashier – including those with disabilities – can operate it with ease.

---

## 1. Design & Development Principles (Rules)

These principles apply throughout the entire development process, from UI/UX design to coding.

### 1.1. Accessibility – Top Priority
- **Full keyboard support:** Every function must be operable using only the keyboard (Tab, Enter, Space, Esc, Arrow keys). No keyboard traps. Focus order must follow the natural workflow.
- **Semantic HTML:** Use proper elements like `<button>`, `<input>`, `<table>`, `<header>`, `<main>`, `<nav>`, `<dialog>`. Only use `<div>` for layout when no semantic element fits.
- **ARIA – only when necessary:** Prefer standard HTML. Add `aria-label`, `aria-labelledby`, `aria-describedby`, `aria-live`, `role` only when semantics can’t be conveyed natively. For example, dynamic error messages must have `role="alert"` or `aria-live="polite"`.
- **Clear labels & descriptions:** Every input field and button must have a visible label linked with `for`/`id`. Icon-only buttons must have an `aria-label` (e.g., “Remove item”, “Increase quantity”).
- **Color & contrast:**
  - Minimum contrast ratio of 4.5:1 for normal text, 3:1 for large text (≥18px or ≥14px bold).
  - Do not rely solely on color to convey information (error/success states must include an icon and text).
- **Touch target size:** Interactive elements (buttons, checkboxes, radios) must be at least 44×44px (WCAG 2.5.5) with sufficient spacing to prevent mis-taps.
- **Feedback & notifications:**
  - Every action (adding to cart, payment error, printing receipt) must provide clear text feedback, not just color. Use an `aria-live` region to announce changes to screen readers instantly.
  - On form errors, focus must automatically move to the error summary or the first invalid field.
- **Focus management:** When opening a modal (customer selection, payment), focus must move into the first focusable element and be trapped inside. When closing, focus returns to the triggering button.
- **Zoom support:** Layout must not break at 200% zoom. Use relative units (rem/em) for font sizes and padding.

### 1.2. Efficient & Friendly UI/UX
- **Clean, task-focused layout:** The main POS screen consists of three clear zones: product list, current cart, and total/payment actions.
- **Quick search:** A persistent search bar supports lookup by name, SKU, or barcode. Auto-focuses on page load.
- **Speed actions:** Keyboard shortcuts for frequent tasks (F2: search, F4: checkout, Esc: cancel/close). Show small tooltips for shortcuts to help new users.
- **Responsive & adaptive:** Works smoothly on touch tablet (1024px+) and desktop. Layout can shift from two columns (products + cart) to a step-based flow on narrower screens.
- **Error prevention:** Cash payment and bank transfer buttons require a clear confirmation step. Canceling an order triggers a confirmation popup to avoid accidental data loss.

### 1.3. Performance & Technical
- **Fast load times:** Code splitting, lazy loading non-critical parts. First Input Delay (FID) < 100ms.
- **Global state management:** Use a state library (Zustand, Redux Toolkit) for cart, store info, printing config.
- **Offline-first (if needed):** Temporarily store orders using IndexedDB when offline; sync when connectivity returns.
- **Testing:** Write unit tests for price/tax calculations; integration tests for checkout flow; E2E tests with Cypress/Playwright integrating axe-core for automated accessibility checks.

---

## 2. Task List (Tasks)

Tasks are grouped by phase. Each includes technical requirements, acceptance criteria (AC), and accessibility notes.

### Phase 1: Project Setup & Infrastructure

- [ ] **T1. Initialize project with Vite + React (or Next.js)**
  - Install TypeScript, ESLint, Prettier, Husky.
  - Set up UI/icon libraries (e.g., Tailwind CSS, Headless UI, Lucide Icons).
  - Establish folder structure: `components/`, `hooks/`, `stores/`, `utils/`.
  - AC: `npm run dev` starts successfully, build is clean, README is present.

- [ ] **T2. Set up automated accessibility testing**
  - Integrate `eslint-plugin-jsx-a11y` into ESLint config.
  - Configure axe-core in development (console warnings) or use `@axe-core/react`.
  - AC: Linter catches accessibility violations before commits. Axe DevTools can be used manually.

- [ ] **T3. Build a basic Design System – Accessible Components**
  - Create atomic components: Button, Input, Select, Modal, Badge, Table, Toast (with aria-live).
  - Each component must:
    - Include necessary `aria-*` attributes.
    - Accept a `className` prop for customization.
    - Have Storybook stories or a demo page.
  - Example: `Button` accepts `aria-label` when icon-only, has a visible `focus-visible` style, and uses `aria-disabled` if needed to remain in tab order.
  - AC: All components pass basic screen reader (NVDA/VoiceOver) and keyboard navigation tests.

### Phase 2: Core POS Features

- [ ] **T4. Main Screen – Layout & Navigation**
  - Two-column layout for tablet/desktop: left sidebar (categories, search), right area (cart + total).
  - Cart area remains sticky while scrolling the product list.
  - AC: Focus flows logically from products to cart when pressing Tab. Empty cart shows “Cart is empty” message (read by screen readers).

- [ ] **T5. Product List & Search**
  - Display products in a grid/card layout (image, name, price).
  - Search field with `aria-label="Search products by name or code"`, auto-focused on load.
  - Debounced input (300ms), suggestions list appears, navigable by arrow keys and Enter.
  - AC: Entire search and select process works with keyboard only. Screen reader announces the number of results found.

- [ ] **T6. Cart & Temporary Order Management**
  - Display cart items in a table (name, quantity, unit price, line total, delete button).
  - Each row has increase/decrease quantity buttons with descriptive `aria-label` (e.g., “Increase quantity of Latte”).
  - Quantity can be changed via buttons or input field. Total updates and an `aria-live="polite"` region announces “Total updated: 150,000đ”.
  - “Clear all” button with confirmation modal (focus trapped inside).
  - AC: Items can be removed using only keyboard. After deletion, focus moves to the next logical element (next delete button or first row).

- [ ] **T7. Checkout Flow**
  - “Checkout” button (F4) opens a payment modal/popup.
  - Modal contains payment methods: Cash, Bank Transfer, E-wallet.
  - For cash, enter amount received; auto-calculate change.
  - Confirming payment creates the order, saves to state, and calls backend API.
  - On success, show result screen with `aria-live` announcement, focus moves to “Print receipt” or “Next order” button.
  - AC: Entire flow works via keyboard. Modal traps focus. Errors (e.g., no method selected) are shown in the modal and focus jumps to the error message.

- [ ] **T8. Receipt Printing & Print Configuration**
  - Use `window.print()` or `react-to-print`. Apply print-specific CSS to hide non-essential elements.
  - Receipt must include store info, date/time, item list, total, QR code (if needed).
  - AC: Printing via keyboard (Ctrl+P or print button) yields a clear, high-contrast receipt. An aria-live region announces “Printing…” and “Print successful”.

### Phase 3: UI/UX Polish & Advanced Accessibility

- [ ] **T9. Keyboard Shortcuts & User Help**
  - Global shortcuts: F1: help, F2: search, F4: checkout, Esc: close/cancel.
  - A help modal (F1) lists all shortcuts, closable with Esc.
  - AC: Shortcuts work without conflicting with browser defaults (using `preventDefault` if necessary). Screen reader users can open help and hear the list.

- [ ] **T10. Themes & Visual Customization**
  - Support light/dark mode following system preference or a toggle.
  - Ensure dark mode colors still meet WCAG contrast ratios.
  - Allow users to change font size (small/medium/large) in app settings.
  - AC: Theme switches instantly without flash. All components respond to font size changes.

- [ ] **T11. Comprehensive Error Handling & Empty States**
  - Every loading, empty, and error state has a friendly UI and screen reader announcement.
  - Example: product list loading failure shows error message with “Retry” button, focus moves to it.
  - Empty cart: illustration and text “No items yet” hidden from tab order but read by screen reader (using `aria-live` or `sr-only`).

- [ ] **T12. Real-World Assistive Technology Testing**
  - Walk through all main flows with **NVDA** (Windows) and **VoiceOver** (Mac).
  - Perform the entire process using only the keyboard: add product, adjust quantity, checkout, print.
  - Use **Axe DevTools** and **Lighthouse** to measure accessibility score (target ≥95).
  - Document and fix all issues.
  - AC: No critical or serious accessibility violations. All tasks can be completed using only the keyboard.

### Phase 4: Testing & Deployment

- [ ] **T13. Write E2E Tests with Accessibility Checks**
  - Script the checkout flow in Cypress/Playwright, integrating `cypress-axe` or `@axe-core/playwright` to automatically check WCAG at each step.
  - AC: CI pipeline runs E2E tests including accessibility; new violations fail the build.

- [ ] **T14. Manual User Evaluation & Final Polish**
  - Invite at least 2 real users (preferably including a screen reader user) to complete a POS transaction.
  - Gather feedback and refine UI/UX.
  - AC: No critical issues blocking task completion for real users.

- [ ] **T15. User Documentation (Including Accessibility)**
  - Write a concise guide for cashiers covering:
    - Basic operations.
    - List of keyboard shortcuts.
    - How to enable browser accessibility features if needed.
  - AC: Document is easy to understand, printable, or viewable within the app.

---

## 3. Definition of Done

A feature is considered **Done** only when:
- Code has been reviewed and passes ESLint (including jsx-a11y rules).
- Tested on at least 2 browsers (Chrome, Edge) and 2 devices (tablet, desktop).
- No critical accessibility violations detected by axe DevTools.
- The main flow can be completed entirely with the keyboard.
- Dynamic announcements are read correctly by at least one screen reader.

---

## Conclusion

This rule set and plan ensure the POS application is not only beautiful, fast, and easy to use but also opens the door for every employee, regardless of physical ability or assistive technology. Following these guidelines from the start reduces long-term rework costs and strengthens product credibility.