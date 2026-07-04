import { useEffect, useRef, useMemo, useState } from "react";
import type { CustomVisualizationProps } from "@metabase/custom-viz";
import type { Settings } from "./types";
import { hexToRgb } from "./utils";

const TAU = 2 * Math.PI;
const SLOTS = 24;

type ColDef = { name: string; display_name?: string; base_type?: string; effective_type?: string };

function arcPath(
  cx: number, cy: number,
  rOuter: number, rInner: number,
  a0: number, a1: number,
): string {
  const p = (r: number, a: number) =>
    `${(cx + r * Math.cos(a)).toFixed(2)},${(cy + r * Math.sin(a)).toFixed(2)}`;
  const large = Math.abs(a1 - a0) > Math.PI ? 1 : 0;
  const outerSweep = a1 > a0 ? 1 : 0;
  const innerSweep = outerSweep ? 0 : 1;
  return (
    `M${p(rOuter, a0)}` +
    `A${rOuter.toFixed(2)},${rOuter.toFixed(2)},0,${large},${outerSweep},${p(rOuter, a1)}` +
    `L${p(rInner, a1)}` +
    `A${rInner.toFixed(2)},${rInner.toFixed(2)},0,${large},${innerSweep},${p(rInner, a0)}` +
    `Z`
  );
}

export function RadialClock({
  series, settings, width, height, colorScheme,
}: CustomVisualizationProps<Settings>) {
  const cw = (width ?? 0) > 0 ? Math.floor(width ?? 0) : 0;
  const ch = (height ?? 0) > 0 ? Math.floor(height ?? 0) : 0;

  const cols = (series?.[0]?.data?.cols ?? []) as ColDef[];
  const rows = (series?.[0]?.data?.rows ?? []) as unknown[][];

  const hourColName      = settings.hourColumn  ?? "";
  const valueColName     = settings.valueColumn ?? "";
  const startHour        = Math.max(0, Math.min(23, Math.floor(settings.startHour ?? 0)));
  const clockwiseSetting = settings.clockwise !== false;
  const fillColor        = settings.fillColor   ?? "#5F016F";
  const centerLabel      = settings.centerLabel ?? "";

  const isDark    = colorScheme === "dark";
  const textColor = isDark ? "#aaa" : "#666";
  const gridColor = isDark ? "#333" : "#ddd";

  const hIdx = cols.findIndex(c => c.name === hourColName);
  const vIdx = cols.findIndex(c => c.name === valueColName);

  const hourValues = useMemo(() => {
    const vals = Array<number>(SLOTS).fill(0);
    if (hIdx < 0 || vIdx < 0) return vals;
    for (const row of rows) {
      if (row[hIdx] === null || row[vIdx] === null) continue;
      const h = Number(row[hIdx]);
      const v = Number(row[vIdx]);
      if (!isFinite(h) || !isFinite(v) || h < 0 || v < 0) continue;
      vals[Math.floor(h) % SLOTS] += v;
    }
    return vals;
  }, [rows, hIdx, vIdx]);

  const maxVal = useMemo(() => Math.max(...hourValues, 1), [hourValues]);

  // Fill the card — R is the full half-dimension, rMax leaves room for labels
  const R    = Math.min(cw, ch) / 2;
  const cx   = cw / 2;
  const cy   = ch / 2;
  const rIn  = R * 0.28;
  const rMax = R * 0.82;
  const labelR = rMax + Math.max(10, R * 0.1);

  const prefersReduced = useMemo(
    () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );

  const [progress, setProgress] = useState(prefersReduced ? 1 : 0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (prefersReduced) { setProgress(1); return; }
    setProgress(0);
    const start = performance.now();
    const dur = 550;
    function frame(now: number) {
      const t = Math.min(1, (now - start) / dur);
      setProgress(1 - (1 - t) ** 3);
      if (t < 1) rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(rafRef.current); };
  }, [prefersReduced, maxVal]);

  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  const dir  = clockwiseSetting ? 1 : -1;
  const step = TAU / SLOTS;
  const GAP  = 0.018;

  // Each hour is placed at an angular position offset by startHour
  // Hour `startHour` appears at the top (−π/2)
  const segments = useMemo(() =>
    Array.from({ length: SLOTS }, (_, hour) => {
      const pos   = (hour - startHour + SLOTS) % SLOTS; // angular position (0 = top)
      const ratio = hourValues[hour] / maxVal;
      const a0    = -Math.PI / 2 + dir * pos * step + dir * GAP;
      const a1    = -Math.PI / 2 + dir * (pos + 1) * step - dir * GAP;
      const midA  = -Math.PI / 2 + dir * (pos + 0.5) * step;
      return { hour, ratio, a0, a1, midA, value: hourValues[hour] };
    }),
  [hourValues, maxVal, startHour, dir, step]);

  const [fr, fg, fb] = hexToRgb(fillColor);
  const fontSize = Math.max(9, Math.min(11, R * 0.12));

  const tooltip = (() => {
    if (hoveredSlot === null) return null;
    const seg = segments[hoveredSlot];
    if (!seg) return null;
    const x = cx + (labelR + 4) * Math.cos(seg.midA);
    const y = cy + (labelR + 4) * Math.sin(seg.midA);
    return { x, y, label: `${hoveredSlot}h`, value: seg.value };
  })();

  if (!cw || !ch) return null;

  return (
    <div style={{ position: "relative", width: cw, height: ch }}>
      <svg width={cw} height={ch} style={{ display: "block", overflow: "visible" }}>

        {/* Inner guide ring */}
        <circle cx={cx} cy={cy} r={rIn} fill="none" stroke={gridColor} strokeWidth={1} />

        {/* Arc segments */}
        {segments.map(({ hour, ratio, a0, a1 }) => {
          const animatedROuter = rIn + ratio * progress * (rMax - rIn);
          if (animatedROuter <= rIn + 1) return null;

          const fillOpacity = 0.15 + 0.85 * ratio;
          const dimmed = hoveredSlot !== null && hoveredSlot !== hour;
          const d = arcPath(cx, cy, animatedROuter, rIn, a0, a1);

          return (
            <path
              key={hour}
              d={d}
              fill={`rgba(${fr},${fg},${fb},${fillOpacity})`}
              style={{
                opacity: dimmed ? 0.2 : 1,
                transition: "opacity 0.15s",
                cursor: "pointer",
              }}
              onMouseEnter={() => setHoveredSlot(hour)}
              onMouseLeave={() => setHoveredSlot(null)}
            />
          );
        })}

        {/* Hour labels every 3h */}
        {segments.map(({ hour, midA }) => {
          if (hour % 3 !== 0) return null;
          const lx = cx + labelR * Math.cos(midA);
          const ly = cy + labelR * Math.sin(midA);
          return (
            <text
              key={`lbl-${hour}`}
              x={lx} y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              fill={textColor}
              style={{ userSelect: "none", pointerEvents: "none" }}
            >
              {hour}h
            </text>
          );
        })}

        {/* Center label — word-wrapped to fit inner circle */}
        {centerLabel && (() => {
          const fs = Math.max(9, Math.min(13, rIn * 0.55));
          const maxW = rIn * 1.65;
          const charsPerLine = Math.max(3, Math.floor(maxW / (fs * 0.58)));
          const maxLines = Math.max(1, Math.floor((rIn * 1.65) / (fs * 1.35)));
          const words = centerLabel.split(/\s+/).filter(Boolean);
          const lines: string[] = [];
          let cur = "";
          for (const word of words) {
            const test = cur ? `${cur} ${word}` : word;
            if (test.length <= charsPerLine) {
              cur = test;
            } else {
              if (cur) lines.push(cur);
              cur = word.length > charsPerLine ? word.slice(0, charsPerLine - 1) + "…" : word;
            }
          }
          if (cur) lines.push(cur);
          const capped = lines.slice(0, maxLines);
          if (lines.length > maxLines && capped[maxLines - 1]) {
            const last = capped[maxLines - 1];
            capped[maxLines - 1] = last.length > 2 ? last.slice(0, -2) + "…" : last;
          }
          const lh = fs * 1.35;
          const totalH = capped.length * lh;
          return capped.map((line, i) => (
            <text
              key={`cl-${i}`}
              x={cx}
              y={cy - totalH / 2 + i * lh + lh / 2}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fs}
              fontWeight={600}
              fill={textColor}
              style={{ userSelect: "none" }}
            >
              {line}
            </text>
          ));
        })()}
      </svg>

      {/* Tooltip */}
      {tooltip !== null && (
        <div
          style={{
            position: "absolute",
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, -50%)",
            background: isDark ? "#1a1a2e" : "#fff",
            color: isDark ? "#eee" : "#333",
            borderRadius: 6,
            padding: "5px 9px",
            fontSize: 12,
            pointerEvents: "none",
            whiteSpace: "nowrap",
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            borderLeft: `4px solid ${fillColor}`,
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 700, fontSize: 13 }}>{tooltip.label}</div>
          <div style={{ opacity: 0.7 }}>
            {Number.isInteger(tooltip.value)
              ? tooltip.value
              : tooltip.value.toFixed(2)}
          </div>
        </div>
      )}
    </div>
  );
}
