import { motion, AnimatePresence } from 'framer-motion';

interface ScoreDisplayProps {
  score: number;
  giant?: boolean;
  blind?: boolean;
  highlight?: boolean;
}

export function ScoreDisplay({ score, giant, blind, highlight }: ScoreDisplayProps) {
  const digits = String(score).padStart(2, '0');

  const sizeClass = blind
    ? 'text-score-blind'
    : giant
    ? 'text-score-lg'
    : 'text-score';

  return (
    <div className={`flex items-center justify-center ${sizeClass} tabular-nums`}>
      <AnimatePresence mode="popLayout">
        {digits.split('').map((digit, i) => (
          <motion.span
            key={`${i}-${digit}`}
            layout
            initial={{ y: -30, opacity: 0, scale: 1.3 }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
              color: highlight
                ? 'rgba(255,255,255,1)'
                : 'rgba(255,255,255,0.9)',
            }}
            exit={{ y: 30, opacity: 0 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
              mass: 0.5,
            }}
            className="inline-block"
          >
            {digit}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
