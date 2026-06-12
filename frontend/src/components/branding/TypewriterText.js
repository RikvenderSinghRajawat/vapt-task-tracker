import React, { useState, useEffect, useCallback } from 'react';

const TypewriterText = ({ texts, speed = 40, deleteSpeed = 20, pause = 2500, style }) => {
  const [display, setDisplay] = useState('');
  const [idx, setIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const fullText = texts[idx] || '';

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!deleting) {
        if (charIdx < fullText.length) {
          setDisplay(fullText.slice(0, charIdx + 1));
          setCharIdx(charIdx + 1);
        } else {
          setTimeout(() => setDeleting(true), pause);
        }
      } else {
        if (charIdx > 0) {
          setDisplay(fullText.slice(0, charIdx - 1));
          setCharIdx(charIdx - 1);
        } else {
          setDeleting(false);
          setIdx((prev) => (prev + 1) % texts.length);
        }
      }
    }, deleting ? deleteSpeed : speed);

    return () => clearTimeout(timeout);
  }, [charIdx, deleting, fullText, speed, deleteSpeed, pause, texts]);

  return (
    <span style={style}>
      {display}
      <span style={{ opacity: 0.6, fontWeight: 300 }}>|</span>
    </span>
  );
};

export default TypewriterText;
