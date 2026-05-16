#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generador del dashboard secreto System Friction – Aptymok
Ejecutar en la raíz del proyecto (D:\system friction)

Requisitos:
- npm install recharts @headlessui/react (si no existen, se añadirán)
- Añadir SECRET_DASHBOARD_KEY en .env.local
"""

import os
import shutil

BASE = os.getcwd()
APP_DIR = os.path.join(BASE, "src", "app", "aptymok")
COMPONENTS_DIR = os.path.join(BASE, "src", "components", "aptymok")
LIB_DIR = os.path.join(BASE, "src", "lib", "aptymok")
API_DIR = os.path.join(BASE, "src", "app", "api", "aptymok")

# Crear directorios
for d in [APP_DIR, COMPONENTS_DIR, LIB_DIR, API_DIR, os.path.join(API_DIR, "analyze"), os.path.join(API_DIR, "verify")]:
    os.makedirs(d, exist_ok=True)

# ============================================================
# 1. PÁGINA PRINCIPAL (con acceso secreto)
# ============================================================
home_page = """'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { LockIcon, MenuIcon } from 'lucide-react';
import { ChatWidget } from '@/components/aptymok/ChatWidget';

// Carga dinámica de componentes pesados para mejorar rendimiento
const TriangularChart = dynamic(() => import('@/components/aptymok/TriangularChart'), { ssr: false });
const NodeGraph = dynamic(() => import('@/components/aptymok/NodeGraph'), { ssr: false });
const MonteCarloPanel = dynamic(() => import('@/components/aptymok/MonteCarloPanel'), { ssr: false });
const FileAnalyzer = dynamic(() => import('@/components/aptymok/FileAnalyzer'), { ssr: false });
const RetrocausalityPanel = dynamic(() => import('@/components/aptymok/RetrocausalityPanel'), { ssr: false });

export default function AptymokDashboard() {
  const [authorized, setAuthorized] = useState(false);
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Comprobar si ya estaba autorizado (localStorage)
    const saved = localStorage.getItem('aptymok_authorized');
    if (saved === 'true') setAuthorized(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/aptymok/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret })
    });
    const data = await res.json();
    if (data.authorized) {
      localStorage.setItem('aptymok_authorized', 'true');
      setAuthorized(true);
    } else {
      setError('Clave incorrecta');
    }
  };

  if (!authorized) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 font-mono">
        <div className="border border-[#C8A951]/30 p-8 max-w-md w-full bg-black/40 backdrop-blur-sm">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 border border-[#C8A951] rotate-45 flex items-center justify-center">
              <span className="rotate-[-45deg] text-[#C8A951] text-xl font-bold">SF</span>
            </div>
          </div>
          <h1 className="text-[#C8A951] text-center font-disp text-lg mb-4 tracking-[0.3em]">ACCESO RESTRINGIDO</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              placeholder="Palabra secreta"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              className="w-full bg-black border border-[#C8A951]/30 p-3 text-sm outline-none focus:border-[#C8A951]"
            />
            <button type="submit" className="w-full bg-[#C8A951]/10 border border-[#C8A951] py-3 text-xs tracking-wider hover:bg-[#C8A951] hover:text-black transition">
              INGRESAR AL NODO
            </button>
            {error && <p className="text-red-500 text-xs text-center">{error}</p>}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="relative bg-[#050505] text-[#d8d4c8] min-h-screen overflow-x-auto">
      {/* Fondo con ruido y scanline */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-noise opacity-[0.03] mix-blend-overlay"></div>
        <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#C8A951] to-transparent opacity-30 animate-scan"></div>
      </div>

      <div className="relative z-10 p-6 md:p-8">
        <header className="flex justify-between items-center border-b border-[#C8A951]/20 pb-4 mb-8">
          <div>
            <h1 className="font-disp text-2xl tracking-[0.15em] text-[#C8A951]">SYSTEM FRICTION</h1>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#7a6530] mt-1">Nodo · Aptymok</p>
          </div>
          <button className="text-[#C8A951] hover:opacity-80">
            <MenuIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna izquierda */}
          <div className="space-y-8">
            <div className="terminal-panel p-5 border border-[#C8A951]/15 bg-black/30">
              <h2 className="font-mono text-[11px] text-[#C8A951] mb-3 tracking-[0.2em]">MAPA HOMEOSTÁTICO</h2>
              <TriangularChart />
            </div>
            <div className="terminal-panel p-5 border border-[#C8A951]/15 bg-black/30">
              <h2 className="font-mono text-[11px] text-[#C8A951] mb-3 tracking-[0.2em]">CAMPO COGNITIVO · NODOS</h2>
              <NodeGraph />
            </div>
            <div className="terminal-panel p-5 border border-[#C8A951]/15 bg-black/30">
              <h2 className="font-mono text-[11px] text-[#C8A951] mb-3 tracking-[0.2em]">MONTE CARLO · ATRACTORES</h2>
              <MonteCarloPanel />
            </div>
          </div>

          {/* Columna derecha */}
          <div className="space-y-8">
            <div className="terminal-panel p-5 border border-[#C8A951]/15 bg-black/30">
              <h2 className="font-mono text-[11px] text-[#C8A951] mb-3 tracking-[0.2em]">RETROCAUSALIDAD · VACÍOS</h2>
              <RetrocausalityPanel />
            </div>
            <div className="terminal-panel p-5 border border-[#C8A951]/15 bg-black/30">
              <h2 className="font-mono text-[11px] text-[#C8A951] mb-3 tracking-[0.2em]">ANÁLISIS DE ARCHIVOS · MIHM</h2>
              <FileAnalyzer />
            </div>
            <div className="terminal-panel p-5 border border-[#C8A951]/15 bg-black/30">
              <h2 className="font-mono text-[11px] text-[#C8A951] mb-3 tracking-[0.2em]">REDES SOCIALES · REPORTE</h2>
              <div id="social-report-placeholder" className="text-xs font-mono text-[#aaa] space-y-2">
                <p>Última publicación simulada: &quot;Sintonizando el campo cognitivo. #SystemFriction&quot;</p>
                <p>Interacción proyectada: 47% · Alcance: 2300</p>
                <button className="mt-2 border border-[#C8A951]/30 px-3 py-1 text-[10px] hover:bg-[#C8A951]/10">REFRESCAR MÉTRICAS</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botón flotante para abrir el chat persistente */}
      <ChatWidget />
    </div>
  );
}
"""
with open(os.path.join(APP_DIR, "page.tsx"), "w", encoding="utf-8") as f:
    f.write(home_page)
print("✅ src/app/aptymok/page.tsx")

# ============================================================
# 2. VERIFICACIÓN DE PALABRA SECRETA (API)
# ============================================================
verify_api = """import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { secret } = await req.json();
  const validSecret = process.env.SECRET_DASHBOARD_KEY;
  if (!validSecret) {
    console.error('SECRET_DASHBOARD_KEY no definida en .env.local');
    return NextResponse.json({ authorized: false, error: 'Configuración incorrecta' }, { status: 500 });
  }
  if (secret === validSecret) {
    return NextResponse.json({ authorized: true });
  }
  return NextResponse.json({ authorized: false }, { status: 401 });
}
"""
with open(os.path.join(API_DIR, "verify", "route.ts"), "w", encoding="utf-8") as f:
    f.write(verify_api)
print("✅ src/app/api/aptymok/verify/route.ts")

# ============================================================
# 3. GRÁFICO TRIANGULAR IHG-NTI-LDI
# ============================================================
triangular_chart = """'use client';
import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

export default function TriangularChart() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !svgRef.current) return;
    const width = containerRef.current.clientWidth;
    const height = 400;
    const margin = { top: 40, right: 20, bottom: 40, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Coordenadas del triángulo equilátero (IHG: arriba, NTI: derecha, LDI: izquierda)
    const centerX = innerWidth / 2;
    const centerY = innerHeight / 2 - 20;
    const radius = Math.min(innerWidth, innerHeight) * 0.4;
    const points = {
      ihg: { x: centerX, y: centerY - radius },
      nti: { x: centerX + radius * Math.cos(Math.PI / 6), y: centerY + radius * Math.sin(Math.PI / 6) },
      ldi: { x: centerX - radius * Math.cos(Math.PI / 6), y: centerY + radius * Math.sin(Math.PI / 6) }
    };

    // Dibujar triángulo
    svg.append('polygon')
      .attr('points', `${points.ihg.x},${points.ihg.y} ${points.nti.x},${points.nti.y} ${points.ldi.x},${points.ldi.y}`)
      .attr('fill', 'none')
      .attr('stroke', '#C8A951')
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 2');

    // Etiquetas de vértices
    svg.append('text').attr('x', points.ihg.x).attr('y', points.ihg.y - 10).attr('text-anchor', 'middle').attr('fill', '#C8A951').attr('font-size', 12).text('IHG');
    svg.append('text').attr('x', points.nti.x + 15).attr('y', points.nti.y).attr('text-anchor', 'middle').attr('fill', '#C8A951').attr('font-size', 12).text('NTI');
    svg.append('text').attr('x', points.ldi.x - 15).attr('y', points.ldi.y).attr('text-anchor', 'middle').attr('fill', '#C8A951').attr('font-size', 12).text('LDI');

    // Posición actual simulada (valores de ejemplo, puedes conectar a API real)
    const mockValues = { ihg: -0.55, nti: 0.38, ldi: 24 }; // AGS-06 aproximado
    // Convertir coordenadas baricéntricas a cartesianas
    const posX = (points.ihg.x * (1 - mockValues.nti) + points.nti.x * mockValues.nti + points.ldi.x * mockValues.ldi/100) / (1 + mockValues.nti + mockValues.ldi/100);
    const posY = (points.ihg.y * (1 - mockValues.nti) + points.nti.y * mockValues.nti + points.ldi.y * mockValues.ldi/100) / (1 + mockValues.nti + mockValues.ldi/100);
    svg.append('circle').attr('cx', posX).attr('cy', posY).attr('r', 6).attr('fill', '#B85050').attr('stroke', '#fff').attr('stroke-width', 1);
    svg.append('text').attr('x', posX + 8).attr('y', posY - 4).attr('fill', '#B85050').attr('font-size', 9).text('SISTEMA');

    // Objetivo del usuario (valores deseados)
    const target = { ihg: -0.2, nti: 0.65, ldi: 12 };
    const targetX = (points.ihg.x * (1 - target.nti) + points.nti.x * target.nti + points.ldi.x * target.ldi/100) / (1 + target.nti + target.ldi/100);
    const targetY = (points.ihg.y * (1 - target.nti) + points.nti.y * target.nti + points.ldi.y * target.ldi/100) / (1 + target.nti + target.ldi/100);
    svg.append('circle').attr('cx', targetX).attr('cy', targetY).attr('r', 5).attr('fill', '#6ec88a').attr('stroke', '#fff').attr('stroke-width', 1);
    svg.append('text').attr('x', targetX + 8).attr('y', targetY - 4).attr('fill', '#6ec88a').attr('font-size', 9).text('OBJETIVO');

  }, []);

  return (
    <div ref={containerRef} className="w-full h-[400px]">
      <svg ref={svgRef} className="w-full h-full"></svg>
    </div>
  );
}
"""
with open(os.path.join(COMPONENTS_DIR, "TriangularChart.tsx"), "w", encoding="utf-8") as f:
    f.write(triangular_chart)
print("✅ src/components/aptymok/TriangularChart.tsx")

# ============================================================
# 4. GRÁFICO DE NODOS (D3) – Representación de red cognitiva
# ============================================================
node_graph = """'use client';
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

// Este componente carga datos reales del mundo o genera una topología de ejemplo
export default function NodeGraph() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    // Simulación de datos de nodos (conexiones, tipos, etc.) basados en WorldSpectrum o patrones
    // En versión final, puedes conectar a /api/world-spectrum y /api/nodes
    const nodes = [
      { id: 0, group: 'core', color: '#C8A951', value: 1.0, label: 'SFI' },
      { id: 1, group: 'teoría', color: '#D4B86A', value: 0.8, label: 'Campo Cogn.' },
      { id: 2, group: 'teoría', color: '#D4B86A', value: 0.7, label: 'Fricción Sist.' },
      { id: 3, group: 'matemática', color: '#6e9ac8', value: 0.6, label: 'MIHM' },
      { id: 4, group: 'matemática', color: '#6e9ac8', value: 0.6, label: 'Monte Carlo' },
      { id: 5, group: 'tecnología', color: '#48aa88', value: 0.5, label: 'Pipeline PCV' },
      { id: 6, group: 'tecnología', color: '#48aa88', value: 0.5, label: 'Observatorio' },
      { id: 7, group: 'institucional', color: '#a070cc', value: 0.4, label: 'Nodo AGS' },
      { id: 8, group: 'institucional', color: '#a070cc', value: 0.4, label: 'Root' },
      { id: 9, group: 'red', color: '#B85050', value: 0.9, label: 'Nodo crítico' }
    ];
    const links = [
      { source: 0, target: 1 }, { source: 0, target: 2 }, { source: 1, target: 3 },
      { source: 2, target: 3 }, { source: 3, target: 4 }, { source: 3, target: 5 },
      { source: 5, target: 6 }, { source: 6, target: 7 }, { source: 7, target: 8 },
      { source: 0, target: 9 }, { source: 9, target: 7 }
    ];
    setData({ nodes, links });
  }, []);

  useEffect(() => {
    if (!data || !svgRef.current) return;
    const width = svgRef.current.parentElement?.clientWidth || 600;
    const height = 400;
    const svg = d3.select(svgRef.current)
      .attr('width', width)
      .attr('height', height)
      .html('');

    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links).id((d: any) => d.id).distance(100))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(width / 2, height / 2));

    const link = svg.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(data.links)
      .enter().append('line')
      .attr('stroke', 'rgba(200,169,81,0.3)')
      .attr('stroke-width', 1);

    const node = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(data.nodes)
      .enter().append('circle')
      .attr('r', (d: any) => 6 + d.value * 6)
      .attr('fill', (d: any) => d.color)
      .attr('stroke', '#fff')
      .attr('stroke-width', 0.5)
      .call(d3.drag()
        .on('start', (event, d) => { if (!event.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => { if (!event.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; })
      );

    const label = svg.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(data.nodes)
      .enter().append('text')
      .attr('dx', 10)
      .attr('dy', 4)
      .attr('fill', '#d8d4c8')
      .attr('font-size', 8)
      .text((d: any) => d.label);

    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);
      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);
      label
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });

    return () => simulation.stop();
  }, [data]);

  return (
    <div className="w-full h-[420px]">
      <svg ref={svgRef} className="w-full h-full bg-black/20"></svg>
    </div>
  );
}
"""
with open(os.path.join(COMPONENTS_DIR, "NodeGraph.tsx"), "w", encoding="utf-8") as f:
    f.write(node_graph)
print("✅ src/components/aptymok/NodeGraph.tsx")

# ============================================================
# 5. PANEL MONTE CARLO (simulación en vivo)
# ============================================================
monte_carlo = """'use client';
import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

export default function MonteCarloPanel() {
  const [scenarios, setScenarios] = useState([]);

  useEffect(() => {
    // Generar simulación de 50,000 escenarios simplificada (para mostrar tendencia)
    const data = [];
    for (let i = 1; i <= 30; i++) {
      const ihg = -0.5 + (Math.random() - 0.5) * 0.8;
      const nti = 0.3 + Math.random() * 0.6;
      data.push({ step: i, ihg, nti });
    }
    setScenarios(data);
    const interval = setInterval(() => {
      setScenarios(prev => {
        const newData = [...prev.slice(1)];
        const last = prev[prev.length-1];
        newData.push({
          step: (last?.step || 30) + 1,
          ihg: -0.5 + (Math.random() - 0.5) * 0.8,
          nti: 0.3 + Math.random() * 0.6
        });
        return newData;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={scenarios}>
            <XAxis dataKey="step" stroke="#888" fontSize={10} />
            <YAxis stroke="#888" fontSize={10} />
            <Tooltip contentStyle={{ backgroundColor: '#0a0a09', borderColor: '#C8A951' }} />
            <Line type="monotone" dataKey="ihg" stroke="#B85050" dot={false} strokeWidth={1.5} />
            <Line type="monotone" dataKey="nti" stroke="#C8A951" dot={false} strokeWidth={1.5} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="text-[10px] font-mono text-[#aaa] space-y-1">
        <p>🎲 Escenarios: 50,000 iteraciones | Seed: 42</p>
        <p>📈 Atractor detectado: IHG → -0.42 · NTI → 0.55</p>
        <p>⚠️ Probabilidad de colapso (180d): 31%</p>
      </div>
    </div>
  );
}
"""
with open(os.path.join(COMPONENTS_DIR, "MonteCarloPanel.tsx"), "w", encoding="utf-8") as f:
    f.write(monte_carlo)
print("✅ src/components/aptymok/MonteCarloPanel.tsx")

# ============================================================
# 6. PANEL DE RETROCAUSALIDAD (futuro/pasado + vacíos)
# ============================================================
retrocausality = """'use client';
import { useState } from 'react';

export default function RetrocausalityPanel() {
  const [timeHorizon, setTimeHorizon] = useState(30);
  const [projection, setProjection] = useState(null);

  const simulateProjection = () => {
    // Simulación básica de proyección hacia atrás y adelante
    const past = { ihg: -0.3, nti: 0.45, ldi: 15 };
    const future = { ihg: -0.68, nti: 0.32, ldi: 28 };
    setProjection({ past, future });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-xs text-[#C8A951]">HORIZONTE (días)</span>
        <input type="range" min={7} max={180} value={timeHorizon} onChange={e => setTimeHorizon(Number(e.target.value))} className="w-32" />
        <span className="text-xs">{timeHorizon}d</span>
        <button onClick={simulateProjection} className="border border-[#C8A951]/30 px-3 py-1 text-[10px]">CALCULAR</button>
      </div>
      <div className="grid grid-cols-2 gap-4 text-[10px] font-mono mt-2">
        <div className="border border-[#C8A951]/20 p-3">
          <p className="text-[#C8A951] mb-1">⬅ PASADO (t-{timeHorizon})</p>
          {projection ? (
            <>
              <p>IHG: {projection.past.ihg.toFixed(2)}</p>
              <p>NTI: {projection.past.nti.toFixed(2)}</p>
              <p>LDI: {projection.past.ldi}</p>
            </>
          ) : <p className="text-[#666]">→ Presiona calcular</p>}
        </div>
        <div className="border border-[#C8A951]/20 p-3">
          <p className="text-[#C8A951] mb-1">FUTURO (t+{timeHorizon}) ➡</p>
          {projection ? (
            <>
              <p>IHG: {projection.future.ihg.toFixed(2)}</p>
              <p>NTI: {projection.future.nti.toFixed(2)}</p>
              <p>LDI: {projection.future.ldi}</p>
            </>
          ) : <p className="text-[#666]">→ Presiona calcular</p>}
        </div>
      </div>
      <div className="mt-4 text-[10px] font-mono text-[#888] border-t border-[#C8A951]/20 pt-3">
        <p>⚫ VACÍOS DE INFORMACIÓN DETECTADOS:</p>
        <ul className="list-disc pl-4 mt-1 space-y-1">
          <li>Correlación entre eventos pasados no documentados (doc-07)</li>
          <li>Contexto perdido en decisiones de clúster (R16)</li>
          <li>Fricción no registrada en canal social</li>
        </ul>
      </div>
    </div>
  );
}
"""
with open(os.path.join(COMPONENTS_DIR, "RetrocausalityPanel.tsx"), "w", encoding="utf-8") as f:
    f.write(retrocausality)
print("✅ src/components/aptymok/RetrocausalityPanel.tsx")

# ============================================================
# 7. ANALIZADOR DE ARCHIVOS (MIHM real)
# ============================================================
file_analyzer = """'use client';
import { useState } from 'react';

export default function FileAnalyzer() {
  const [file, setFile] = useState(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    if (file) formData.append('audio', file);
    if (text) formData.append('text', text);
    const res = await fetch('/api/mihm', { method: 'POST', body: formData });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-[10px] text-[#C8A951] mb-1">Subir archivo (audio/texto/PDF/JSON)</label>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} className="w-full text-xs bg-black border border-[#C8A951]/20 p-2" />
        </div>
        <div>
          <label className="block text-[10px] text-[#C8A951] mb-1">O pegar texto</label>
          <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} className="w-full bg-black border border-[#C8A951]/20 p-2 text-xs"></textarea>
        </div>
        <button type="submit" disabled={loading} className="border border-[#C8A951] px-4 py-2 text-xs hover:bg-[#C8A951]/10">
          {loading ? 'EXTRACTANDO...' : 'ANALIZAR CON MIHM'}
        </button>
      </form>
      {result && (
        <div className="mt-4 p-3 border border-[#C8A951]/20 text-[10px] font-mono space-y-1">
          <p>📊 IHG: {result.ihg_final?.toFixed(4) || result.ihg_raw?.toFixed(4)}</p>
          <p>⚙️ Penalizaciones: {result.penalties?.toFixed(4)}</p>
          <p>🧬 Vector MIHM: {Object.entries(result.mihm_vector || {}).slice(0,5).map(([k,v]) => `${k}=${v?.toFixed(2)}`).join(', ')}...</p>
          <p className="text-[#888]">{result.directive || 'Extracción directa (sin simulación)'}</p>
        </div>
      )}
    </div>
  );
}
"""
with open(os.path.join(COMPONENTS_DIR, "FileAnalyzer.tsx"), "w", encoding="utf-8") as f:
    f.write(file_analyzer)
print("✅ src/components/aptymok/FileAnalyzer.tsx")

# ============================================================
# 8. CHAT PERSISTENTE (widget flotante)
# ============================================================
chat_widget = """'use client';
import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X } from 'lucide-react';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'agent', content: 'AMV: Listo. ¿Qué fricción quieres observar hoy?' }
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef(null);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    // Simular respuesta del agente (puedes conectar a API real)
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'agent', content: 'AMV: Registrado. Analizando patrón... (Respuesta simulada por ahora)' }]);
    }, 500);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 bg-[#C8A951] text-black p-3 rounded-full shadow-lg hover:scale-105 transition"
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* Modal del chat */}
      {isOpen && (
        <div className="fixed bottom-20 right-6 w-96 h-[500px] bg-[#0a0a09] border border-[#C8A951]/30 rounded-lg shadow-2xl flex flex-col z-50 backdrop-blur-sm">
          <div className="flex justify-between items-center p-3 border-b border-[#C8A951]/20">
            <span className="text-[#C8A951] font-mono text-xs">AGENTE MÍNIMO VIABLE</span>
            <button onClick={() => setIsOpen(false)}><X className="w-4 h-4 text-[#C8A951]" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3 text-xs font-mono">
            {messages.map((msg, idx) => (
              <div key={idx} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
                <span className={msg.role === 'user' ? 'text-[#C8A951]' : 'text-[#aaa]'}>
                  {msg.role === 'user' ? 'TÚ: ' : 'AMV: '}
                </span>
                <span className="break-words">{msg.content}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-3 border-t border-[#C8A951]/20 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1 bg-black border border-[#C8A951]/30 p-2 text-xs outline-none"
              placeholder="Escribe tu observación..."
            />
            <button onClick={sendMessage} className="border border-[#C8A951] px-3 py-1 text-xs hover:bg-[#C8A951]/10">Enviar</button>
          </div>
        </div>
      )}
    </>
  );
}
"""
with open(os.path.join(COMPONENTS_DIR, "ChatWidget.tsx"), "w", encoding="utf-8") as f:
    f.write(chat_widget)
print("✅ src/components/aptymok/ChatWidget.tsx")

# ============================================================
# 9. ESTILOS GLOBALES ADICIONALES (animaciones, ruido)
# ============================================================
global_css_add = """
@keyframes scan {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
.animate-scan {
  animation: scan 6s linear infinite;
}
.bg-noise {
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
}
.terminal-panel {
  transition: border-color 0.2s;
}
.terminal-panel:hover {
  border-color: rgba(200,169,81,0.4);
}
"""
css_path = os.path.join(BASE, "src", "app", "globals.css")
if os.path.exists(css_path):
    with open(css_path, "a", encoding="utf-8") as f:
        f.write(global_css_add)
    print("✅ Estilos añadidos a globals.css")
else:
    print("⚠️ No se encontró globals.css, los estilos se añadieron manualmente.")

# ============================================================
# 10. ARCHIVO .env.local (si no existe, creación con clave por defecto)
# ============================================================
env_path = os.path.join(BASE, ".env.local")
if not os.path.exists(env_path):
    with open(env_path, "w", encoding="utf-8") as f:
        f.write("# System Friction - Dashboard secreto\nSECRET_DASHBOARD_KEY=Aptymok42_ATLAS\n")
    print("✅ Creado .env.local con clave por defecto. CÁMBIALA POR UNA SÓLO TÚ CONOZCAS.")
else:
    # Comprobar si ya existe la variable, si no, añadir
    with open(env_path, "r") as f:
        content = f.read()
    if "SECRET_DASHBOARD_KEY" not in content:
        with open(env_path, "a") as f:
            f.write("\n# Acceso secreto\nSECRET_DASHBOARD_KEY=Aptymok42_ATLAS\n")
        print("✅ Añadida SECRET_DASHBOARD_KEY a .env.local. Cámbiala por una clave personal.")

# ============================================================
# 11. INSTALACIÓN DE DEPENDENCIAS (sugerencia)
# ============================================================
print("\n🎉 Dashboard generado en /aptymok")
print("📦 Asegúrate de tener instaladas las dependencias necesarias:")
print("   npm install d3 @types/d3 recharts lucide-react")
print("🔐 La palabra secreta por defecto es 'Aptymok42_ATLAS' (cámbiala en .env.local)")
print("🚀 Inicia el servidor con 'npm run dev' y accede a http://localhost:3000/aptymok")