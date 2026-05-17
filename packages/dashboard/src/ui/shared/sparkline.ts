export type SparklinePoint = {
  efficiencyScore: number;
};

/**
 * Build SVG polyline `points` for the efficiency sparkline (viewBox 200×48, pad 4).
 */
export function sparklinePolylinePoints(
  points: SparklinePoint[],
): string | null {
  if (!points || points.length === 0) return null;
  const w = 200;
  const h = 48;
  const pad = 4;
  const ys = points.map((p) => p.efficiencyScore);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys, 1);
  const coords = points.map((p, i) => {
    const x = pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2);
    const y =
      h -
      pad -
      ((p.efficiencyScore - minY) / Math.max(1e-6, maxY - minY)) *
        (h - pad * 2);
    return `${x},${y}`;
  });
  return coords.join(" ");
}
