import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  color: 'blue' | 'red';
}

function makeParticle(width: number, height: number, color: 'blue' | 'red'): Particle {
  const radius = 2 + Math.random() * 3;
  const speed = 0.3 + Math.random() * 0.7;
  return {
    x: color === 'blue' ? Math.random() * width : width - Math.random() * width,
    y: Math.random() * height,
    vx: color === 'blue' ? speed : -speed,
    vy: (Math.random() - 0.5) * 0.4,
    radius,
    opacity: 0.3 + Math.random() * 0.5,
    color,
  };
}

export default function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      particles = [
        ...Array.from({ length: 30 }, () => makeParticle(canvas.width, canvas.height, 'blue')),
        ...Array.from({ length: 30 }, () => makeParticle(canvas.width, canvas.height, 'red')),
      ];
    }

    function draw() {
      if (!canvas || !ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        // Loop particles
        if (p.color === 'blue' && p.x > canvas.width + p.radius) p.x = -p.radius;
        if (p.color === 'red' && p.x < -p.radius) p.x = canvas.width + p.radius;
        if (p.y < -p.radius) p.y = canvas.height + p.radius;
        if (p.y > canvas.height + p.radius) p.y = -p.radius;

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.5);
        if (p.color === 'blue') {
          gradient.addColorStop(0, `rgba(99, 179, 255, ${p.opacity})`);
          gradient.addColorStop(1, `rgba(59, 130, 246, 0)`);
        } else {
          gradient.addColorStop(0, `rgba(255, 80, 80, ${p.opacity})`);
          gradient.addColorStop(1, `rgba(220, 38, 38, 0)`);
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
    />
  );
}
