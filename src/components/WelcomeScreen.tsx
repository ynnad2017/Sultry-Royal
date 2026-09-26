import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SRLogo } from './SRLogo';

export default function WelcomeScreen({ onComplete }: { onComplete: () => void }) {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 800);
    const t3 = setTimeout(() => setPhase(3), 1600);
    const t4 = setTimeout(() => onComplete(), 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase < 3 && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
        >
          <motion.div
            className="absolute w-64 h-64 rounded-full"
            style={{ background: 'radial-gradient(circle, hsla(43,74%,49%,0.12) 0%, transparent 70%)' }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1.5, opacity: 1 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <SRLogo size="lg" />
          </motion.div>
          <motion.h1
            className="font-serif text-2xl sm:text-3xl font-bold mt-5 text-gold-gradient text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: phase >= 1 ? 1 : 0, y: phase >= 1 ? 0 : 16 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            SULTRY ROYAL
          </motion.h1>
          <motion.p
            className="text-sm sm:text-base text-muted-foreground mt-2 tracking-[0.3em] uppercase text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 2 ? 1 : 0 }}
            transition={{ duration: 0.4 }}
          >
            Welcome to Heaven
          </motion.p>
          {phase >= 1 && (
            <>
              <Sparkle style={{ top: '30%', left: '20%' }} delay={0} />
              <Sparkle style={{ top: '25%', right: '25%' }} delay={0.2} />
              <Sparkle style={{ bottom: '30%', left: '30%' }} delay={0.4} />
              <Sparkle style={{ bottom: '25%', right: '20%' }} delay={0.1} />
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Sparkle({ style, delay }: { style?: React.CSSProperties; delay: number }) {
  return (
    <motion.div
      className="absolute"
      style={style}
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: [0, 1, 0], scale: [0, 1, 0] }}
      transition={{ duration: 1.2, delay, repeat: 1, ease: 'easeInOut' }}
    >
      <div className="w-1.5 h-1.5 rounded-full" style={{ background: 'hsl(43 74% 49%)' }} />
    </motion.div>
  );
}