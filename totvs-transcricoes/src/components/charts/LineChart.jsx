export default function LineChart({ data = [], width = 600, height = 220 }) {
  if (!data.length) return null;

  const values = data.map((d) => Number(d.count) || 0);
  const max = Math.max(...values, 1);
  const pad = 30;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const stepX = innerW / Math.max(data.length - 1, 1);
  const points = values.map((v, i) => ({
    x: pad + i * stepX,
    y: pad + innerH - (v / max) * innerH,
  }));
  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Gráfico de linha">
      {[0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={pad} x2={width - pad} y1={pad + innerH * (1 - t)} y2={pad + innerH * (1 - t)} stroke="#e2e8f0" strokeDasharray="4 4" />
      ))}
      <path d={path} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#6366f1" stroke="#fff" strokeWidth="1.5" />
      ))}
      {points.map((p, i) => (
        <text key={`l-${i}`} x={p.x} y={height - 8} textAnchor="middle" fontSize="9" fill="#64748b">{data[i].mes || data[i].label || ''}</text>
      ))}
    </svg>
  );
}