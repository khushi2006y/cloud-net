import React, { useEffect, useRef } from 'react';
import { WeatherMood } from '../types/weather';

interface WeatherAtmosphereProps {
  mood: WeatherMood;
}

export const WeatherAtmosphere: React.FC<WeatherAtmosphereProps> = ({ mood }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // ============================================================
    // CINEMATIC PARTICLE SYSTEMS (Makoto Shinkai / Apple Weather Inspired)
    // ============================================================

    // 1. Cinematic Rain Streaks & Splashes
    interface RainParticle {
      x: number;
      y: number;
      len: number;
      speed: number;
      opacity: number;
      width: number;
      angle: number;
    }
    const rainParticles: RainParticle[] = Array.from({ length: 140 }, () => ({
      x: Math.random() * (width + 300) - 150,
      y: Math.random() * height,
      len: Math.random() * 40 + 20,
      speed: Math.random() * 14 + 18,
      opacity: Math.random() * 0.45 + 0.2,
      width: Math.random() * 1.5 + 0.8,
      angle: 0.18 // slight cinematic wind slant
    }));

    interface RainSplash {
      x: number;
      y: number;
      radius: number;
      maxRadius: number;
      opacity: number;
    }
    const rainSplashes: RainSplash[] = [];

    // 2. Cinematic Lightning Bolt System
    interface LightningBranch {
      points: { x: number; y: number }[];
      alpha: number;
      width: number;
    }
    let lightningBranches: LightningBranch[] = [];
    let lightningFlashAlpha = 0;
    let nextLightningTime = Math.random() * 200 + 120;
    let lightningTimer = 0;

    const generateLightning = () => {
      const startX = Math.random() * (width * 0.7) + width * 0.15;
      const startY = 0;
      const branches: LightningBranch[] = [];

      const createBranch = (sx: number, sy: number, length: number, angle: number, depth: number) => {
        const points = [{ x: sx, y: sy }];
        let curX = sx;
        let curY = sy;
        const segments = 12;

        for (let i = 0; i < segments; i++) {
          const segLen = length / segments;
          curX += Math.sin(angle) * segLen + (Math.random() - 0.5) * 28;
          curY += Math.cos(angle) * segLen + Math.random() * 12;
          points.push({ x: curX, y: curY });

          if (depth > 0 && Math.random() < 0.25) {
            createBranch(curX, curY, length * 0.55, angle + (Math.random() - 0.5) * 0.9, depth - 1);
          }
        }

        branches.push({
          points,
          alpha: 1.0,
          width: depth === 2 ? 3 : depth === 1 ? 1.8 : 1.0
        });
      };

      createBranch(startX, startY, height * 0.65, 0.1, 2);
      lightningBranches = branches;
      lightningFlashAlpha = 0.45;
    };

    // 3. Volumetric Floating Clouds (Atmospheric Horizon)
    interface CloudBank {
      x: number;
      y: number;
      radiusX: number;
      radiusY: number;
      speed: number;
      opacity: number;
      color: string;
    }
    const cloudBanks: CloudBank[] = Array.from({ length: 12 }, (_, i) => ({
      x: (i / 12) * width + Math.random() * 100,
      y: Math.random() * (height * 0.45),
      radiusX: Math.random() * 250 + 180,
      radiusY: Math.random() * 120 + 80,
      speed: Math.random() * 0.25 + 0.08,
      opacity: Math.random() * 0.18 + 0.08,
      color: '255, 255, 255'
    }));

    // 4. Luminous Golden God Rays & Sun Bokeh
    interface SunRay {
      angle: number;
      width: number;
      speed: number;
      intensity: number;
    }
    const sunRays: SunRay[] = Array.from({ length: 8 }, (_, i) => ({
      angle: (i / 8) * Math.PI * 0.6 + 0.2,
      width: Math.random() * 0.15 + 0.08,
      speed: (Math.random() - 0.5) * 0.0015,
      intensity: Math.random() * 0.2 + 0.1
    }));

    interface BokehOrb {
      x: number;
      y: number;
      radius: number;
      speedY: number;
      speedX: number;
      opacity: number;
      hue: number;
    }
    const bokehOrbs: BokehOrb[] = Array.from({ length: 35 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 28 + 6,
      speedY: -(Math.random() * 0.6 + 0.2),
      speedX: (Math.random() - 0.5) * 0.4,
      opacity: Math.random() * 0.25 + 0.08,
      hue: Math.random() * 35 + 25
    }));

    // 5. Cinematic Wind Streams & Floating Leaves
    interface WindStreak {
      x: number;
      y: number;
      length: number;
      speed: number;
      thickness: number;
      opacity: number;
      curve: number;
    }
    const windStreaks: WindStreak[] = Array.from({ length: 22 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      length: Math.random() * 280 + 140,
      speed: Math.random() * 18 + 14,
      thickness: Math.random() * 2.5 + 1,
      opacity: Math.random() * 0.35 + 0.1,
      curve: (Math.random() - 0.5) * 40
    }));

    interface FloatingLeaf {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;
      rotation: number;
      rotSpeed: number;
      opacity: number;
    }
    const leaves: FloatingLeaf[] = Array.from({ length: 16 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 10 + 6,
      speedX: Math.random() * 8 + 6,
      speedY: Math.random() * 3 + 1,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.1,
      opacity: Math.random() * 0.5 + 0.3
    }));

    // 6. Dust Storm Golden Sand Wall & Swirling Haze
    interface SandParticle {
      x: number;
      y: number;
      len: number;
      speedX: number;
      speedY: number;
      size: number;
      opacity: number;
    }
    const sandParticles: SandParticle[] = Array.from({ length: 160 }, () => ({
      x: Math.random() * (width + 200) - 100,
      y: Math.random() * height,
      len: Math.random() * 35 + 10,
      speedX: Math.random() * 18 + 14,
      speedY: (Math.random() - 0.25) * 4,
      size: Math.random() * 2.5 + 0.8,
      opacity: Math.random() * 0.45 + 0.15
    }));

    // 7. Undulating Multi-layered Ocean / Flood Caustics
    let waveTime = 0;

    // Time ticker
    let frame = 0;

    // ============================================================
    // MAIN RENDER LOOP
    // ============================================================
    const render = () => {
      frame++;
      ctx.clearRect(0, 0, width, height);

      // ------------------------------------------------------------
      // 1. RAINFALL SCENE (Cinematic Downpour + Mist + Water Splashes)
      // ------------------------------------------------------------
      if (mood === 'rainfall') {
        // Deep misty background cloud layers
        cloudBanks.forEach(c => {
          c.x += c.speed;
          if (c.x - c.radiusX > width) c.x = -c.radiusX;

          const grad = ctx.createRadialGradient(c.x, c.y, 10, c.x, c.y, c.radiusX);
          grad.addColorStop(0, 'rgba(186, 230, 253, 0.25)');
          grad.addColorStop(0.6, 'rgba(224, 242, 254, 0.12)');
          grad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, c.radiusX, c.radiusY, 0, 0, Math.PI * 2);
          ctx.fill();
        });

        // Slanted luminous rain streaks with head/tail gradients
        rainParticles.forEach(p => {
          const dx = Math.sin(p.angle) * p.len;
          const dy = Math.cos(p.angle) * p.len;

          const rainGrad = ctx.createLinearGradient(p.x, p.y, p.x + dx, p.y + dy);
          rainGrad.addColorStop(0, `rgba(14, 165, 233, 0)`);
          rainGrad.addColorStop(0.6, `rgba(2, 132, 199, ${p.opacity})`);
          rainGrad.addColorStop(1, `rgba(56, 189, 248, ${p.opacity * 1.3})`);

          ctx.strokeStyle = rainGrad;
          ctx.lineWidth = p.width;
          ctx.lineCap = 'round';

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + dx, p.y + dy);
          ctx.stroke();

          p.x += Math.sin(p.angle) * p.speed;
          p.y += Math.cos(p.angle) * p.speed;

          // Hit ground -> generate splash ripple
          if (p.y > height - 60 && Math.random() < 0.15) {
            rainSplashes.push({
              x: p.x,
              y: height - Math.random() * 40,
              radius: 1,
              maxRadius: Math.random() * 14 + 6,
              opacity: 0.5
            });
          }

          if (p.y > height || p.x > width + 100) {
            p.y = -p.len - 10;
            p.x = Math.random() * (width + 300) - 150;
          }
        });

        // Render Ground Splash Ripples
        for (let i = rainSplashes.length - 1; i >= 0; i--) {
          const s = rainSplashes[i];
          ctx.strokeStyle = `rgba(2, 132, 199, ${s.opacity * 0.4})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(s.x, s.y, s.radius * 2, s.radius * 0.8, 0, 0, Math.PI * 2);
          ctx.stroke();

          s.radius += 0.8;
          s.opacity *= 0.92;

          if (s.opacity < 0.03 || s.radius > s.maxRadius) {
            rainSplashes.splice(i, 1);
          }
        }
      }

      // ------------------------------------------------------------
      // 2. THUNDERSTORM SCENE (Atmospheric Anvil Clouds + Branching Lightning)
      // ------------------------------------------------------------
      else if (mood === 'thunderstorm') {
        // Dark brooding storm clouds
        cloudBanks.forEach(c => {
          c.x += c.speed * 1.5;
          if (c.x - c.radiusX > width) c.x = -c.radiusX;

          const grad = ctx.createRadialGradient(c.x, c.y, 20, c.x, c.y, c.radiusX * 1.2);
          grad.addColorStop(0, 'rgba(109, 40, 217, 0.28)');
          grad.addColorStop(0.5, 'rgba(76, 29, 149, 0.15)');
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, c.radiusX * 1.2, c.radiusY * 1.2, 0, 0, Math.PI * 2);
          ctx.fill();
        });

        // Fast violent rain streaks
        rainParticles.forEach(p => {
          const dx = Math.sin(0.24) * p.len * 1.2;
          const dy = Math.cos(0.24) * p.len * 1.2;

          ctx.strokeStyle = `rgba(147, 51, 234, ${p.opacity * 0.6})`;
          ctx.lineWidth = p.width * 1.3;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + dx, p.y + dy);
          ctx.stroke();

          p.x += Math.sin(0.24) * p.speed * 1.3;
          p.y += Math.cos(0.24) * p.speed * 1.3;

          if (p.y > height || p.x > width + 100) {
            p.y = -p.len - 10;
            p.x = Math.random() * (width + 300) - 150;
          }
        });

        // Lightning logic
        lightningTimer++;
        if (lightningTimer > nextLightningTime) {
          generateLightning();
          lightningTimer = 0;
          nextLightningTime = Math.random() * 260 + 140;
        }

        // Render Lightning Flash Glow
        if (lightningFlashAlpha > 0.01) {
          ctx.fillStyle = `rgba(233, 213, 255, ${lightningFlashAlpha * 0.45})`;
          ctx.fillRect(0, 0, width, height);

          // Top cloud rim illumination
          const rimGrad = ctx.createLinearGradient(0, 0, 0, height * 0.5);
          rimGrad.addColorStop(0, `rgba(255, 255, 255, ${lightningFlashAlpha * 0.8})`);
          rimGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
          ctx.fillStyle = rimGrad;
          ctx.fillRect(0, 0, width, height * 0.5);

          lightningFlashAlpha *= 0.84;
        }

        // Render Branching Lightning Bolts with Electric Core
        if (lightningBranches.length > 0) {
          lightningBranches.forEach(b => {
            if (b.alpha > 0.02) {
              // Outer Glow
              ctx.strokeStyle = `rgba(168, 85, 247, ${b.alpha * 0.7})`;
              ctx.lineWidth = b.width + 6;
              ctx.lineJoin = 'miter';
              ctx.beginPath();
              b.points.forEach((pt, idx) => {
                if (idx === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
              });
              ctx.stroke();

              // Inner Bright White Core
              ctx.strokeStyle = `rgba(255, 255, 255, ${b.alpha})`;
              ctx.lineWidth = b.width;
              ctx.beginPath();
              b.points.forEach((pt, idx) => {
                if (idx === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
              });
              ctx.stroke();

              b.alpha *= 0.82;
            }
          });
        }
      }

      // ------------------------------------------------------------
      // 3. HEATWAVE SCENE (Volumetric God Rays + Radiant Sun + Heat Shimmer Bokeh)
      // ------------------------------------------------------------
      else if (mood === 'heatwave') {
        const sunX = width - 180;
        const sunY = 130;

        // Radiant Volumetric God Rays
        sunRays.forEach(ray => {
          ray.angle += ray.speed;
          const rayLen = Math.max(width, height) * 1.2;
          const startAngle = ray.angle - ray.width / 2;
          const endAngle = ray.angle + ray.width / 2;

          const rayGrad = ctx.createRadialGradient(sunX, sunY, 30, sunX, sunY, rayLen);
          rayGrad.addColorStop(0, `rgba(251, 146, 60, ${ray.intensity * 0.45})`);
          rayGrad.addColorStop(0.4, `rgba(254, 215, 170, ${ray.intensity * 0.2})`);
          rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.fillStyle = rayGrad;
          ctx.beginPath();
          ctx.moveTo(sunX, sunY);
          ctx.arc(sunX, sunY, rayLen, startAngle, endAngle);
          ctx.closePath();
          ctx.fill();
        });

        // Radiant Sun Core & Lens Flare
        const sunCorona = ctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, 260);
        sunCorona.addColorStop(0, 'rgba(255, 247, 237, 0.9)');
        sunCorona.addColorStop(0.2, 'rgba(253, 186, 116, 0.45)');
        sunCorona.addColorStop(0.6, 'rgba(251, 146, 60, 0.15)');
        sunCorona.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = sunCorona;
        ctx.beginPath();
        ctx.arc(sunX, sunY, 260, 0, Math.PI * 2);
        ctx.fill();

        // Rising Golden Bokeh Shimmer Orbs
        bokehOrbs.forEach(b => {
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
          const bGrad = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.radius);
          bGrad.addColorStop(0, `rgba(251, 146, 60, ${b.opacity * 0.6})`);
          bGrad.addColorStop(0.7, `rgba(253, 186, 116, ${b.opacity * 0.2})`);
          bGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.fillStyle = bGrad;
          ctx.fill();

          b.y += b.speedY;
          b.x += b.speedX + Math.sin(frame * 0.02 + b.radius) * 0.3;

          if (b.y < -b.radius) {
            b.y = height + b.radius;
            b.x = Math.random() * width;
          }
        });
      }

      // ------------------------------------------------------------
      // 4. DENSE FOG & MIST SCENE (Dreamy Volumetric Gauzy Mist Layers)
      // ------------------------------------------------------------
      else if (mood === 'fog') {
        cloudBanks.forEach((c, idx) => {
          c.x += c.speed * 0.6;
          if (c.x - c.radiusX > width) c.x = -c.radiusX;

          const fogGrad = ctx.createRadialGradient(c.x, c.y + (idx % 3) * 60, 30, c.x, c.y + (idx % 3) * 60, c.radiusX * 1.5);
          fogGrad.addColorStop(0, 'rgba(148, 163, 184, 0.28)');
          fogGrad.addColorStop(0.5, 'rgba(203, 213, 225, 0.16)');
          fogGrad.addColorStop(1, 'rgba(248, 250, 252, 0)');

          ctx.fillStyle = fogGrad;
          ctx.beginPath();
          ctx.ellipse(c.x, c.y + (idx % 3) * 60, c.radiusX * 1.6, c.radiusY * 0.9, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // ------------------------------------------------------------
      // 5. DUST STORM (ANDHI) SCENE (Golden Thar Sand Wall & Swirls)
      // ------------------------------------------------------------
      else if (mood === 'dust storm') {
        // High velocity streaming sand grains
        sandParticles.forEach(p => {
          const sandGrad = ctx.createLinearGradient(p.x, p.y, p.x + p.len, p.y + p.speedY * 2);
          sandGrad.addColorStop(0, 'rgba(234, 179, 8, 0)');
          sandGrad.addColorStop(0.5, `rgba(202, 138, 4, ${p.opacity})`);
          sandGrad.addColorStop(1, `rgba(161, 98, 7, ${p.opacity * 1.2})`);

          ctx.strokeStyle = sandGrad;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + p.len, p.y + p.speedY * 2);
          ctx.stroke();

          p.x += p.speedX;
          p.y += p.speedY;

          if (p.x > width + 50) {
            p.x = -p.len - 20;
            p.y = Math.random() * height;
          }
        });
      }

      // ------------------------------------------------------------
      // 6. STRONG WIND SCENE (Curved Aerodynamic Streamlines & Drifting Leaves)
      // ------------------------------------------------------------
      else if (mood === 'strong wind') {
        // Elegant swooping wind stream lines
        windStreaks.forEach(w => {
          ctx.lineWidth = w.thickness;
          const wGrad = ctx.createLinearGradient(w.x, w.y, w.x + w.length, w.y);
          wGrad.addColorStop(0, 'rgba(13, 148, 136, 0)');
          wGrad.addColorStop(0.5, `rgba(20, 184, 166, ${w.opacity})`);
          wGrad.addColorStop(1, 'rgba(45, 212, 191, 0)');

          ctx.strokeStyle = wGrad;
          ctx.beginPath();
          ctx.moveTo(w.x, w.y);
          ctx.bezierCurveTo(
            w.x + w.length * 0.3, w.y + w.curve,
            w.x + w.length * 0.7, w.y - w.curve,
            w.x + w.length, w.y
          );
          ctx.stroke();

          w.x += w.speed;
          if (w.x > width + w.length) {
            w.x = -w.length - 30;
            w.y = Math.random() * height;
          }
        });

        // Floating leaves fluttering in wind
        leaves.forEach(l => {
          ctx.save();
          ctx.translate(l.x, l.y);
          ctx.rotate(l.rotation);

          ctx.fillStyle = `rgba(13, 148, 136, ${l.opacity * 0.7})`;
          ctx.beginPath();
          ctx.ellipse(0, 0, l.size, l.size * 0.45, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();

          ctx.restore();

          l.x += l.speedX;
          l.y += l.speedY;
          l.rotation += l.rotSpeed;

          if (l.x > width + 50) {
            l.x = -30;
            l.y = Math.random() * height;
          }
        });
      }

      // ------------------------------------------------------------
      // 7. URBAN FLOODING SCENE (Luminous Serene Water Waves & Caustic Reflections)
      // ------------------------------------------------------------
      else if (mood === 'flooding') {
        waveTime += 0.025;

        // Wave Layer 1
        ctx.fillStyle = 'rgba(3, 105, 161, 0.08)';
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 25) {
          const y = height - 160 + Math.sin(x * 0.008 + waveTime) * 25 + Math.cos(x * 0.015 + waveTime) * 12;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        // Wave Layer 2
        ctx.fillStyle = 'rgba(2, 132, 199, 0.06)';
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 25) {
          const y = height - 100 + Math.sin(x * 0.012 - waveTime) * 18;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
      }

      // ------------------------------------------------------------
      // 8. CLEAR DAY / DEFAULT (Sunny Celestial Radiance & Airy Micro-particles)
      // ------------------------------------------------------------
      else {
        // Soft sunny celestial glow in top corner
        const skyGlow = ctx.createRadialGradient(width * 0.85, 110, 40, width * 0.85, 110, 420);
        skyGlow.addColorStop(0, 'rgba(56, 189, 248, 0.18)');
        skyGlow.addColorStop(0.5, 'rgba(186, 230, 253, 0.09)');
        skyGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = skyGlow;
        ctx.fillRect(0, 0, width, height);

        // Gentle floating white cloud puffs
        cloudBanks.forEach(c => {
          c.x += c.speed * 0.5;
          if (c.x - c.radiusX > width) c.x = -c.radiusX;

          const cGrad = ctx.createRadialGradient(c.x, c.y, 20, c.x, c.y, c.radiusX);
          cGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
          cGrad.addColorStop(0.7, 'rgba(240, 249, 255, 0.12)');
          cGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

          ctx.fillStyle = cGrad;
          ctx.beginPath();
          ctx.ellipse(c.x, c.y, c.radiusX, c.radiusY, 0, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [mood]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-1000"
      style={{ width: '100vw', height: '100vh' }}
    />
  );
};
