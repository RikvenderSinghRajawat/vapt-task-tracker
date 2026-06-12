import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';
import { styled } from '@mui/system';

const BackgroundContainer = styled(Box)({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: -1,
  background: '#020617', // Deep cosmic black
  overflow: 'hidden',
  '&::after': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'radial-gradient(circle at center, transparent 0%, rgba(2, 6, 23, 0.8) 100%)',
    pointerEvents: 'none'
  }
});

const CyberThreatBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // Configuration
    const COLORS = {
      grid: 'rgba(6, 182, 212, 0.03)',
      mapDots: 'rgba(30, 41, 59, 0.4)',
      landGlow: 'rgba(6, 182, 212, 0.1)',
      attackLine: 'rgba(34, 211, 238, 0.4)',
      attackHead: '#00ff88',
      pulse: 'rgba(239, 68, 68, 0.6)',
      node: 'rgba(6, 182, 212, 0.7)',
      binary: 'rgba(6, 182, 212, 0.08)',
      holographic: 'rgba(138, 43, 226, 0.15)',
      scan: 'rgba(6, 182, 212, 0.1)'
    };

    let width, height;
    let dots = [];
    let attacks = [];
    let pulses = [];
    let binaryRain = [];
    let scanLine = 0;
    let holographicLines = [];
    let radarSweepAngle = 0;

    // More realistic procedural world map based on actual continent approximations
    const continentShapes = [
      // North America
      { points: [
        [0.12, 0.25], [0.18, 0.2], [0.22, 0.18], [0.28, 0.17], [0.32, 0.19], 
        [0.34, 0.23], [0.33, 0.28], [0.30, 0.32], [0.26, 0.34], [0.20, 0.33],
        [0.15, 0.30], [0.12, 0.28]
      ]},
      // South America
      { points: [
        [0.23, 0.42], [0.26, 0.38], [0.29, 0.35], [0.31, 0.34], [0.33, 0.36], 
        [0.34, 0.40], [0.33, 0.45], [0.30, 0.48], [0.26, 0.50], [0.23, 0.48],
        [0.21, 0.45], [0.22, 0.43]
      ]},
      // Europe
      { points: [
        [0.42, 0.22], [0.45, 0.20], [0.48, 0.20], [0.50, 0.22], [0.51, 0.25], 
        [0.50, 0.28], [0.48, 0.30], [0.45, 0.30], [0.43, 0.28], [0.42, 0.25]
      ]},
      // Africa
      { points: [
        [0.45, 0.38], [0.48, 0.36], [0.52, 0.35], [0.55, 0.36], [0.57, 0.39], 
        [0.58, 0.43], [0.56, 0.47], [0.53, 0.50], [0.49, 0.50], [0.46, 0.48], 
        [0.44, 0.44], [0.45, 0.40]
      ]},
      // Asia
      { points: [
        [0.52, 0.20], [0.58, 0.18], [0.62, 0.19], [0.66, 0.22], [0.68, 0.26], 
        [0.69, 0.30], [0.68, 0.35], [0.66, 0.39], [0.62, 0.42], [0.58, 0.44], 
        [0.55, 0.42], [0.53, 0.38], [0.52, 0.32], [0.52, 0.25]
      ]},
      // Australia
      { points: [
        [0.75, 0.60], [0.78, 0.58], [0.80, 0.60], [0.81, 0.63], [0.79, 0.66], 
        [0.76, 0.68], [0.73, 0.68], [0.71, 0.65], [0.72, 0.62], [0.74, 0.60]
      ]}
    ];

    const isLand = (x, y) => {
      return continentShapes.some(continent => 
        pointInPolygon(x/y/width, y/height, continent.points)
      );
    };

    const pointInPolygon = (x, y, polygon) => {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][0], yi = polygon[i][1];
        const xj = polygon[j][0], yj = polygon[j][1];
        const intersect = ((yi > y) !== (yj > y)) 
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initMap();
      initBinaryRain();
      initHolographicLines();
    };

    const initMap = () => {
      dots = [];
      const spacing = Math.max(8, Math.min(width, height) / 50);
      for (let x = 0; x < width; x += spacing) {
        for (let y = 0; y < height; y += spacing) {
          if (isLand(x, y)) {
            // Add some noise to make it look more natural
            const noiseX = (Math.random() - 0.5) * spacing * 0.5;
            const noiseY = (Math.random() - 0.5) * spacing * 0.5;
            dots.push({
              x: x + noiseX, 
              y: y + noiseY, 
              size: Math.random() * 1.2 + 0.3,
              opacity: Math.random() * 0.4 + 0.1,
              blinkSpeed: Math.random() * 0.015 + 0.005,
              lastBlink: Date.now()
            });
          }
        }
      }
    };

    const initBinaryRain = () => {
      binaryRain = [];
      const count = Math.floor(width / 20);
      for (let i = 0; i < count; i++) {
        binaryRain.push({
          x: Math.random() * width,
          y: Math.random() * height,
          speed: Math.random() * 2 + 1,
          length: Math.floor(Math.random() * 3) + 2,
          char1: Math.random() > 0.5 ? "1" : "0",
          char2: Math.random() > 0.5 ? "1" : "0",
          opacity: Math.random() * 0.3 + 0.1
        });
      }
    };

    const initHolographicLines = () => {
      holographicLines = [];
      // Latitude lines
      for (let lat = -60; lat <= 60; lat += 15) {
        holographicLines.push({
          type: 'lat',
          value: lat,
          opacity: Math.random() * 0.2 + 0.1
        });
      }
      // Longitude lines
      for (let lng = -150; lng <= 180; lng += 30) {
        holographicLines.push({
          type: 'lng',
          value: lng,
          opacity: Math.random() * 0.2 + 0.1
        });
      }
    };

    const createAttack = () => {
      if (attacks.length > 6) return;
      
      const startShape = continentShapes[Math.floor(Math.random() * continentShapes.length)];
      const endShape = continentShapes[Math.floor(Math.random() * continentShapes.length)];
      
      if (startShape === endShape) return;

      const startPoint = getRandomPointInShape(startShape);
      const endPoint = getRandomPointInShape(endShape);

      attacks.push({
        start: { x: startPoint.x * width, y: startPoint.y * height },
        end: { x: endPoint.x * width, y: endPoint.y * height },
        progress: 0,
        speed: 0.003 + Math.random() * 0.007,
        thickness: Math.random() * 2 + 1,
        history: [], // For trail effect
        maxHistory: 20
      });
    };

    const getRandomPointInShape = (shape) => {
      const point = shape.points[Math.floor(Math.random() * shape.points.length)];
      // Add some variance
      return {
        x: point[0] + (Math.random() - 0.5) * 0.05,
        y: point[1] + (Math.random() - 0.5) * 0.05
      };
    };

    const drawGrid = () => {
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      const gridSize = 80;
      for (let x = 0; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    };

    const drawMap = () => {
      // Draw land dots with pulsing effect
      dots.forEach(dot => {
        const time = Date.now();
        const pulse = Math.sin(time * dot.blinkSpeed) * 0.3 + 0.7;
        const finalOpacity = dot.opacity * pulse;
        
        ctx.fillStyle = `rgba(6, 182, 212, ${finalOpacity})`;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Outer glow for some dots
        if (Math.random() > 0.95) {
          ctx.fillStyle = `rgba(6, 182, 212, ${finalOpacity * 0.3})`;
          ctx.beginPath();
          ctx.arc(dot.x, dot.y, dot.size * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      });
    };

    const drawAttacks = () => {
      attacks.forEach((attack, index) => {
        attack.progress += attack.speed;
        
        // Add current position to history for trail effect
        const currentPos = {
          x: attack.start.x + (attack.end.x - attack.start.x) * attack.progress,
          y: attack.start.y + (attack.end.y - attack.start.y) * attack.progress
        };
        
        attack.history.push({ x: currentPos.x, y: currentPos.y, opacity: 1 });
        if (attack.history.length > attack.maxHistory) {
          attack.history.shift();
        }
        
        // Draw trail
        for (let i = 0; i < attack.history.length; i++) {
          const point = attack.history[i];
          const opacity = (i / attack.history.length) * 0.4;
          ctx.strokeStyle = `rgba(34, 211, 238, ${opacity})`;
          ctx.lineWidth = attack.thickness * (i / attack.history.length);
          
          if (i > 0) {
            const prev = attack.history[i-1];
            ctx.beginPath();
            ctx.moveTo(prev.x, prev.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
          }
        }
        
        // Draw main attack line
        ctx.strokeStyle = COLORS.attackLine;
        ctx.lineWidth = attack.thickness;
        ctx.beginPath();
        ctx.moveTo(attack.start.x, attack.start.y);
        ctx.lineTo(currentPos.x, currentPos.y);
        ctx.stroke();
        
        // Draw attack head
        ctx.shadowBlur = 10;
        ctx.shadowColor = COLORS.attackHead;
        ctx.fillStyle = COLORS.attackHead;
        ctx.beginPath();
        ctx.arc(currentPos.x, currentPos.y, attack.thickness + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Create pulse on impact
        if (attack.progress >= 1) {
          pulses.push({ 
            x: attack.end.x, 
            y: attack.end.y, 
            r: 0, 
            maxR: 30 + Math.random() * 20, 
            opacity: 0.8,
            decay: 0.015 + Math.random() * 0.01
          });
          attacks.splice(index, 1);
        }
      });
    };

    const drawPulses = () => {
      pulses.forEach((p, i) => {
        p.r += 1.8;
        p.opacity -= p.decay;
        
        if (p.opacity > 0) {
          ctx.strokeStyle = `rgba(239, 68, 68, ${p.opacity})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.stroke();
          
          // Inner glow
          ctx.fillStyle = `rgba(239, 68, 68, ${p.opacity * 0.3})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r * 0.6, 0, Math.PI * 2);
          ctx.fill();
        }
        
        if (p.opacity <= 0) pulses.splice(i, 1);
      });
    };

    const drawBinaryRain = () => {
      ctx.font = '10px monospace';
      binaryRain.forEach(drop => {
        drop.y += drop.speed;
        if (drop.y > height) {
          drop.y = -Math.random() * 20;
          drop.x = Math.random() * width;
        }
        
        ctx.fillStyle = `rgba(6, 182, 212, ${drop.opacity})`;
        ctx.fillText(drop.char1, drop.x, drop.y);
        ctx.fillText(drop.char2, drop.x, drop.y + 12);
      });
    };

    const drawHolographicElements = () => {
      // Draw holographic latitude/longitude lines
      holographicLines.forEach(line => {
        ctx.strokeStyle = `rgba(138, 43, 226, ${line.opacity * 0.5})`;
        ctx.lineWidth = 0.8;
        ctx.setLineDash([4, 6]);
        
        if (line.type === 'lat') {
          // Convert latitude to y coordinate
          const y = (0.5 - line.value / 180) * height;
          if (y >= 0 && y <= height) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
          }
        } else if (line.type === 'lng') {
          // Convert longitude to x coordinate
          const x = (line.value + 180) / 360 * width;
          if (x >= 0 && x <= width) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
            ctx.stroke();
          }
        }
      });
      
      // Draw coordinate labels occasionally
      if (Math.random() < 0.02) {
        ctx.fillStyle = 'rgba(138, 43, 226, 0.3)';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        const sampleLines = holographicLines.filter(l => Math.random() > 0.7).slice(0, 3);
        sampleLines.forEach(line => {
          if (line.type === 'lat') {
            const y = (0.5 - line.value / 180) * height;
            if (y >= 0 && y <= height) {
              ctx.fillText(`${line.value}°`, width * 0.92, y);
            }
          } else if (line.type === 'lng') {
            const x = (line.value + 180) / 360 * width;
            if (x >= 0 && x <= width) {
              ctx.fillText(`${line.value}°`, x, height * 0.92);
            }
          }
        });
      }
    };

    const drawRadarSweep = () => {
      radarSweepAngle = (radarSweepAngle + 0.5) % 360;
      
      // Outer radar ring
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(width/2, height/2, Math.min(width, height) * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      
      // Radar sweep line
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width/2, height/2);
      const endX = width/2 + Math.cos(radarSweepAngle * Math.PI/180) * Math.min(width, height) * 0.4;
      const endY = height/2 + Math.sin(radarSweepAngle * Math.PI/180) * Math.min(width, height) * 0.4;
      ctx.lineTo(endX, endY);
      ctx.stroke();
      
      // Radar pulse circles
      for (let i = 1; i <= 3; i++) {
        const radius = Math.min(width, height) * 0.4 * (0.3 + i * 0.2);
        const alpha = Math.max(0, 0.3 - (radarSweepAngle % 120) / 120 * 0.3);
        if (alpha > 0) {
          ctx.strokeStyle = `rgba(6, 182, 212, ${alpha * 0.4})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 4]);
          ctx.beginPath();
          ctx.arc(width/2, height/2, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    };

    const drawScanLine = () => {
      scanLine = (scanLine + 1.5) % height;
      
      // Main scan line
      const scanGrad = ctx.createLinearGradient(0, scanLine - 60, 0, scanLine);
      scanGrad.addColorStop(0, 'transparent');
      scanGrad.addColorStop(0.5, 'rgba(6, 182, 212, 0.08)');
      scanGrad.addColorStop(1, 'transparent');
      
      ctx.fillStyle = scanGrad;
      ctx.fillRect(0, scanLine - 60, width, 60);
      
      // Scan line glow
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, scanLine);
      ctx.lineTo(width, scanLine);
      ctx.stroke();
    };

    const drawInterfaceElements = () => {
      // Subtle animated fog
      if (Math.random() < 0.02) {
        const fogSize = Math.random() * 100 + 50;
        ctx.fillStyle = 'rgba(6, 182, 212, 0.02)';
        ctx.beginPath();
        ctx.ellipse(
          Math.random() * width,
          Math.random() * height * 0.8,
          fogSize,
          fogSize * 0.6,
          Math.random() * Math.PI,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
      
      // Floating cyber particles
      if (Math.random() < 0.05) {
        const size = Math.random() * 3 + 1;
        ctx.fillStyle = 'rgba(6, 182, 212, 0.4)';
        ctx.beginPath();
        ctx.arc(
          Math.random() * width,
          Math.random() * height * 0.9,
          size,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }
    };

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw in order: background elements first, then foreground
      drawGrid();
      drawMap();
      drawBinaryRain();
      drawHolographicElements();
      drawAttacks();
      drawPulses();
      drawRadarSweep();
      drawScanLine();
      drawInterfaceElements();
      
      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener('resize', resize);
    resize();
    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <BackgroundContainer>
      <canvas ref={canvasRef} style={{ display: 'block' }} />
      
      {/* Holographic UI Overlays */}
      <Box sx={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: 'rgba(6, 182, 212, 0.3)',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        pointerEvents: 'none',
        display: { xs: 'none', md: 'block' }
      }}>
        <div>EKAVACH SECURITY CONSOLE</div>
        <div>THREAT LEVEL: <span style={{ color: '#ff6b6b' }}>ELEVATED</span></div>
        <div>ACTIVE DEFENSES: 12,408</div>
        <div>BLOCKED THREATS: 2,483,921</div>
        <div style={{ marginTop: 8, color: '#00ff88', fontSize: '0.7rem' }}>
          ● ENCRYPTED CHANNELS ACTIVE
        </div>
      </Box>

      <Box sx={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        color: 'rgba(6, 182, 212, 0.3)',
        fontFamily: 'monospace',
        textAlign: 'right',
        fontSize: '0.75rem',
        pointerEvents: 'none',
        display: { xs: 'none', md: 'block' }
      }}>
        <div>GLOBAL SCANNING: ACTIVE</div>
        <div>LAST UPDATE: <span style={{ opacity: 0.6 }}>{new Date().toLocaleTimeString()}</span></div>
        <div>SYSTEM STATUS: <span style={{ color: '#00ff88' }}>NOMINAL</span></div>
        <div style={{ marginTop: 4, fontSize: '0.7rem' }}>
          LAT: 28.6139° N　LNG: 77.2090° E
        </div>
      </Box>

      {/* Animated Shield Pulse */}
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        border: '2px solid rgba(6, 182, 212, 0.3)',
        pointerEvents: 'none',
        background: 'rgba(6, 182, 212, 0.05)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-2px',
          left: '-2px',
          right: '-2px',
          bottom: '-2px',
          borderRadius: '50%',
          border: '1px solid rgba(6, 182, 212, 0.2)',
          animation: 'shieldPulse 3s ease-in-out infinite'
        },
        '@keyframes shieldPulse': {
          '0%, 100%': { 
            transform: 'scale(1)', 
            opacity: '0.7' 
          },
          '50%': { 
            transform: 'scale(1.05)', 
            opacity: '0.4' 
          }
        }
      }} />

      {/* Threat Counter */}
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        color: 'rgba(6, 182, 212, 0.4)',
        fontFamily: 'monospace',
        fontSize: '0.9rem',
        textAlign: 'center',
        pointerEvents: 'none',
        display: { xs: 'none', md: 'block' }
      }}>
        <div style={{ fontSize: '1.4rem', color: '#00ff88', fontWeight: 'bold' }}>
          {Math.floor(Math.random() * 100)}
        </div>
        <div>LIVE THREATS</div>
        <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>
          Blocked: {Math.floor(Math.random() * 1000)}
        </div>
      </Box>
    </BackgroundContainer>
  );
};

export default CyberThreatBackground;