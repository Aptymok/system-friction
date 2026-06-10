import { clamp01 } from '@/lib/sfi/math';
import type { FoundationNode } from './foundation-nodes';

export type RepositoryView = {
  camX: number;
  camY: number;
  scale: number;
  width: number;
  height: number;
};

export function visualRadius(node: FoundationNode): number {
  return node.radius + node.weight * 10;
}

export function nodeAlpha(node: FoundationNode): number {
  return clamp01((0.15 + node.density * 0.75) * (1 - node.degradation * 0.55));
}

export function strokeAlpha(node: FoundationNode): number {
  return clamp01((0.20 + node.weight * 0.65) * (1 - node.degradation * 0.45));
}

export function projectNode(node: FoundationNode, view: RepositoryView) {
  const parallax = 1 + node.z * 0.08;
  return {
    x: (node.x - view.camX) * view.scale * parallax + view.width / 2,
    y: (node.y - view.camY) * view.scale * parallax + view.height / 2,
    radius: visualRadius(node) * view.scale,
  };
}

export function visibleAtScale(node: FoundationNode, scale: number, selectedId: string | null): boolean {
  if (node.id === selectedId) return true;
  if (node.weight >= 0.66) return true;
  if (scale >= 0.72 && node.layer <= 3) return true;
  return scale >= 1.05;
}
