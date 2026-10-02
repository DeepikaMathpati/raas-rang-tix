import { useEffect, useRef } from "react";

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
};

type Burst = {
  x: number;
  y: number;
  delay: number;
  depth: number;
};

const BURSTS: Burst[] = [
  { x: 0.2, y: 0.19, delay: 350, depth: 0.74 },
  { x: 0.78, y: 0.24, delay: 1_450, depth: 1 },
  { x: 0.56, y: 0.13, delay: 2_750, depth: 0.62 },
  { x: 0.34, y: 0.32, delay: 4_050, depth: 0.84 },
  { x: 0.88, y: 0.14, delay: 5_300, depth: 0.55 },
];

function CrowdSilhouette() {
  return (
    <div className="festival-crowd" aria-hidden="true">
      {Array.from({ length: 18 }, (_, index) => (
        <span key={index} style={{ "--crowd-index": index } as React.CSSProperties}>
          <i />
        </span>
      ))}
    </div>
  );
}

function DiyaLine() {
  return (
    <div className="hero-diya-line" aria-hidden="true">
      {Array.from({ length: 7 }, (_, index) => (
        <span key={index} style={{ "--diya-index": index } as React.CSSProperties}>
          <i />
        </span>
      ))}
    </div>
  );
}

export function CinematicHeroEffects() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const compact = window.matchMedia("(max-width: 767px)");
    const rootStyles = getComputedStyle(document.documentElement);
    const gold = rootStyles.getPropertyValue("--gold").trim() || "gold";
    const ember = rootStyles.getPropertyValue("--ember").trim() || "orange";
    const softGold = rootStyles.getPropertyValue("--gold-soft").trim() || "gold";
    let width = 0;
    let height = 0;
    let frame = 0;
    let running = true;
    let cycleStarted = performance.now();
    let nextBurst = 0;
    const sparks: Spark[] = [];

    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const createBurst = ({ x, y, depth }: Burst) => {
      const count = compact.matches ? Math.round(22 * depth) : Math.round(42 * depth);
      const radius = (compact.matches ? 1.5 : 2.1) * depth;
      for (let index = 0; index < count; index += 1) {
        const angle = (Math.PI * 2 * index) / count + Math.random() * 0.09;
        const velocity = (0.65 + Math.random() * 1.35) * radius;
        sparks.push({
          x: width * x,
          y: height * y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: 0,
          maxLife: 62 + Math.random() * 45,
          size: 0.75 + Math.random() * 1.25 * depth,
          color: index % 5 === 0 ? ember : index % 3 === 0 ? softGold : gold,
          gravity: 0.012 + Math.random() * 0.012,
        });
      }
    };

    const addEmber = () => {
      sparks.push({
        x: Math.random() * width,
        y: height * (0.6 + Math.random() * 0.4),
        vx: (Math.random() - 0.5) * 0.16,
        vy: -0.2 - Math.random() * 0.35,
        life: 0,
        maxLife: 110 + Math.random() * 100,
        size: 0.5 + Math.random() * 1.2,
        color: Math.random() > 0.35 ? gold : ember,
        gravity: -0.0008,
      });
    };

    const draw = (now: number) => {
      if (!running) return;
      ctx.clearRect(0, 0, width, height);

      if (!reducedMotion.matches) {
        const elapsed = now - cycleStarted;
        if (nextBurst < BURSTS.length && elapsed >= BURSTS[nextBurst].delay) {
          createBurst(BURSTS[nextBurst]);
          nextBurst += 1;
        }
        if (elapsed > 7_000) {
          cycleStarted = now;
          nextBurst = 0;
        }
        if (Math.random() < (compact.matches ? 0.08 : 0.16)) addEmber();
      }

      ctx.globalCompositeOperation = "lighter";
      for (let index = sparks.length - 1; index >= 0; index -= 1) {
        const spark = sparks[index];
        spark.life += 1;
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.vy += spark.gravity;
        spark.vx *= 0.992;
        const alpha = Math.max(0, 1 - spark.life / spark.maxLife);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = spark.color;
        ctx.shadowColor = spark.color;
        ctx.shadowBlur = spark.size * 7;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size * (0.45 + alpha), 0, Math.PI * 2);
        ctx.fill();
        if (spark.life >= spark.maxLife) sparks.splice(index, 1);
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      ctx.globalCompositeOperation = "source-over";
      frame = requestAnimationFrame(draw);
    };

    const observer = new IntersectionObserver(([entry]) => {
      running = entry.isIntersecting;
      if (running) frame = requestAnimationFrame(draw);
      else cancelAnimationFrame(frame);
    });
    resize();
    observer.observe(canvas);
    window.addEventListener("resize", resize);
    frame = requestAnimationFrame(draw);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <canvas ref={canvasRef} className="absolute inset-0 z-[3] h-full w-full" />
      <div className="hero-opening-flash" />
      <div className="hero-atmosphere" />
      <svg className="dandiya-trails" viewBox="0 0 1000 900" preserveAspectRatio="none">
        <path d="M80 620 C260 390 320 250 510 150" />
        <path d="M920 610 C760 400 695 265 500 165" />
        <path d="M160 700 C350 560 640 520 850 690" />
      </svg>
      <CrowdSilhouette />
      <DiyaLine />
    </div>
  );
}