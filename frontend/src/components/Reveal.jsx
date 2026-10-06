import { motion } from 'framer-motion';

/**
 * Reveal-on-scroll wrapper. Animates once when scrolled into view.
 * Falls back to plain opacity when the visitor prefers reduced motion.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 24,
  x = 0,
  as = 'div',
  className,
  style,
  ...rest
}) {
  const MotionTag = motion[as] || motion.div;
  return (
    <MotionTag
      className={className}
      style={style}
      initial={{ opacity: 0, x, y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}
