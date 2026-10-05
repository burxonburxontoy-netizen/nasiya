import { useState, useMemo } from "react";
import { money, useInView } from "../lib/util.js";

const fmtShort = (n) => {
  const a = Math.abs(n);
  if (a >= 1e9) return (n / 1e9).toFixed(1).replace(".0", "") + " mlrd";
  if (a >= 1e6) return (n / 1e6).toFixed(1).replace(".0", "") + " mln";
  if (a >= 1e3) return Math.round(n / 1e3) + " ming";
  return String(Math.round(n));
};

function smoothPath(pts) {
  if (!pts.length) return "";
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const cx = (x0 + x1) / 2;
    d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  return d;
}

/** series: [{key,label,color}], data: [{label, [key]: number}] */
export function LineChart({ data, series, height = 260 }) {
  const [ref, seen] = useInView();
  const [hover, setHover] = useState(null);
  const W = 640, H = height, pl = 56, pr = 16, pt = 16, pb = 32;
  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.key] || 0))) * 1.12;
  const x = (i) => pl + (i * (W - pl - pr)) / Math.max(1, data.length - 1);
  const y = (v) => pt + (1 - v / max) * (H - pt - pb);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);

  return (
    <div ref={ref} className={`chart ${seen ? "is-in" : ""}`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="chart__svg" onMouseLeave={() => setHover(null)}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.key} id={`g-${s.key}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={s.color} stopOpacity=".28" />
              <stop offset="1" stopColor={s.color} stopOpacity="0" />
            </linearGradient>
          ))}
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pl} x2={W - pr} y1={y(t)} y2={y(t)} className="chart__grid" />
            <text x={pl - 10} y={y(t) + 4} className="chart__tick" textAnchor="end">{fmtShort(t)}</text>
          </g>
        ))}
        {data.map((d, i) => (
          <text key={i} x={x(i)} y={H - 8} className="chart__tick" textAnchor="middle">{d.label}</text>
        ))}
        {series.map((s) => {
          const pts = data.map((d, i) => [x(i), y(d[s.key] || 0)]);
          const line = smoothPath(pts);
          return (
            <g key={s.key}>
              <path d={`${line} L${x(data.length - 1)},${y(0)} L${x(0)},${y(0)} Z`} fill={`url(#g-${s.key})`} className="chart__area" />
              <path d={line} fill="none" stroke={s.color} strokeWidth="3" strokeLinecap="round" pathLength="1" className="chart__line" />
            </g>
          );
        })}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pt} y2={H - pb} className="chart__cursor" />
            {series.map((s) => (
              <circle key={s.key} cx={x(hover)} cy={y(data[hover][s.key] || 0)} r="5.5" fill="#fff" stroke={s.color} strokeWidth="3" />
            ))}
          </g>
        )}
        {data.map((d, i) => (
          <rect key={i} x={x(i) - (W - pl - pr) / data.length / 2} y={0} width={(W - pl - pr) / data.length} height={H}
            fill="transparent" onMouseEnter={() => setHover(i)} />
        ))}
      </svg>
      {hover != null && (
        <div className="chart__tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <b>{data[hover].label}</b>
          {series.map((s) => (
            <div key={s.key}><i style={{ background: s.color }} />{s.label}: <b>{money(data[hover][s.key] || 0)}</b></div>
          ))}
        </div>
      )}
      <div className="chart__legend">
        {series.map((s) => <span key={s.key}><i style={{ background: s.color }} />{s.label}</span>)}
      </div>
    </div>
  );
}

export function Bars({ items, color = "var(--ink)" }) {
  const [ref, seen] = useInView();
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <div ref={ref} className={`bars ${seen ? "is-in" : ""}`}>
      {items.map((it, i) => (
        <div className="bars__row" key={i}>
          <span className="bars__label">{it.label}</span>
          <div className="bars__track">
            <div className="bars__fill" style={{ width: `${(it.value / max) * 100}%`, background: it.color || color, transitionDelay: `${i * 70}ms` }} />
          </div>
          <span className="bars__val">{it.display ?? fmtShort(it.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function Donut({ parts, size = 168, label, sub }) {
  const [ref, seen] = useInView();
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  const r = 64, c = 2 * Math.PI * r;
  let acc = 0;
  const arcs = useMemo(() => parts.map((p) => {
    const len = (p.value / total) * c;
    const a = { ...p, len, off: acc };
    acc += len;
    return a;
  }), [parts]);
  return (
    <div ref={ref} className={`donut ${seen ? "is-in" : ""}`}>
      <svg width={size} height={size} viewBox="0 0 160 160">
        <circle cx="80" cy="80" r={r} fill="none" stroke="var(--line)" strokeWidth="18" />
        {arcs.map((a, i) => (
          <circle key={i} cx="80" cy="80" r={r} fill="none" stroke={a.color} strokeWidth="18"
            strokeDasharray={`${seen ? a.len : 0} ${c}`} strokeDashoffset={-a.off}
            transform="rotate(-90 80 80)" style={{ transition: `stroke-dasharray 1s ${i * 0.15}s cubic-bezier(.2,.8,.2,1)` }} />
        ))}
      </svg>
      <div className="donut__center"><b>{label}</b><span>{sub}</span></div>
    </div>
  );
}
