"use client";
import React, { useEffect, useRef } from 'react';
import { useNodeStore } from '@/lib/store/nodeStore';

export const SimulationCanvas = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { metrics } = useNodeStore();

  const drawPaths = (ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 400, 200);
    ctx.strokeStyle = '#166534'; // green-800
    ctx.lineWidth = 1;

    // Dibujar 20 trayectorias proyectadas
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 100);
      let currentY = 100;
      for (let x = 0; x < 400; x += 20) {
        // La fricción (metrics.ihg) afecta la volatilidad
        const volatility = (1 - metrics.ihg) * 15;
        currentY += (Math.random() - 0.5) * volatility;
        ctx.lineTo(x, currentY);
      }
      ctx.stroke();
    }

    // Dibujar trayectoria real (negrita)
    ctx.strokeStyle = '#22c55e'; // green-500
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 100);
    ctx.lineTo(400, 100 - (metrics.ihg * 50));
    ctx.stroke();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) drawPaths(ctx);
    }
  }, [metrics]);

  return (
    <div className="mt-4 border border-green-900/30 bg-black p-2">
      <p className="text-[10px] text-green-700 mb-1 uppercase tracking-widest">Stochastic Projections (Monte Carlo)</p>
      <canvas ref={canvasRef} width={400} height={200} className="w-full h-32" />
    </div>
  );
};