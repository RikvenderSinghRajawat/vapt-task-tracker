import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Box, Typography } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import EKavachLogo from './EKavachLogo';
import { colors, typography } from '../theme/designSystem';

// ─── TAGLINES ───────────────────────────────────────────────────────────
const allTaglines = [
  "Every vulnerability has a story. Let's close it.",
  "Think like an attacker. Act like a defender.",
  "Turning findings into fortified systems.",
  "Clarity in risk. Precision in defense.",
  "Silence the vulnerabilities before they speak.",
  "Not just scanning — securing.",
  "Security isn't a feature — it's the foundation.",
  "Find it first. Fix it forever.",
  "From assessment to closure — one single truth.",
  "Total visibility. Total control. Total security.",
  "Defenses strengthened. Session secured.",
  "Your vigilance protects the perimeter.",
  "Every log tells a story of resilience.",
  "Tomorrow's vulnerabilities won't stand a chance.",
  "Safeguarding what matters most.",
  "Mission accomplished. Stay vigilant.",
  "Initializing the shield before the storm.",
  "Watching the shadows before they move.",
  "Every endpoint matters. Every second counts.",
  "Defense begins long before detection.",
  "Trust nothing. Verify everything.",
  "Scanning silence for hidden threats.",
  "Built for defenders who never sleep.",
  "Threats evolve. So do we.",
  "Hardening the edge of your infrastructure.",
  "Real security starts beneath the surface.",
  "Monitoring the pulse of your digital world.",
  "Precision defense for a hostile internet.",
  "One vulnerability can change everything.",
  "Threat intelligence in motion.",
  "Where cyber resilience becomes reality.",
  "Attackers automate. Defenders innovate.",
  "Security engineered for modern warfare.",
  "Turning exposure into protection.",
  "Visibility is the first line of defense.",
  "Encrypted. Verified. Protected.",
  "Defending systems beyond the firewall.",
  "Every packet tells a story.",
  "Intelligence-driven security operations.",
  "Your infrastructure deserves vigilance.",
  "Scanning beyond what humans can see.",
  "Modern threats require modern defense.",
  "Silent protection. Constant vigilance.",
  "Closing doors before attackers arrive.",
  "Cybersecurity powered by precision.",
  "Fortifying the digital frontier.",
  "Resilience starts with awareness.",
  "Secure systems. Secure future.",
  "Every signal matters in cyber defense.",
  "Advanced protection for connected worlds.",
  "Finding risks before they escalate.",
  "Prepared for threats not yet discovered.",
  "Security without compromise.",
  "Analyzing behavior. Predicting threats.",
  "Protection built for enterprise scale.",
  "Keeping critical systems uncompromised.",
  "Your attack surface under constant watch.",
  "Because downtime is never acceptable.",
  "Cyber defense operating at full spectrum.",
  "Securing the unseen layers of technology.",
  "Detection is temporary. Prevention is power.",
  "Threats move fast. We move faster.",
  "Always scanning. Always defending.",
  "The perimeter is only the beginning.",
  "Operational security at enterprise speed.",
  "Every defense layer working together.",
  "From visibility to victory.",
  "Where vulnerability management becomes intelligence.",
  "Advanced monitoring for modern infrastructure.",
  "Strengthening security one layer at a time.",
  "Defense built around real-world threats.",
  "Risk identified. Action initiated.",
  "Protecting data in motion and at rest.",
  "Continuous awareness. Continuous protection.",
  "Security intelligence without interruption.",
  "Built to outlast evolving threats.",
  "The network never sleeps. Neither do we.",
  "Security operations redefined.",
  "Digital trust begins here.",
  "Threat analysis in real time.",
  "Keeping adversaries outside the perimeter.",
  "Adaptive defense for dynamic environments.",
  "Smart security for connected enterprises.",
  "Enterprise defense with tactical precision.",
  "Every session protected by intelligence.",
  "Securing critical operations worldwide.",
  "Turning attack surfaces into fortified zones.",
  "Zero trust. Maximum resilience.",
  "Your digital battlefield under control.",
  "Cyber vigilance activated.",
  "Because prevention costs less than recovery.",
  "Advanced security with zero blind spots.",
  "Continuous monitoring. Instant awareness.",
  "Your infrastructure under active protection.",
  "Detection powered by intelligence.",
  "Security built for mission-critical systems.",
  "Modern defense against modern adversaries.",
  "One platform. Total cyber visibility.",
  "Protecting infrastructure at every layer.",
  "The future of security operations starts here.",
  "Analyzing threats before they become incidents.",
  "Prepared for the next generation of attacks.",
  "Cyber resilience engineered into every session.",
  "Where protection meets intelligence.",
  "Real-time defense for real-world threats.",
  "Safeguarding digital ecosystems at scale.",
  "Strengthening your cyber posture continuously.",
  "Security intelligence with enterprise precision.",
  "Transforming risk into resilience.",
  "Threat monitoring beyond traditional defense.",
  "Keeping your operations one step ahead.",
  "Built for defenders. Trusted by enterprises.",
  "Every login secured by layered intelligence.",
  "Continuous defense for an always-connected world.",
  "Protecting what attackers target most.",
  "Cyber awareness operating in real time.",
  "Defense optimized for evolving attack vectors.",
  "Security that adapts faster than threats.",
  "Maintaining trust through continuous protection.",
  "Your security perimeter without limits.",
  "Enterprise-grade protection in every operation.",
  "Threats evolve every second. So do we.",
  "Watching the attack surface before attackers do.",
  "Security measured in milliseconds.",
  "Every endpoint matters. Every alert counts.",
  "Defense engineered for modern infrastructure.",
  "One dashboard. Infinite vigilance.",
  "The quieter your systems, the stronger your defense.",
  "Visibility today prevents breaches tomorrow.",
  "Scanning the unknown. Securing the critical.",
  "Every vulnerability has a clock ticking.",
  "Cyber resilience begins with visibility.",
  "Built for defenders. Designed for resilience.",
  "Attackers automate. So does eKavach.",
  "Protecting digital trust at enterprise scale.",
  "Real-time monitoring. Real-world defense.",
  "Intelligence-driven security operations.",
  "Because one missed finding is one too many.",
  "Continuous security for continuous business.",
  "Modern threats require modern defense.",
  "Turning alerts into actionable defense.",
  "Security posture strengthened in real time.",
  "Stay ahead of the breach curve.",
  "The network never sleeps. Neither do we.",
  "From reconnaissance to remediation.",
  "Precision security for critical environments.",
  "Every packet tells a story.",
  "Security that sees beyond the firewall.",
  "Monitoring the pulse of your infrastructure.",
  "The difference between detection and disaster is timing.",
  "Where attack intelligence meets rapid response.",
  "Fortifying systems before attackers arrive.",
  "Track. Detect. Defend.",
  "Your infrastructure under constant protection.",
  "Secure operations begin with clear visibility.",
  "Reducing risk through intelligent defense.",
  "Every session secured with confidence.",
  "Enterprise-grade security without compromise.",
  "Security awareness at machine speed.",
  "Defense that adapts faster than threats.",
  "Visibility across every layer of infrastructure.",
  "Hardening systems. Strengthening resilience.",
  "Operational security with real-time intelligence.",
  "Find weaknesses before adversaries exploit them.",
  "Security operations built for modern threats.",
  "Because downtime is never an option.",
  "The command center for cyber resilience.",
  "Zero assumptions. Full visibility.",
  "Securing the enterprise one finding at a time.",
  "Live monitoring. Intelligent response.",
  "Defensive intelligence for evolving threats.",
  "Mapping attack surfaces across the globe.",
  "Every threat leaves a pattern.",
  "Defense begins with awareness.",
  "Transforming findings into stronger infrastructure.",
  "Keeping critical systems one step ahead.",
  "Advanced visibility for advanced threats.",
  "Risk identified. Exposure minimized.",
  "Where vulnerabilities meet remediation.",
  "Real-time insights for real-world security.",
  "Security is a continuous operation.",
  "Digital defense without blind spots.",
  "Built to detect what others miss.",
  "The frontline of enterprise protection.",
  "Visibility. Control. Resilience.",
  "Secure systems create confident businesses.",
  "Every indicator matters in cyber defense.",
  "Continuous vigilance across your environment.",
  "Cyber defense designed for scale.",
  "Monitoring the threat landscape in real time.",
  "Infrastructure protected with precision.",
  "Security operations centered around intelligence.",
  "Because attackers never wait.",
  "Your digital perimeter under active defense.",
  "One platform. Unified security operations.",
  "Detection powered by insight.",
  "Defense optimized for enterprise environments.",
  "Strengthening security from the inside out.",
  "Real-time threat awareness for modern teams.",
  "The smarter way to manage vulnerabilities.",
  "Risk visibility without complexity.",
  "Monitoring threats across every layer.",
  "Enterprise defense built for speed.",
  "Every login. Every request. Every risk.",
  "The control room for cyber defense.",
  "Security that works as fast as your business.",
  "Closing gaps before they become incidents.",
  "Cybersecurity designed for operational clarity.",
  "Protecting infrastructure through intelligent monitoring.",
  "The art of modern cyber defense.",
  "Because resilience is the new perimeter.",
  "See the threat. Control the risk.",
  "Operational intelligence for secure enterprises.",
  "Making vulnerability management actionable.",
  "Security visibility beyond the surface.",
  "Focused on detection. Built for protection.",
  "Your infrastructure deserves proactive defense.",
  "A stronger posture starts with awareness.",
  "Built to secure modern digital ecosystems.",
  "Monitoring the internet's dark noise.",
  "Turning cyber intelligence into security action.",
  "Every second monitored. Every threat analyzed.",
  "Secure by design. Vigilant by default.",
  "Advanced defense for evolving attack surfaces.",
  "The future of cyber resilience starts here.",
];

const STATUS_MESSAGES = [
  'INITIALIZING SECURE SESSION',
  'VERIFYING ACCESS TOKENS',
  'LOADING THREAT INTELLIGENCE',
  'ESTABLISHING ENCRYPTED CHANNEL',
  'SYNCING SECURITY MODULES',
  'ANALYZING ACTIVE DEFENSES',
];

const FOOTER_TEXTS = [
  'ENTERPRISE SECURITY MANAGEMENT',
  'REAL-TIME THREAT INTELLIGENCE',
  'ZERO TRUST SECURITY PLATFORM',
  'AI-POWERED VULNERABILITY MANAGEMENT',
];

// ─── CANVAS WORLD MAP ────────────────────────────────────────────────────
const CITIES = [
  { lat: 40.7, lng: -74.0 }, { lat: 51.5, lng: -0.1 }, { lat: 35.7, lng: 139.7 },
  { lat: -33.9, lng: 151.2 }, { lat: 55.8, lng: 37.6 }, { lat: 25.2, lng: 55.3 },
  { lat: 1.3, lng: 103.8 }, { lat: -23.6, lng: -46.6 }, { lat: -26.2, lng: 28.0 },
  { lat: 37.8, lng: -122.4 }, { lat: 19.1, lng: 72.9 }, { lat: 39.9, lng: 116.4 },
  { lat: 37.6, lng: 127.0 }, { lat: 52.5, lng: 13.4 }, { lat: 48.9, lng: 2.3 },
  { lat: 30.0, lng: 31.2 }, { lat: 6.5, lng: 3.4 }, { lat: -6.2, lng: 106.8 },
  { lat: 19.4, lng: -99.1 }, { lat: -34.6, lng: -58.4 }, { lat: 13.7, lng: 100.5 },
  { lat: 41.0, lng: 28.9 }, { lat: 34.0, lng: -118.2 }, { lat: 28.6, lng: 77.2 },
  { lat: 22.3, lng: 114.2 },
];

const CONTINENTS = [
  [[-130,50],[-125,55],[-120,60],[-110,65],[-100,68],[-90,70],[-80,65],[-75,60],[-65,50],[-60,45],[-65,40],[-75,30],[-80,25],[-85,20],[-90,15],[-95,20],[-100,25],[-105,30],[-110,35],[-115,40],[-120,45],[-125,48]],
  [[-80,10],[-75,5],[-60,5],[-50,0],[-35,-5],[-35,-10],[-40,-15],[-50,-20],[-55,-25],[-58,-30],[-60,-35],[-65,-40],[-68,-45],[-72,-50],[-75,-55],[-70,-55],[-65,-50],[-60,-45],[-55,-40],[-50,-35],[-45,-30],[-42,-25],[-40,-20],[-45,-15],[-50,-10],[-55,-5],[-60,0],[-70,5],[-75,10]],
  [[-10,36],[0,38],[5,40],[10,40],[15,42],[20,38],[25,36],[30,38],[30,42],[25,45],[20,48],[15,50],[10,52],[5,55],[0,55],[-5,55],[-10,52],[-10,45],[-8,42]],
  [[-17,15],[-15,20],[-10,25],[-5,30],[0,32],[5,35],[10,35],[12,30],[20,30],[25,25],[30,20],[35,15],[40,10],[45,5],[50,0],[50,-5],[45,-10],[40,-15],[35,-20],[30,-25],[25,-30],[20,-35],[15,-35],[10,-30],[5,-25],[5,-20],[0,-15],[-5,-10],[-10,-5],[-15,0],[-17,5]],
  [[40,42],[45,45],[50,50],[55,55],[60,60],[65,65],[70,68],[75,70],[80,72],[90,72],[100,68],[110,70],[120,68],[130,65],[135,60],[140,55],[145,50],[150,45],[145,40],[140,35],[135,30],[130,25],[125,20],[120,15],[115,10],[110,5],[105,0],[100,5],[95,10],[90,15],[85,20],[80,25],[75,28],[70,25],[65,25],[60,25],[55,25],[50,28],[45,30],[40,35],[35,38]],
  [[68,25],[72,20],[75,15],[78,10],[80,8],[82,10],[85,15],[88,20],[90,25],[88,28],[85,30],[80,30],[75,30],[70,28]],
  [[115,-15],[120,-15],[125,-15],[130,-15],[135,-15],[140,-15],[145,-15],[150,-15],[152,-20],[150,-25],[148,-30],[145,-35],[140,-38],[135,-35],[130,-32],[125,-30],[120,-28],[115,-25],[110,-22]],
  [[-8,50],[-5,52],[-3,55],[0,55],[2,53],[0,50],[-3,50],[-6,50]],
  [[130,30],[132,32],[135,33],[138,35],[140,37],[140,40],[138,42],[135,43],[132,42],[130,38],[128,35],[128,32]],
];

const ATTACK_COLORS = ['#FF3B30', '#FF9500', '#5AC8FA', '#00E5FF'];

const LoadingBackground = () => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const dimsRef = useRef({ w: 0, h: 0 });

  const fit = useCallback((lat, lng, w, h) => ({
    x: ((lng + 180) / 360) * w,
    y: ((90 - lat) / 180) * h,
  }), []);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const resize = () => {
      const w = window.innerWidth, h = window.innerHeight;
      c.width = w * devicePixelRatio; c.height = h * devicePixelRatio;
      c.style.width = `${w}px`; c.style.height = `${h}px`;
      ctx.scale(devicePixelRatio, devicePixelRatio);
      dimsRef.current = { w, h };
    };
    resize();
    window.addEventListener('resize', resize);

    const coords = CITIES.map(c => fit(c.lat, c.lng, dimsRef.current.w, dimsRef.current.h));
    const land = CONTINENTS.map(pts => pts.map(([lng, lat]) => fit(lat, lng, dimsRef.current.w, dimsRef.current.h)));

    const attacks = [];
    const spawn = () => {
      const from = coords[Math.floor(Math.random() * coords.length)];
      let to = coords[Math.floor(Math.random() * coords.length)];
      if (to === from) to = coords[(Math.floor(Math.random() * coords.length) + 1) % coords.length];
      const color = ATTACK_COLORS[Math.floor(Math.random() * ATTACK_COLORS.length)];
      const midx = (from.x + to.x) / 2;
      const midy = Math.min(from.y, to.y) - Math.abs(to.x - from.x) * 0.35 - 20;
      attacks.push({ from, to, color, progress: 0, speed: 0.004 + Math.random() * 0.006, midx, midy, trail: [] });
      if (attacks.length > 8) attacks.shift();
    };
    for (let i = 0; i < 4; i++) spawn();

    let time = 0;
    const draw = () => {
      const { w: W, h: H } = dimsRef.current;
      if (!W || !H) { rafRef.current = requestAnimationFrame(draw); return; }
      ctx.clearRect(0, 0, W, H);
      time++;

      const bg = ctx.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.6);
      bg.addColorStop(0, 'rgba(4, 12, 24, 0.5)');
      bg.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(0, 180, 255, 0.02)';
      ctx.lineWidth = 0.5;
      for (let x = 0; x <= W; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y <= H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

      ctx.strokeStyle = 'rgba(0, 180, 255, 0.04)';
      ctx.lineWidth = 0.5;
      for (let lat = -90; lat <= 90; lat += 30) {
        ctx.beginPath(); let f = true;
        for (let lng = -180; lng <= 180; lng += 5) { const p = fit(lat, lng, W, H); if (f) { ctx.moveTo(p.x, p.y); f = false; } else ctx.lineTo(p.x, p.y); }
        ctx.stroke();
      }
      for (let lng = -180; lng <= 180; lng += 30) {
        ctx.beginPath(); let f = true;
        for (let lat = -90; lat <= 90; lat += 5) { const p = fit(lat, lng, W, H); if (f) { ctx.moveTo(p.x, p.y); f = false; } else ctx.lineTo(p.x, p.y); }
        ctx.stroke();
      }

      const glow = Math.sin(time * 0.008) * 0.5 + 0.5;
      for (const pts of land) {
        ctx.beginPath(); let f = true;
        for (const p of pts) { if (f) { ctx.moveTo(p.x, p.y); f = false; } else ctx.lineTo(p.x, p.y); }
        ctx.closePath();
        ctx.strokeStyle = `rgba(0, 200, 255, ${0.04 + glow * 0.04})`;
        ctx.lineWidth = 2; ctx.stroke();
        ctx.strokeStyle = `rgba(0, 180, 255, ${0.06 + glow * 0.03})`;
        ctx.lineWidth = 0.8; ctx.stroke();
        ctx.fillStyle = `rgba(0, 150, 255, ${0.008 + glow * 0.006})`;
        ctx.fill();
      }

      if (time % 25 === 0) spawn();
      for (let i = attacks.length - 1; i >= 0; i--) {
        const a = attacks[i];
        a.progress += a.speed;
        if (a.progress > 1) { attacks.splice(i, 1); continue; }
        a.trail.push(a.progress);
        if (a.trail.length > 30) a.trail.shift();
        for (let t = 0; t < a.trail.length; t++) {
          const p = a.trail[t];
          const bx = (1 - p) * (1 - p) * a.from.x + 2 * (1 - p) * p * a.midx + p * p * a.to.x;
          const by = (1 - p) * (1 - p) * a.from.y + 2 * (1 - p) * p * a.midy + p * p * a.to.y;
          const alpha = (t / a.trail.length) * 0.5;
          ctx.fillStyle = a.color + Math.floor(alpha * 120).toString(16).padStart(2, '0');
          ctx.beginPath(); ctx.arc(bx, by, 1.5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.setLineDash([2, 6]);
        ctx.strokeStyle = a.color + '20';
        ctx.lineWidth = 0.8;
        ctx.beginPath(); let f = true;
        for (let p = 0; p <= a.progress; p += 0.02) {
          const bx = (1 - p) * (1 - p) * a.from.x + 2 * (1 - p) * p * a.midx + p * p * a.to.x;
          const by = (1 - p) * (1 - p) * a.from.y + 2 * (1 - p) * p * a.midy + p * p * a.to.y;
          if (f) { ctx.moveTo(bx, by); f = false; } else ctx.lineTo(bx, by);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        const hp = a.progress;
        const hx = (1 - hp) * (1 - hp) * a.from.x + 2 * (1 - hp) * hp * a.midx + hp * hp * a.to.x;
        const hy = (1 - hp) * (1 - hp) * a.from.y + 2 * (1 - hp) * hp * a.midy + hp * hp * a.to.y;
        ctx.fillStyle = a.color + '88';
        ctx.beginPath(); ctx.arc(hx, hy, 2.5, 0, Math.PI * 2); ctx.fill();
      }

      for (const city of coords) {
        const p = Math.sin(time * 0.03 + city.x * 0.01) * 0.5 + 0.5;
        const r = 1.5 + p * 1.5;
        const g = ctx.createRadialGradient(city.x, city.y, 0, city.x, city.y, r * 4);
        g.addColorStop(0, `rgba(0, 200, 255, ${0.05 + p * 0.05})`);
        g.addColorStop(1, 'rgba(0, 200, 255, 0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(city.x, city.y, r * 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(150, 230, 255, ${0.4 + p * 0.3})`;
        ctx.beginPath(); ctx.arc(city.x, city.y, r, 0, Math.PI * 2); ctx.fill();
      }

      const sa = time * 0.005;
      const cx = W * 0.85, cy = H * 0.8, sr = Math.min(W, H) * 0.25;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, sr, sa - 0.6, sa + 0.6);
      ctx.closePath();
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, sr);
      rg.addColorStop(0, 'rgba(0, 255, 200, 0.015)');
      rg.addColorStop(1, 'rgba(0, 255, 200, 0)');
      ctx.fillStyle = rg; ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(sa) * sr, cy + Math.sin(sa) * sr);
      ctx.strokeStyle = 'rgba(0, 255, 200, 0.04)'; ctx.lineWidth = 0.8; ctx.stroke();

      for (let i = 0; i < 15; i++) {
        ctx.fillStyle = `rgba(0, 200, 255, ${0.005 + Math.random() * 0.01})`;
        ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
      }

      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [fit]);

  return <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} />;
};

// ─── KEYFRAMES ──────────────────────────────────────────────────────────
const keyframes = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
@keyframes pulseGlow {
  0%, 100% { opacity: 0.4; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.08); }
}
@keyframes logoScan {
  0% { top: -5%; opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { top: 105%; opacity: 0; }
}
@keyframes dash {
  from { stroke-dashoffset: 283; }
  to { stroke-dashoffset: 0; }
}
`;

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────
const LoginLoadingScreen = ({ isLoading, type = 'login' }) => {
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState(0);
  const [statusIdx, setStatusIdx] = useState(0);

  const isLogout = type === 'logout';
  const [tagline] = useState(() => allTaglines[Math.floor(Math.random() * allTaglines.length)]);
  const [footerText] = useState(() => FOOTER_TEXTS[Math.floor(Math.random() * FOOTER_TEXTS.length)]);

  useEffect(() => {
    if (isLoading) {
      setVisible(true);
      setStatusIdx(0);
      setPhase(1);
      const t2 = setTimeout(() => setPhase(2), 400);
      const t3 = setTimeout(() => setPhase(3), 800);
      const t4 = setTimeout(() => setPhase(4), 1200);

      const statusTimer = setInterval(() => {
        setStatusIdx(p => Math.min(p + 1, STATUS_MESSAGES.length - 1));
      }, 800);

      return () => {
        clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
        clearInterval(statusTimer);
      };
    }
    setPhase(0);
    const t = setTimeout(() => setVisible(false), 400);
    return () => clearTimeout(t);
  }, [isLoading]);

  if (!visible) return null;

  return (
    <Box sx={{
      position: 'fixed', inset: 0, zIndex: 9999, overflow: 'hidden',
      background: `linear-gradient(180deg, #050B14 0%, #091020 50%, #050B14 100%)`,
    }}>
      <style>{keyframes}</style>

      {/* World map background */}
      <LoadingBackground />

      {/* Scan line sweep */}
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
        <Box sx={{ position: 'absolute', left: '10%', right: '10%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(0, 212, 255, 0.25), transparent)', animation: 'logoScan 2.5s ease-in-out infinite', opacity: 0 }} />
      </Box>

      {/* Ambient glow orbs */}
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: `
          radial-gradient(ellipse at 20% 30%, rgba(0, 180, 255, 0.04) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 70%, rgba(100, 0, 255, 0.03) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, rgba(0, 200, 255, 0.02) 0%, transparent 60%)
        `,
      }} />

      {/* Center panel */}
      <Box sx={{
        position: 'absolute', inset: 0, zIndex: 2,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 0,
      }}>
        {/* Glassmorphism panel */}
        <Box sx={{
          background: 'rgba(6, 14, 28, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 180, 255, 0.08)',
          borderRadius: '20px',
          padding: { xs: '32px 28px', sm: '44px 48px' },
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2.5,
          boxShadow: '0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(0, 180, 255, 0.05), 0 0 60px rgba(0, 180, 255, 0.03)',
          maxWidth: '90vw', width: 420,
        }}>
          {/* Logo with aura */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={phase >= 1 ? { scale: 1, opacity: 1 } : {}}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ position: 'relative' }}
          >
            {/* Pulse ring */}
            <Box sx={{
              position: 'absolute', inset: -12, borderRadius: '50%',
              background: `radial-gradient(circle, rgba(0, 200, 255, 0.15) 0%, transparent 70%)`,
              animation: 'pulseGlow 2.5s ease-in-out infinite',
            }} />
            <Box sx={{ filter: 'drop-shadow(0 0 20px rgba(0, 180, 255, 0.3)) drop-shadow(0 0 60px rgba(0, 180, 255, 0.1))' }}>
              <EKavachLogo size="lg" variant="icon" />
            </Box>
          </motion.div>

          {/* Brand text */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <Typography sx={{
              fontWeight: 900, fontSize: { xs: '1.5rem', sm: '1.8rem' },
              fontStyle: 'italic', letterSpacing: '0.04em',
              background: 'linear-gradient(135deg, #22D3EE 0%, #58A6FF 40%, #A78BFA 65%, #22D3EE 100%)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              animation: 'shimmer 3s linear infinite',
              filter: 'drop-shadow(0 0 20px rgba(0, 180, 255, 0.15))',
              textAlign: 'center', lineHeight: 1.15,
            }}>
              {isLogout ? 'See you soon' : 'Welcome to eKavach'}
            </Typography>
          </motion.div>

          {/* Tagline */}
          <AnimatePresence mode="wait">
            {phase >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                style={{ width: '100%', textAlign: 'center' }}
              >
                <Typography sx={{
                  color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem',
                  fontStyle: 'italic', letterSpacing: '0.04em',
                  fontWeight: 400, lineHeight: 1.5, px: 1,
                }}>
                  &ldquo;{tagline}&rdquo;
                </Typography>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading ring + status */}
          <AnimatePresence>
            {phase >= 3 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 4 }}
              >

                {/* Status text */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={statusIdx}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Typography sx={{
                      color: 'rgba(0, 200, 255, 0.7)', fontSize: '0.6rem',
                      letterSpacing: '0.18em', fontWeight: 600, textTransform: 'uppercase',
                      textAlign: 'center',
                    }}>
                      {STATUS_MESSAGES[statusIdx]}
                    </Typography>
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Box>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={phase >= 4 ? { opacity: 1 } : {}}
        transition={{ delay: 0.5, duration: 0.6 }}
        style={{ position: 'absolute', bottom: 28, left: 0, right: 0, zIndex: 2, textAlign: 'center' }}
      >
        <Typography sx={{
          color: 'rgba(255,255,255,0.2)', fontSize: '0.5rem',
          letterSpacing: '0.25em', fontWeight: 500,
          textTransform: 'uppercase',
        }}>
          {footerText}
        </Typography>
      </motion.div>
    </Box>
  );
};

export default LoginLoadingScreen;
