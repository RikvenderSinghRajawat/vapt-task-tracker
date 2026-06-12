import React, { useEffect, useState, useRef } from 'react';
import { useInView } from 'framer-motion';

const AnimatedCounter = ({ value, duration = 1.2, decimals = 0, suffix = '', prefix = '' }) => {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-50px' });
  const startedRef = useRef(false);

  useEffect(() => {
    if (!isInView || startedRef.current) return;
    startedRef.current = true;

    const startTime = performance.now();
    const target = Number(value) || 0;

    const animate = (currentTime) => {
      const elapsed = (currentTime - startTime) / 1000;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(target * eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplay(target);
      }
    };

    requestAnimationFrame(animate);
  }, [isInView, value, duration]);

  const formatted = display.toFixed(decimals);
  const parts = formatted.split('.');

  return (
    <span ref={ref}>
      {prefix}{parts[0]}
      {parts[1] !== undefined && <span style={{ fontSize: '0.7em', opacity: 0.6 }}>.{parts[1]}</span>}
      {suffix}
    </span>
  );
};

export default AnimatedCounter;
