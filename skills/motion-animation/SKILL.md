---
name: motion-animation
description: "Motion and animation patterns for web: CSS transitions for simple interactions, Framer Motion for complex orchestrated animations, meaningful vs. decorative motion, prefers-reduced-motion (WCAG 2.3), page transitions, and layout animations. Motion should communicate, not decorate."
---

# Motion & Animation Skill

## When to Activate

- Adding hover, focus, or click feedback to interactive elements
- Animating content entering or leaving the DOM (modals, toasts, dropdowns)
- Page transitions or route changes
- List items reordering or filtering
- Designing loading and progress animations
- Ensuring animations respect `prefers-reduced-motion`
- Auditing existing UI animations that feel slow or jarring to calibrate duration and easing curves
- Choosing between CSS transitions and Framer Motion for a given interaction complexity level

---

## Principle: Motion Should Communicate

Good motion:
- Confirms that an action was taken (button press feedback)
- Shows where something came from or is going (slide-in from right = came from right)
- Reveals hierarchy (parent expands to reveal children)
- Reduces cognitive load (layout animation shows what moved, not just where it ended up)

Bad motion:
- Decorative spinning, pulsing, or bouncing with no meaning
- Animations that delay getting to content
- Motion that conflicts with system accessibility settings

---

## Layer 1: CSS Transitions (default for most interactions)

Use CSS transitions for: hover states, focus rings, color changes, simple show/hide.

```css
/* globals.css — transition utilities */
.transition-colors { transition: color 150ms ease, background-color 150ms ease, border-color 150ms ease; }
.transition-opacity { transition: opacity 150ms ease; }
.transition-transform { transition: transform 200ms ease; }
.transition-all { transition: all 150ms ease; }

/* Standard easing curves */
:root {
  --ease-in:      cubic-bezier(0.4, 0, 1, 1);
  --ease-out:     cubic-bezier(0, 0, 0.2, 1);   /* Default for exits */
  --ease-in-out:  cubic-bezier(0.4, 0, 0.2, 1); /* Default for movement */
  --ease-spring:  cubic-bezier(0.34, 1.56, 0.64, 1); /* Slight overshoot = "spring" */
}
```

```tsx
// Tailwind transitions — always explicit duration
<button className="
  bg-brand text-white
  transition-colors duration-150
  hover:bg-brand-hover
  focus-visible:ring-2 focus-visible:ring-brand
  active:scale-95 transition-transform duration-75
">
  Click me
</button>

// Accordion with CSS only
<div className={cn(
  'overflow-hidden transition-all duration-300 ease-in-out',
  open ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
)}>
  {children}
</div>
```

---

## Layer 2: Framer Motion (orchestrated, physics-based)

Use Framer Motion for: enter/exit animations, layout animations, complex sequences, drag.

```bash
npm install framer-motion
```

### Enter/Exit Animations

```tsx
import { motion, AnimatePresence } from 'framer-motion';

// Standard presets
const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit:    { opacity: 0 },
  transition: { duration: 0.15 },
};

const slideUp = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: 4 },
  transition: { duration: 0.2, ease: [0, 0, 0.2, 1] },
};

const slideInFromRight = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: 24 },
  transition: { duration: 0.25, ease: [0, 0, 0.2, 1] },
};

const scaleIn = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit:    { opacity: 0, scale: 0.95 },
  transition: { duration: 0.15 },
};

// AnimatePresence required for exit animations
function Toast({ message, visible }: { message: string; visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          {...slideUp}
          className="fixed bottom-4 right-4 bg-surface-raised border border-border rounded-lg px-4 py-3 shadow-lg"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Modal with backdrop
function Modal({ open, onClose, children }: ModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50"
            onClick={onClose}
          />
          {/* Modal */}
          <motion.div
            {...scaleIn}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg bg-surface rounded-xl shadow-xl p-6"
          >
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
```

### Layout Animations (items reordering)

```tsx
// List reorder with smooth positional animation
function SortableList({ items }: { items: Item[] }) {
  return (
    <ul>
      <AnimatePresence initial={false}>
        {items.map(item => (
          <motion.li
            key={item.id}
            layout                           // Automatically animates position changes
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
          >
            <ListItem item={item} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
```

### Stagger (items appearing in sequence)

```tsx
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,  // Each child 50ms after previous
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show:   { opacity: 1, y: 0 },
};

function ProductGrid({ products }: { products: Product[] }) {
  return (
    <motion.ul variants={container} initial="hidden" animate="show" className="grid grid-cols-3 gap-4">
      {products.map(product => (
        <motion.li key={product.id} variants={item}>
          <ProductCard product={product} />
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

---

## prefers-reduced-motion (Required for WCAG 2.3)

Users who set "Reduce motion" in their OS must see no non-essential animation.

```tsx
// Hook: detect preference
import { useReducedMotion } from 'framer-motion';  // Built-in hook

function AnimatedCard({ children }: { children: React.ReactNode }) {
  const prefersReduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: prefersReduced ? 0 : 16 }}  // No y movement if reduced
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: prefersReduced ? 0 : 0.2 }}    // Instant if reduced
    >
      {children}
    </motion.div>
  );
}

// CSS approach (preferred for CSS transitions)
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

---

## Page Transitions (Next.js App Router)

```tsx
// app/template.tsx — re-mounts on every route change (unlike layout.tsx)
'use client';
import { motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: [0, 0, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}
```

---

## Loading Animations

```tsx
// Skeleton pulse (CSS animation — no JS needed)
// Tailwind: animate-pulse applies a subtle opacity animation

// Progress bar for page loads
function NProgress() {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  // Fake progress that asymptotically approaches 90%
  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setProgress(p => p + (90 - p) * 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed top-0 left-0 h-0.5 bg-brand z-50"
          style={{ width: `${progress}%` }}
          exit={{ opacity: 0 }}
        />
      )}
    </AnimatePresence>
  );
}

// Typing indicator (chat / AI streaming)
function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center px-3 py-2">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-text-secondary"
          animate={{ y: [0, -4, 0] }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.15,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}
```

---

## Duration Reference

| Interaction | Duration | Easing |
|-------------|----------|--------|
| Hover color/bg change | 100-150ms | ease |
| Button press feedback | 75-100ms | ease-in |
| Tooltip appear | 150ms | ease-out |
| Dropdown/menu open | 150-200ms | ease-out |
| Modal open | 200-250ms | ease-out |
| Page transition | 200-250ms | ease-in-out |
| Notification slide-in | 250-300ms | spring |
| List reorder (layout) | 200ms | ease-in-out |
| Exit animations | 50-75% of enter duration | ease-in |

**Rule:** If it feels slow, it probably is. Default to shorter durations.

---

## Checklist

- [ ] CSS transitions used for hover, focus, and color changes (not Framer Motion)
- [ ] Framer Motion used only for enter/exit, layout, and complex sequences
- [ ] `AnimatePresence` wraps any conditionally rendered animated element
- [ ] Exit animations are faster than enter animations (50-75% of enter duration)
- [ ] `useReducedMotion()` checked — all animations reduced or disabled when active
- [ ] `@media (prefers-reduced-motion: reduce)` in global CSS as a fallback
- [ ] No looping animations without user intent (auto-playing carousels, infinite spinners on static content)
- [ ] Duration < 300ms for all UI feedback (longer = feels broken)
- [ ] `layout` prop on list items that may reorder
