import React, { useRef, useEffect, useCallback, useState } from 'react';
import { colors } from '../../theme/designSystem';

// ─── CITY DATABASE ──────────────────────────────────────────────────────
const CITIES = [
  { name: 'New York', lat: 40.7, lng: -74.0 },
  { name: 'London', lat: 51.5, lng: -0.1 },
  { name: 'Tokyo', lat: 35.7, lng: 139.7 },
  { name: 'Sydney', lat: -33.9, lng: 151.2 },
  { name: 'Moscow', lat: 55.8, lng: 37.6 },
  { name: 'Dubai', lat: 25.2, lng: 55.3 },
  { name: 'Singapore', lat: 1.3, lng: 103.8 },
  { name: 'Sao Paulo', lat: -23.6, lng: -46.6 },
  { name: 'Johannesburg', lat: -26.2, lng: 28.0 },
  { name: 'San Francisco', lat: 37.8, lng: -122.4 },
  { name: 'Mumbai', lat: 19.1, lng: 72.9 },
  { name: 'Beijing', lat: 39.9, lng: 116.4 },
  { name: 'Seoul', lat: 37.6, lng: 127.0 },
  { name: 'Berlin', lat: 52.5, lng: 13.4 },
  { name: 'Paris', lat: 48.9, lng: 2.3 },
  { name: 'Cairo', lat: 30.0, lng: 31.2 },
  { name: 'Lagos', lat: 6.5, lng: 3.4 },
  { name: 'Jakarta', lat: -6.2, lng: 106.8 },
  { name: 'Mexico City', lat: 19.4, lng: -99.1 },
  { name: 'Buenos Aires', lat: -34.6, lng: -58.4 },
  { name: 'Bangkok', lat: 13.7, lng: 100.5 },
  { name: 'Istanbul', lat: 41.0, lng: 28.9 },
  { name: 'Rome', lat: 41.9, lng: 12.5 },
  { name: 'Shanghai', lat: 31.2, lng: 121.5 },
  { name: 'Los Angeles', lat: 34.0, lng: -118.2 },
  { name: 'Chicago', lat: 41.9, lng: -87.6 },
  { name: 'Delhi', lat: 28.6, lng: 77.2 },
  { name: 'Hong Kong', lat: 22.3, lng: 114.2 },
  { name: 'Madrid', lat: 40.4, lng: -3.7 },
  { name: 'Toronto', lat: 43.7, lng: -79.4 },
  { name: 'Stockholm', lat: 59.3, lng: 18.1 },
  { name: 'Tel Aviv', lat: 32.1, lng: 34.8 },
  { name: 'Seattle', lat: 47.6, lng: -122.3 },
  { name: 'Warsaw', lat: 52.2, lng: 21.0 },
];

// ─── CONTINENT OUTLINES [lng, lat] ──────────────────────────────────────
const CONTINENTS = [
  [[-130,50],[-125,55],[-120,60],[-110,65],[-100,68],[-90,70],[-80,65],[-75,60],[-65,50],[-60,45],[-65,40],[-75,30],[-80,25],[-85,20],[-90,15],[-95,20],[-100,25],[-105,30],[-110,35],[-115,40],[-120,45],[-125,48],[-130,50]],
  [[-80,10],[-75,5],[-60,5],[-50,0],[-35,-5],[-35,-10],[-40,-15],[-50,-20],[-55,-25],[-58,-30],[-60,-35],[-65,-40],[-68,-45],[-72,-50],[-75,-55],[-70,-55],[-65,-50],[-60,-45],[-55,-40],[-50,-35],[-45,-30],[-42,-25],[-40,-20],[-45,-15],[-50,-10],[-55,-5],[-60,0],[-70,5],[-75,10],[-80,10]],
  [[-10,36],[0,38],[5,40],[10,40],[15,42],[20,38],[25,36],[30,38],[30,42],[25,45],[20,48],[15,50],[10,52],[5,55],[0,55],[-5,55],[-10,52],[-10,45],[-8,42],[-10,36]],
  [[-17,15],[-15,20],[-10,25],[-5,30],[0,32],[5,35],[10,35],[12,30],[20,30],[25,25],[30,20],[35,15],[40,10],[45,5],[50,0],[50,-5],[45,-10],[40,-15],[35,-20],[30,-25],[25,-30],[20,-35],[15,-35],[10,-30],[5,-25],[5,-20],[0,-15],[-5,-10],[-10,-5],[-15,0],[-17,5],[-17,15]],
  [[40,42],[45,45],[50,50],[55,55],[60,60],[65,65],[70,68],[75,70],[80,72],[90,72],[100,68],[110,70],[120,68],[130,65],[135,60],[140,55],[145,50],[150,45],[145,40],[140,35],[135,30],[130,25],[125,20],[120,15],[115,10],[110,5],[105,0],[100,5],[95,10],[90,15],[85,20],[80,25],[75,28],[70,25],[65,25],[60,25],[55,25],[50,28],[45,30],[40,35],[35,38],[40,42]],
  [[68,25],[72,20],[75,15],[78,10],[80,8],[82,10],[85,15],[88,20],[90,25],[88,28],[85,30],[80,30],[75,30],[70,28],[68,25]],
  [[115,-15],[120,-15],[125,-15],[130,-15],[135,-15],[140,-15],[145,-15],[150,-15],[152,-20],[150,-25],[148,-30],[145,-35],[140,-38],[135,-35],[130,-32],[125,-30],[120,-28],[115,-25],[110,-22],[115,-15]],
  [[-8,50],[-5,52],[-3,55],[0,55],[2,53],[0,50],[-3,50],[-6,50],[-8,50]],
  [[130,30],[132,32],[135,33],[138,35],[140,37],[140,40],[138,42],[135,43],[132,42],[130,38],[128,35],[128,32],[130,30]],
  [[-55,60],[-50,65],[-45,70],[-40,75],[-35,80],[-20,80],[-15,75],[-20,70],[-30,65],[-40,60],[-48,58],[-55,60]],
  [[35,28],[40,25],[45,20],[50,15],[55,15],[60,20],[55,25],[50,28],[45,30],[40,30],[35,28]],
];

const ATTACK_COLORS = ['#FF3B30', '#FF9500', '#FFCC00', '#5AC8FA', '#00E5FF', '#FF2D55'];
const MAX_ATTACKS = 20;
const SPAWN_INTERVAL = 25; // frames between new attacks

// ─── HELPERS ─────────────────────────────────────────────────────────────
const fit = (lat, lng, w, h, dx = 0) => ({
  x: ((lng + 180) / 360) * w + dx,
  y: ((90 - lat) / 180) * h,
});

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ─── ATTACK ARC ──────────────────────────────────────────────────────────
class AttackArc {
  constructor(from, to, color) {
    this.from = from;
    this.to = to;
    this.color = color;
    this.progress = 0;
    this.speed = 0.002 + Math.random() * 0.005;
    this.trail = [];
    this.active = true;
    this.impactRings = [];
    this.midx = (from.x + to.x) / 2;
    this.midy = Math.min(from.y, to.y) - Math.abs(to.x - from.x) * 0.35 - Math.random() * 40 - 20;
  }

  update() {
    if (!this.active) return;
    this.progress += this.speed;
    this.trail.push(this.progress);
    if (this.trail.length > 50) this.trail.shift();
    if (this.progress >= 1) {
      this.active = false;
      for (let i = 0; i < 3; i++) {
        this.impactRings.push({ r: 0, maxR: 30 + Math.random() * 20, opacity: 0.6, speed: 0.5 + Math.random() * 0.5 });
      }
    }
  }

  getPoint(p) {
    const t = p;
    return {
      x: (1 - t) * (1 - t) * this.from.x + 2 * (1 - t) * t * this.midx + t * t * this.to.x,
      y: (1 - t) * (1 - t) * this.from.y + 2 * (1 - t) * t * this.midy + t * t * this.to.y,
    };
  }
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────
const AttackMapBackground = ({ opacity = 0.55 }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const dimsRef = useRef({ w: 0, h: 0 });
  const attacksRef = useRef([]);
  const coordsRef = useRef([]);
  const landRef = useRef([]);
  const timeRef = useRef(0);
  const frameRef = useRef(0);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });
  const impactRingsRef = useRef([]);
  const scanRingsRef = useRef([]);
  const [mobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);

  const resize = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    c.width = w * devicePixelRatio;
    c.height = h * devicePixelRatio;
    c.style.width = `${w}px`;
    c.style.height = `${h}px`;
    const ctx = c.getContext('2d');
    ctx.scale(devicePixelRatio, devicePixelRatio);
    dimsRef.current = { w, h };
    coordsRef.current = CITIES.map(c => ({ ...c, ...fit(c.lat, c.lng, w, h) }));
    landRef.current = CONTINENTS.map(pts => pts.map(([lng, lat]) => fit(lat, lng, w, h)));

    // Pre-compute network connections
    const all = coordsRef.current;
    const connections = [];
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const d = dist(all[i], all[j]);
        if (d < 250 && d > 30) {
          connections.push({ a: all[i], b: all[j], d, dataPulse: Math.random() * 100 });
        }
      }
    }
    connections.sort((a, b) => a.d - b.d);
    connectionsRef.current = connections.slice(0, 45);
  }, []);

  const connectionsRef = useRef([]);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => {
      mouseRef.current = { x: e.clientX / window.innerWidth, y: e.clientY / window.innerHeight };
    }, { passive: true });

    const coords = coordsRef.current;
    const land = landRef.current;
    const connections = connectionsRef.current;

    // Seed initial attacks
    attacksRef.current = [];
    for (let i = 0; i < 5; i++) {
      const from = coords[Math.floor(Math.random() * coords.length)];
      let to = coords[Math.floor(Math.random() * coords.length)];
      if (to === from) to = coords[(Math.floor(Math.random() * coords.length) + 1) % coords.length];
      const color = ATTACK_COLORS[Math.floor(Math.random() * ATTACK_COLORS.length)];
      attacksRef.current.push(new AttackArc(from, to, color));
    }

    // Seed scan rings
    scanRingsRef.current = [];
    for (let i = 0; i < 2; i++) {
      scanRingsRef.current.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 0,
        maxR: 80 + Math.random() * 60,
        speed: 1 + Math.random() * 0.5,
        delay: i * 120,
      });
    }

    let scrollOffset = 0;

    const draw = () => {
      const { w: W, h: H } = dimsRef.current;
      if (!W || !H) { rafRef.current = requestAnimationFrame(draw); return; }

      const t = timeRef.current;
      timeRef.current += 1;
      frameRef.current += 1;

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const px = (mx - 0.5) * 8;
      const py = (my - 0.5) * 4;
      scrollOffset = (scrollOffset + 0.08) % 50;

      ctx.clearRect(0, 0, W, H);

      // ── 1. Deep space background ──
      const bg = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.7);
      bg.addColorStop(0, 'rgba(6, 14, 28, 0.95)');
      bg.addColorStop(0.5, 'rgba(2, 6, 16, 0.98)');
      bg.addColorStop(1, 'rgba(0, 0, 2, 1)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ── 2. Moving cyber grid ──
      ctx.strokeStyle = 'rgba(0, 180, 255, 0.015)';
      ctx.lineWidth = 0.5;
      for (let x = -scrollOffset; x <= W; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, H);
        ctx.stroke();
      }
      for (let y = -scrollOffset; y <= H; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      // ── 3. Globe grid (lat/lng) ──
      ctx.strokeStyle = 'rgba(0, 180, 255, 0.04)';
      ctx.lineWidth = 0.5;
      const latStep = mobile ? 45 : 30;
      const lngStep = mobile ? 45 : 30;
      for (let lat = -90; lat <= 90; lat += latStep) {
        ctx.beginPath();
        let first = true;
        for (let lng = -180; lng <= 180; lng += 3) {
          const p = fit(lat, lng, W, H, px);
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }
      for (let lng = -180; lng <= 180; lng += lngStep) {
        ctx.beginPath();
        let first = true;
        for (let lat = -90; lat <= 90; lat += 3) {
          const p = fit(lat, lng, W, H, px);
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();
      }

      // ── 4. Holographic lat/lng labels ──
      if (!mobile) {
        ctx.font = '8px "Courier New", monospace';
        ctx.fillStyle = 'rgba(0, 180, 255, 0.1)';
        for (let lat = -60; lat <= 60; lat += 30) {
          const p = fit(lat, -170, W, H, px);
          ctx.fillText(`${lat > 0 ? 'N' : 'S'}${Math.abs(lat)}°`, p.x + 4, p.y + 3);
        }
        for (let lng = -150; lng <= 150; lng += 60) {
          const p = fit(-80, lng, W, H, px);
          ctx.fillText(`${lng > 0 ? 'E' : 'W'}${Math.abs(lng)}°`, p.x - 8, p.y + H * 0.88);
        }
      }

      // ── 5. Continent outlines with animated glow ──
      for (const pts of land) {
        const shifted = pts.map(p => ({ x: p.x + px * 0.3, y: p.y + py * 0.3 }));
        // Far glow
        ctx.beginPath();
        let first = true;
        for (const p of shifted) {
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        const glowPhase = Math.sin(t * 0.005) * 0.5 + 0.5;
        ctx.strokeStyle = `rgba(0, 180, 255, ${0.03 + glowPhase * 0.04})`;
        ctx.lineWidth = 5;
        ctx.stroke();

        // Mid glow
        ctx.beginPath();
        first = true;
        for (const p of shifted) {
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(0, 200, 255, ${0.06 + glowPhase * 0.06})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Core outline
        ctx.beginPath();
        first = true;
        for (const p of shifted) {
          if (first) { ctx.moveTo(p.x, p.y); first = false; }
          else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.strokeStyle = `rgba(100, 220, 255, ${0.08 + glowPhase * 0.05})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();

        // Subtle fill
        ctx.fillStyle = `rgba(0, 150, 255, ${0.012 + glowPhase * 0.01})`;
        ctx.fill();
      }

      // ── 6. Network connections (fiber lines between cities) ──
      if (!mobile) {
        for (const conn of connections) {
          const pulse = Math.sin(t * 0.02 + conn.dataPulse) * 0.5 + 0.5;
          ctx.beginPath();
          ctx.moveTo(conn.a.x + px * 0.3, conn.a.y + py * 0.3);
          ctx.lineTo(conn.b.x + px * 0.3, conn.b.y + py * 0.3);
          ctx.strokeStyle = `rgba(0, 200, 255, ${0.02 + pulse * 0.03})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();

          // Data pulse traveling along connection
          const dataPos = (t * 0.01 + conn.dataPulse) % 1;
          const dx = conn.b.x - conn.a.x;
          const dy = conn.b.y - conn.a.y;
          const dataX = conn.a.x + dx * dataPos + px * 0.3;
          const dataY = conn.a.y + dy * dataPos + py * 0.3;
          ctx.fillStyle = `rgba(0, 220, 255, ${0.15 + pulse * 0.15})`;
          ctx.beginPath();
          ctx.arc(dataX, dataY, 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // ── 7. Radar sweep ──
      if (!mobile) {
        const sweepAngle = t * 0.006;
        const sweepLen = Math.min(W, H) * 0.35;
        const cx = W * 0.92;
        const cy = H * 0.88;

        // Radar arc
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, sweepLen, sweepAngle - 0.8, sweepAngle + 0.8);
        ctx.closePath();
        const radarGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, sweepLen);
        radarGrad.addColorStop(0, 'rgba(0, 255, 200, 0.02)');
        radarGrad.addColorStop(0.5, 'rgba(0, 200, 255, 0.01)');
        radarGrad.addColorStop(1, 'rgba(0, 200, 255, 0)');
        ctx.fillStyle = radarGrad;
        ctx.fill();

        // Sweep line
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const sweepEndX = cx + Math.cos(sweepAngle) * sweepLen;
        const sweepEndY = cy + Math.sin(sweepAngle) * sweepLen;
        ctx.lineTo(sweepEndX, sweepEndY);
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.06)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Radar rings
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath();
          ctx.arc(cx, cy, sweepLen * (i / 3), 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(0, 255, 200, 0.015)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        // Radar center
        ctx.fillStyle = 'rgba(0, 255, 200, 0.08)';
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── 8. AI scanning rings ──
      for (let i = scanRingsRef.current.length - 1; i >= 0; i--) {
        const ring = scanRingsRef.current[i];
        ring.delay--;
        if (ring.delay > 0) continue;
        ring.r += ring.speed;
        if (ring.r > ring.maxR) {
          scanRingsRef.current.splice(i, 1);
          continue;
        }
        const alpha = 1 - ring.r / ring.maxR;
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, ring.r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(0, 200, 255, ${alpha * 0.08})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      // Spawn new scan rings
      if (t % 100 === 0) {
        scanRingsRef.current.push({
          x: Math.random() * W, y: Math.random() * H,
          r: 0, maxR: 100 + Math.random() * 80,
          speed: 1.5 + Math.random() * 0.8, delay: 0,
        });
      }

      // ── 9. Attack arcs ──
      const attacks = attacksRef.current;
      for (let i = attacks.length - 1; i >= 0; i--) {
        const a = attacks[i];

        // Update impact rings
        for (let ri = a.impactRings.length - 1; ri >= 0; ri--) {
          const ring = a.impactRings[ri];
          ring.r += ring.speed;
          ring.opacity -= 0.008;
          if (ring.opacity <= 0) { a.impactRings.splice(ri, 1); continue; }
          const shiftedTo = { x: a.to.x + px * 0.3, y: a.to.y + py * 0.3 };
          ctx.beginPath();
          ctx.arc(shiftedTo.x, shiftedTo.y, ring.r, 0, Math.PI * 2);
          ctx.strokeStyle = a.color + Math.floor(ring.opacity * 120).toString(16).padStart(2, '0');
          ctx.lineWidth = 1.5 - ring.opacity;
          ctx.stroke();
        }

        if (!a.active) {
          if (a.impactRings.length === 0) attacks.splice(i, 1);
          continue;
        }

        a.update();
        const trail = a.trail;

        // Glow trail behind head
        for (let t = 0; t < trail.length; t++) {
          const pt = a.getPoint(trail[t]);
          const shiftedPt = { x: pt.x + px * 0.3, y: pt.y + py * 0.3 };
          const alpha = (t / trail.length) * 0.7;
          const radius = 1 + (t / trail.length) * 3;
          const grad = ctx.createRadialGradient(shiftedPt.x, shiftedPt.y, 0, shiftedPt.x, shiftedPt.y, radius * 4);
          grad.addColorStop(0, a.color + Math.floor(alpha * 180).toString(16).padStart(2, '0'));
          grad.addColorStop(1, a.color + '00');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(shiftedPt.x, shiftedPt.y, radius * 4, 0, Math.PI * 2);
          ctx.fill();
        }

        // Dashed path
        ctx.setLineDash([4, 10]);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        let first = true;
        for (let p = 0; p <= a.progress; p += 0.015) {
          const pt = a.getPoint(p);
          if (first) { ctx.moveTo(pt.x + px * 0.3, pt.y + py * 0.3); first = false; }
          else ctx.lineTo(pt.x + px * 0.3, pt.y + py * 0.3);
        }
        ctx.strokeStyle = a.color + '35';
        ctx.stroke();
        ctx.setLineDash([]);

        // Traveling head
        const head = a.getPoint(a.progress);
        const sh = { x: head.x + px * 0.3, y: head.y + py * 0.3 };
        const headGlow = ctx.createRadialGradient(sh.x, sh.y, 0, sh.x, sh.y, 10);
        headGlow.addColorStop(0, a.color + 'dd');
        headGlow.addColorStop(0.3, a.color + '60');
        headGlow.addColorStop(1, a.color + '00');
        ctx.fillStyle = headGlow;
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(sh.x, sh.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Spawn new attacks
      if (frameRef.current % SPAWN_INTERVAL === 0) {
        const from = coords[Math.floor(Math.random() * coords.length)];
        let to = coords[Math.floor(Math.random() * coords.length)];
        if (to === from) to = coords[(Math.floor(Math.random() * coords.length) + 1) % coords.length];
        const color = ATTACK_COLORS[Math.floor(Math.random() * ATTACK_COLORS.length)];
        attacksRef.current.push(new AttackArc(from, to, color));
        if (attacksRef.current.length > MAX_ATTACKS) attacksRef.current.splice(0, attacksRef.current.length - MAX_ATTACKS);
      }

      // ── 10. City dots ──
      for (const city of coords) {
        const pulse = Math.sin(t * 0.025 + city.x * 0.008) * 0.5 + 0.5;
        const r = mobile ? 1.5 + pulse : 2 + pulse * 2;
        const sx = city.x + px * 0.3;
        const sy = city.y + py * 0.3;

        // Ambient glow
        const ambient = ctx.createRadialGradient(sx, sy, 0, sx, sy, 30);
        ambient.addColorStop(0, `rgba(0, 200, 255, ${0.03 + pulse * 0.03})`);
        ambient.addColorStop(1, 'rgba(0, 200, 255, 0)');
        ctx.fillStyle = ambient;
        ctx.beginPath();
        ctx.arc(sx, sy, 30, 0, Math.PI * 2);
        ctx.fill();

        // Glow ring
        const innerGlow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 6);
        innerGlow.addColorStop(0, `rgba(80, 220, 255, ${0.12 + pulse * 0.08})`);
        innerGlow.addColorStop(1, 'rgba(80, 220, 255, 0)');
        ctx.fillStyle = innerGlow;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 6, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = `rgba(150, 235, 255, ${0.6 + pulse * 0.4})`;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();

        // Bright center
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      // ── 11. Binary rain (reduced on mobile) ──
      const rainCount = mobile ? 10 : 30;
      for (let i = 0; i < rainCount; i++) {
        const rx = ((i * 137.5 + t * 0.3) % W);
        const ry = ((i * 97.3 + t * 0.5) % H);
        ctx.fillStyle = `rgba(0, 200, 255, ${0.008 + (i % 5) * 0.003})`;
        ctx.font = `${6 + (i % 3)}px "Courier New", monospace`;
        ctx.fillText(String.fromCharCode(48 + Math.floor(Math.random() * 2)), rx, ry);
      }

      // ── 12. Glowing fog layers ──
      if (!mobile) {
        const fog1 = ctx.createRadialGradient(W * 0.2, H * 0.3, 0, W * 0.2, H * 0.3, W * 0.4);
        fog1.addColorStop(0, 'rgba(0, 100, 255, 0.01)');
        fog1.addColorStop(1, 'rgba(0, 100, 255, 0)');
        ctx.fillStyle = fog1;
        ctx.fillRect(0, 0, W, H);

        const fog2 = ctx.createRadialGradient(W * 0.8, H * 0.7, 0, W * 0.8, H * 0.7, W * 0.35);
        fog2.addColorStop(0, 'rgba(100, 0, 255, 0.008)');
        fog2.addColorStop(1, 'rgba(100, 0, 255, 0)');
        ctx.fillStyle = fog2;
        ctx.fillRect(0, 0, W, H);
      }

      // ── 13. Random threat spikes ──
      if (!mobile && t % 45 === 0) {
        const spikeX = Math.random() * W;
        const spikeY = Math.random() * H;
        const spikeGlow = ctx.createRadialGradient(spikeX, spikeY, 0, spikeX, spikeY, 40);
        spikeGlow.addColorStop(0, 'rgba(255, 50, 50, 0.04)');
        spikeGlow.addColorStop(1, 'rgba(255, 50, 50, 0)');
        ctx.fillStyle = spikeGlow;
        ctx.beginPath();
        ctx.arc(spikeX, spikeY, 40, 0, Math.PI * 2);
        ctx.fill();
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [resize, mobile]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 0, opacity,
      }}
    />
  );
};

export default AttackMapBackground;
