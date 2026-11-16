import * as React from "react";
import styled from "styled-components";

/**
 * Animated "knowledge graph" background for the login page.
 * Palette is taken from the R&D Workspace logo.
 */
const PALETTE = {
  blue: "0, 91, 234", // #005BEA – logo primary
  navy: "1, 24, 74", // #01184A – logo hub node
  white: "255, 255, 255",
};

const GLYPHS = ["< >", "{ }", "#", "[[ ]]", "</>", "¶", "§", "##", "- [ ]"];

type GraphNode = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  hub: boolean;
  phase: number;
};

type Floater = {
  x: number;
  y: number;
  vy: number;
  drift: number;
  size: number;
  alpha: number;
  kind: "glyph" | "doc";
  glyph: string;
  phase: number;
};

const LINK_DISTANCE = 150;
const POINTER_DISTANCE = 180;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export function WikiGraphCanvas() {
  const ref = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let nodes: GraphNode[] = [];
    let floaters: Floater[] = [];
    let frame = 0;
    let running = true;
    const pointer = { x: -9999, y: -9999 };

    const makeFloater = (initial: boolean): Floater => {
      const kind = Math.random() < 0.3 ? "doc" : "glyph";
      return {
        x: rand(0, width),
        y: initial ? rand(0, height) : height + rand(20, 120),
        vy: rand(0.12, 0.35),
        drift: rand(0.2, 0.6),
        size: kind === "doc" ? rand(22, 38) : rand(12, 20),
        alpha: rand(0.05, 0.14),
        kind,
        glyph: GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
        phase: rand(0, Math.PI * 2),
      };
    };

    const setup = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const nodeCount = Math.min(90, Math.round((width * height) / 16000));
      nodes = Array.from({ length: nodeCount }, () => {
        const hub = Math.random() < 0.12;
        return {
          x: rand(0, width),
          y: rand(0, height),
          vx: rand(-0.25, 0.25),
          vy: rand(-0.25, 0.25),
          r: hub ? rand(4, 5.5) : rand(1.6, 3),
          hub,
          phase: rand(0, Math.PI * 2),
        };
      });

      const floaterCount = Math.min(28, Math.round((width * height) / 45000));
      floaters = Array.from({ length: floaterCount }, () => makeFloater(true));
    };

    const drawDoc = (f: Floater, a: number) => {
      const w = f.size;
      const h = f.size * 1.25;
      const fold = w * 0.25;
      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(Math.sin(f.phase) * 0.08);
      ctx.strokeStyle = `rgba(${PALETTE.blue}, ${a * 2.2})`;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-w / 2, -h / 2);
      ctx.lineTo(w / 2 - fold, -h / 2);
      ctx.lineTo(w / 2, -h / 2 + fold);
      ctx.lineTo(w / 2, h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = `rgba(${PALETTE.blue}, ${a * 2})`;
      for (let i = 0; i < 4; i++) {
        const lw = i === 3 ? w * 0.35 : w * 0.6;
        ctx.fillRect(-w / 2 + w * 0.18, -h / 2 + h * (0.3 + i * 0.15), lw, 1.6);
      }
      ctx.restore();
    };

    const draw = (t: number) => {
      ctx.clearRect(0, 0, width, height);

      // Floating wiki glyphs & documents (back layer)
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const f of floaters) {
        f.y -= f.vy;
        f.phase += 0.004;
        f.x += Math.sin(f.phase) * f.drift * 0.3;
        const fadeEdge = Math.min(1, f.y / 120, (height - f.y + 120) / 200);
        const a = f.alpha * Math.max(0, fadeEdge);
        if (f.kind === "doc") {
          drawDoc(f, a);
        } else {
          ctx.font = `600 ${f.size}px ui-monospace, SFMono-Regular, Menlo, monospace`;
          ctx.fillStyle = `rgba(${PALETTE.white}, ${a})`;
          ctx.fillText(f.glyph, f.x, f.y);
        }
        if (f.y < -60) {
          Object.assign(f, makeFloater(false));
        }
      }

      // Graph nodes
      for (const n of nodes) {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < -20) n.x = width + 20;
        if (n.x > width + 20) n.x = -20;
        if (n.y < -20) n.y = height + 20;
        if (n.y > height + 20) n.y = -20;
      }

      // Edges between nearby nodes
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < LINK_DISTANCE) {
            const alpha = (1 - d / LINK_DISTANCE) * 0.35;
            ctx.strokeStyle = `rgba(${PALETTE.blue}, ${alpha})`;
            ctx.lineWidth = a.hub || b.hub ? 1.2 : 0.8;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
        // Pointer interaction
        const pd = Math.hypot(a.x - pointer.x, a.y - pointer.y);
        if (pd < POINTER_DISTANCE) {
          ctx.strokeStyle = `rgba(${PALETTE.blue}, ${(1 - pd / POINTER_DISTANCE) * 0.5})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }

      // Node dots – hubs mimic the navy, white-ringed node in the logo
      for (const n of nodes) {
        const pulse = 0.5 + 0.5 * Math.sin(t / 900 + n.phase);
        if (n.hub) {
          ctx.fillStyle = `rgba(${PALETTE.blue}, ${0.08 + pulse * 0.1})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r * 3.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgb(${PALETTE.navy})`;
          ctx.strokeStyle = `rgba(${PALETTE.white}, 0.75)`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${PALETTE.blue}, ${0.55 + pulse * 0.35})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = (t: number) => {
      if (!running) {
        return;
      }
      draw(t);
      frame = requestAnimationFrame(loop);
    };

    const onResize = () => {
      setup();
      if (reduceMotion) {
        draw(0);
      }
    };
    const onPointer = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    };
    const onPointerLeave = () => {
      pointer.x = -9999;
      pointer.y = -9999;
    };
    const onVisibility = () => {
      if (reduceMotion) {
        return;
      }
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
      } else if (!running) {
        running = true;
        frame = requestAnimationFrame(loop);
      }
    };

    setup();
    if (reduceMotion) {
      draw(0);
    } else {
      frame = requestAnimationFrame(loop);
      window.addEventListener("pointermove", onPointer);
      document.addEventListener("pointerleave", onPointerLeave);
    }
    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <Canvas ref={ref} aria-hidden="true" />;
}

const Canvas = styled.canvas`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
`;
