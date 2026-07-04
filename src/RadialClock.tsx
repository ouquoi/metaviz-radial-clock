import { useEffect, useRef, useMemo, useState } from "react";
import type { CustomVisualizationProps } from "@metabase/custom-viz";
import type { Settings } from "./types";
import { hexToRgb } from "./utils";

const TAU = 2 * Math.PI;

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

  const hourColName       = settings.hourColumn  ?? "";
  const valueColName      = settings.valueColumn ?? "";
  const clockMode         = settings.clockMode   ?? "24h";
  const clockwiseSetting  = settings.clockwise !== false;
  const fillColor         = settings.fillColor   ?? "#5F016F";

  const isDark    = colorScheme === "dark";
  const textColor = isDark ? "#aaa" : "#666";
  const gridColor = isDark ? "#333" : "#ddd";

  const hIdx = cols.findIndex(c => c.name === hourColName);
  const vIdx = cols.findIndex(c => c.name === valueColName);

  const slots = clockMode === "24h" ? 24 : 12;

  const hourValues = useMemo(() => {
    const vals = Array<number>(slots).fill(0);
    if (hIdx < 0 || vIdx < 0) return vals;
    for (const row of rows) {
      if (row[hIdx] === null || row[vIdx] === null) continue;
      const h = Number(row[hIdx]);
      const v = Number(row[vIdx]);
      if (!isFinite(h) || !isFinite(v) || h < 0 || v < 0) continue;
      const slot = Math.floor(h) % slots;
      vals[slot] += v;
    }
    return vals;
  }, [rows, hIdx, vIdx, slots]);

  const maxVal = useMemo(() => Math.max(...hourValues, 1), [hourValues]);

  const PAD       = 30;
  const available = Math.min(Math.max(cw - 2 * PAD, 1), Math.max(ch - 2 * PAD, 1));
  const R         = available / 2;
  const cx        = cw / 2;
  const cy        = ch / 2;
  const rIn       = R * 0.32;
  const rMax      = R * 0.90;

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
  }, [prefersReduced, maxVal, slots]);

  const [hoveredSlot, setHoveredSlot] = useState<number | null>(null);

  const dir  = clockwiseSetting ? 1 : -1;
  const step = TAU / slots;
  const GAP  = 0.018;

  const segments = useMemo(() =>
    Array.from({ length: slots }, (_, slot) => {
      const ratio = hourValues[slot] / maxVal;
      const a0    = -Math.PI / 2 + dir * slot * step + dir * GAP;
      const a1    = -Math.PI / 2 + dir * (slot + 1) * step - dir * GAP;
      const midA  = -Math.PI / 2 + dir * (slot + 0.5) * step;
      return { slot, ratio, a0, a1, midA, value: hourValues[slot] };
    }),
  [hourValues, maxVal, slots, dir, step]);

  const [fr, fg, fb] = hexToRgb(fillColor);

  const valueDisplayName = cols[vIdx]?.display_name ?? cols[vIdx]?.name ?? "";
  const truncName = valueDisplayName.length > 10
    ? valueDisplayName.slice(0, 10) + "…"
    : valueDisplayName;

  const fontSize = Math.max(9, Math.min(11, R * 0.13));

  const tooltip = (() => {
    if (hoveredSlot === null) return null;
    const seg = segments[hoveredSlot];
    if (!seg) return null;
    const tooltipR = rMax + 22;
    const x = cx + tooltipR * Math.cos(seg.midA);
    const y = cy + tooltipR * Math.sin(seg.midA);
    const label =
      clockMode === "24h"
        ? `${hoveredSlot}h`
        : hoveredSlot === 0 ? "12" : String(hoveredSlot);
    return { x, y, label, value: seg.value };
  })();

  if (!cw || !ch) return null;

  return (
    <div style={{ position: "relative", width: cw, height: ch }}>
      <svg width={cw} height={ch} style={{ display: "block", overflow: "visible" }}>

        {/* Inner guide ring */}
        <circle cx={cx} cy={cy} r={rIn} fill="none" stroke={gridColor} strokeWidth={1} />

        {/* Arc segments */}
        {segments.map(({ slot, ratio, a0, a1 }) => {
          const animatedROuter = rIn + ratio * progress * (rMax - rIn);
          if (animatedROuter <= rIn + 1) return null;

          const fillOpacity = 0.15 + 0.85 * ratio;
          const dimmed = hoveredSlot !== null && hoveredSlot !== slot;
          const d = arcPath(cx, cy, animatedROuter, rIn, a0, a1);

          return (
            <path
              key={slot}
              d={d}
              fill={`rgba(${fr},${fg},${fb},${fillOpacity})`}
              style={{
                opacity: dimmed ? 0.2 : 1,
                transition: "opacity 0.15s",
                cursor: "pointer",
              }}
              onMouseEnter={() => setHoveredSlot(slot)}
              onMouseLeave={() => setHoveredSlot(null)}
            />
          );
        })}

        {/* Hour labels every 3 slots */}
        {segments.map(({ slot, midA }) => {
          if (slot % 3 !== 0) return null;
          const lx = cx + (rMax + 14) * Math.cos(midA);
          const ly = cy + (rMax + 14) * Math.sin(midA);
          const label =
            clockMode === "24h"
              ? `${slot}h`
              : slot === 0 ? "12" : String(slot);
          return (
            <text
              key={`lbl-${slot}`}
              x={lx} y={ly}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={fontSize}
              fill={textColor}
              style={{ userSelect: "none", pointerEvents: "none" }}
            >
              {label}
            </text>
          );
        })}

        {/* Center label */}
        {truncName && (
          <>
            <text
              x={cx} y={cy - Math.max(6, R * 0.07)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={Math.max(9, Math.min(12, R * 0.15))}
              fontWeight={600}
              fill={textColor}
              style={{ userSelect: "none" }}
            >
              {truncName}
            </text>
            <text
              x={cx} y={cy + Math.max(6, R * 0.09)}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={Math.max(8, Math.min(10, R * 0.11))}
              fill={textColor}
              style={{ userSelect: "none" }}
            >
              {clockMode}
            </text>
          </>
        )}
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
