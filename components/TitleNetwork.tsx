const layers = [3, 4, 2];
const colors = ["#5eead4", "#e879f9", "#fde047"];

/** A small pixel-styled network that pulses on the title screen (SVG, crisp edges). */
export function TitleNetwork() {
  const xs = [24, 100, 176];
  const pos = (l: number, i: number) => ({ x: xs[l], y: 60 - ((layers[l] - 1) * 24) / 2 + i * 24 + 0 });
  const edges: [number, number, number, number, number][] = [];
  for (let l = 0; l < layers.length - 1; l++)
    for (let i = 0; i < layers[l]; i++)
      for (let j = 0; j < layers[l + 1]; j++) {
        const a = pos(l, i);
        const b = pos(l + 1, j);
        edges.push([a.x, a.y, b.x, b.y, (i * 3 + j * 5 + l) % 7]);
      }
  return (
    <svg viewBox="0 0 200 120" role="img" aria-label="A small neural network" className="w-full max-w-xs" shapeRendering="crispEdges">
      {edges.map(([x1, y1, x2, y2, d], k) => (
        <line key={k} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3c6f82" strokeWidth={1} style={{ animation: `nc-pulse 2.8s ${d * 0.35}s infinite` }} />
      ))}
      {layers.map((n, l) =>
        Array.from({ length: n }, (_, i) => {
          const { x, y } = pos(l, i);
          return <rect key={`${l}-${i}`} x={x - 6} y={y - 6} width={12} height={12} fill={colors[l]} stroke="#0e0f1a" strokeWidth={2} />;
        }),
      )}
    </svg>
  );
}
