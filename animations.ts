import { Variants } from 'framer-motion';

// ── Fade Variants ─────────────────────────────────────────
export const fadeInUp: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: 8, transition: { duration: 0.2 } },
};

export const fadeInDown: Variants = {
  hidden:  { opacity: 0, y: -12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, y: -8 },
};

export const fadeInLeft: Variants = {
  hidden:  { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, x: -10 },
};

export const fadeInRight: Variants = {
  hidden:  { opacity: 0, x: 20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, x: 10 },
};

export const fadeIn: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};

// ── Scale Variants ────────────────────────────────────────
export const scaleIn: Variants = {
  hidden:  { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] } },
  exit:    { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

export const scaleInBounce: Variants = {
  hidden:  { opacity: 0, scale: 0.85 },
  visible: {
    opacity: 1, scale: 1,
    transition: { type: 'spring', stiffness: 400, damping: 25 },
  },
  exit: { opacity: 0, scale: 0.9 },
};

// ── Stagger Container ─────────────────────────────────────
export const staggerContainer: Variants = {
  hidden:  { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

export const staggerContainerFast: Variants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0 } },
};

export const staggerItem: Variants = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
};

// ── Slide Variants ────────────────────────────────────────
export const slideInFromRight: Variants = {
  hidden:  { x: '100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit:    { x: '100%', opacity: 0, transition: { duration: 0.25 } },
};

export const slideInFromLeft: Variants = {
  hidden:  { x: '-100%', opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit:    { x: '-100%', opacity: 0, transition: { duration: 0.25 } },
};

export const slideIn: Variants = {
  hidden:  { height: 0, opacity: 0 },
  visible: { height: 'auto', opacity: 1, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } },
  exit:    { height: 0, opacity: 0, transition: { duration: 0.2 } },
};

// ── Page Transition ───────────────────────────────────────
export const pageTransition: Variants = {
  hidden:  { opacity: 0, y: 8 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0, y: -8,
    transition: { duration: 0.2 },
  },
};

// ── Card Hover ────────────────────────────────────────────
export const cardHover = {
  rest:  { scale: 1, boxShadow: '0 1px 3px rgba(0,0,0,.06)' },
  hover: {
    scale: 1.01,
    boxShadow: '0 4px 16px rgba(0,0,0,.12)',
    transition: { duration: 0.2 },
  },
};

// ── Stats Card Stagger ────────────────────────────────────
export const statsCardVariants: Variants = {
  hidden:  { opacity: 0, y: 20, scale: 0.96 },
  visible: (i: number) => ({
    opacity: 1, y: 0, scale: 1,
    transition: { delay: i * 0.1, duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  }),
};

// ── Row Hover ─────────────────────────────────────────────
export const rowHover = {
  rest:  { backgroundColor: 'transparent', x: 0 },
  hover: { backgroundColor: 'rgba(30,58,95,.03)', x: 2, transition: { duration: 0.15 } },
};

// ── Notification Badge ────────────────────────────────────
export const badgePop: Variants = {
  hidden:  { scale: 0, opacity: 0 },
  visible: {
    scale: 1, opacity: 1,
    transition: { type: 'spring', stiffness: 500, damping: 20 },
  },
};

// ── Dropdown ──────────────────────────────────────────────
export const dropdownVariants: Variants = {
  hidden:  { opacity: 0, scale: 0.95, y: -8 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { duration: 0.18, ease: [0.4, 0, 0.2, 1] },
  },
  exit: { opacity: 0, scale: 0.95, y: -4, transition: { duration: 0.12 } },
};

// ── Modal ─────────────────────────────────────────────────
export const modalOverlay: Variants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit:    { opacity: 0, transition: { duration: 0.15 } },
};

export const modalContent: Variants = {
  hidden:  { opacity: 0, scale: 0.93, y: 20 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { type: 'spring', stiffness: 350, damping: 30 },
  },
  exit: { opacity: 0, scale: 0.96, y: 10, transition: { duration: 0.2 } },
};

// ── Sidebar ───────────────────────────────────────────────
export const sidebarVariants: Variants = {
  open: {
    width: 260,
    transition: { type: 'spring', stiffness: 280, damping: 28 },
  },
  closed: {
    width: 72,
    transition: { type: 'spring', stiffness: 280, damping: 28 },
  },
};

export const sidebarLabelVariants: Variants = {
  open:   { opacity: 1, x: 0, display: 'block', transition: { delay: 0.1, duration: 0.2 } },
  closed: { opacity: 0, x: -10, transitionEnd: { display: 'none' } },
};

// ── Chart draw-on ─────────────────────────────────────────
export const chartLineVariants = {
  hidden:  { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1, opacity: 1,
    transition: { pathLength: { duration: 1.2, ease: 'easeInOut' }, opacity: { duration: 0.3 } },
  },
};
