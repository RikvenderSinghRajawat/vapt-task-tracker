import React, { useRef, useEffect, useCallback } from 'react';
import { colors } from '../../theme/designSystem';

// ─── Network Node Simulation ──────────────────────────────────────────
// GPU-friendly: single canvas, requestAnimationFrame, no DOM nodes.
// Draws: nodes, connecting lines, pulse rings, scanning waves, binary
// drizzle, and a slow rotational sweep.

const NODE_COUNT = 18;
const CONNECTION_DIST = 200;
const EDGE_OPACITY = 0.12;
const PULSE_SPEED = 0.008;

let mouseX = -9999;
let mouseY = -9999;

class Node {
  constructor(w, h) {
    this.reset(w, h);
  }
  reset(w, h) {
    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.vx = (Math.random() - 0.5) * 0.35;
    this.vy = (Math.random() - 0.5) * 0.35;
    this.radius = 1.5 + Math.random() * 2.5;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.pulseSpeed = PULSE_SPEED * (0.6 + Math.random() * 0.8);
    this.brightness = 0.4 + Math.random() * 0.6;
  }
  update(w, h) {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < -20 || this.x > w + 20 || this.y < -20 || this.y > h + 20) {
      this.reset(w, h);
    }
    this.pulsePhase += this.pulseSpeed;
  }
}

const CyberBackground = ({ opacity = 0.5 }) => {
  const canvasRef = useRef(null);
  const nodesRef = useRef([]);
  const rafRef = useRef(null);
  const dimsRef = useRef({ w: 0, h: 0 });

  const resize = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    c.width = w * devicePixelRatio;
    c.height = h * devicePixelRatio;
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    dimsRef.current = { w, h };
    // Re-initialize nodes on resize
    const ctx = c.getContext('2d');
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }, []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => { mouseX = e.clientX; mouseY = e.clientY; }, { passive: true });

    // Init nodes
    const { w, h } = dimsRef.current;
    nodesRef.current = Array.from({ length: NODE_COUNT }, () => new Node(w, h));
    const nodes = nodesRef.current;

    // Binary drizzle pool
    const drizzleCount = 16;
    const drizzle = Array.from({ length: drizzleCount }, () => ({
      x: Math.random() * w,
      y: Math.random() * h * -1,
      speed: 0.4 + Math.random() * 1.2,
      char: String.fromCharCode(48 + Math.floor(Math.random() * 2)),
      opacity: 0.04 + Math.random() * 0.08,
    }));

    let sweepAngle = 0;

    const draw = () => {
      const { w: W, h: H } = dimsRef.current;
      if (!W || !H) { rafRef.current = requestAnimationFrame(draw); return; }

      ctx.clearRect(0, 0, W, H);

      // ── 1. Update nodes ──
      for (const n of nodes) n.update(W, H);

      // ── 2. Draw connections ──
      const primary = colors.primary[400];
      const info = colors.severity.info;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > CONNECTION_DIST) continue;
          const alpha = (1 - dist / CONNECTION_DIST) * EDGE_OPACITY;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(0, 212, 255, ${alpha})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // ── 3. Draw nodes with pulse ──
      for (const n of nodes) {
        const pulse = Math.sin(n.pulsePhase) * 0.5 + 0.5;
        const r = n.radius + pulse * 2;
        const alpha = n.brightness * (0.5 + pulse * 0.5);

        // Glow
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 3);
        grad.addColorStop(0, `rgba(0, 212, 255, ${alpha * 0.35})`);
        grad.addColorStop(1, 'rgba(0, 212, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r * 3, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `rgba(0, 212, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── 4. Mouse proximity glow ──
      if (mouseX > 0 && mouseY > 0) {
        const grad = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 120);
        grad.addColorStop(0, `rgba(0, 212, 255, 0.03)`);
        grad.addColorStop(1, 'rgba(0, 212, 255, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      }

      // ── 5. Radar sweep ──
      sweepAngle += 0.004;
      const sweepX = W / 2 + Math.cos(sweepAngle) * W * 0.45;
      const sweepY = H / 2 + Math.sin(sweepAngle) * H * 0.45;

      const sweepGrad = ctx.createRadialGradient(sweepX, sweepY, 0, sweepX, sweepY, 60);
      sweepGrad.addColorStop(0, `rgba(0, 212, 255, 0.02)`);
      sweepGrad.addColorStop(1, 'rgba(0, 212, 255, 0)');
      ctx.fillStyle = sweepGrad;
      ctx.beginPath();
      ctx.arc(sweepX, sweepY, 60, 0, Math.PI * 2);
      ctx.fill();

      // Sweep line
      ctx.beginPath();
      ctx.moveTo(W / 2, H / 2);
      ctx.lineTo(sweepX, sweepY);
      ctx.strokeStyle = 'rgba(0, 212, 255, 0.03)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // ── 6. Binary drizzle ──
      ctx.font = '9px "Courier New", monospace';
      for (const d of drizzle) {
        d.y += d.speed;
        if (d.y > H) { d.y = -20; d.x = Math.random() * W; d.char = String.fromCharCode(48 + Math.floor(Math.random() * 2)); }
        ctx.fillStyle = `rgba(0, 212, 255, ${d.opacity})`;
        ctx.fillText(d.char, d.x, d.y);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [resize]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        opacity,
      }}
    />
  );
};

export default CyberBackground;
