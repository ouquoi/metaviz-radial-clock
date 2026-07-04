import React from "react";
import { createRoot } from "react-dom/client";
import { RadialClock } from "./RadialClock";

const MOCK_COLS = [
  { name: "hour", display_name: "Hour", base_type: "type/Integer" },
  { name: "occupancy", display_name: "Occupancy %", base_type: "type/Float" },
];

const MOCK_ROWS: [number, number][] = [
  [0, 8], [1, 5], [2, 3], [3, 2], [4, 4], [5, 12],
  [6, 28], [7, 52], [8, 71], [9, 85], [10, 78], [11, 65],
  [12, 58], [13, 62], [14, 68], [15, 72], [16, 75], [17, 80],
  [18, 88], [19, 92], [20, 75], [21, 55], [22, 35], [23, 18],
];

const series = [{ data: { cols: MOCK_COLS, rows: MOCK_ROWS } }];

function App() {
  return (
    <div style={{ padding: 32, fontFamily: "sans-serif" }}>
      <h2 style={{ marginBottom: 16 }}>Radial Clock — Preview</h2>
      <RadialClock
        series={series as any}
        settings={{ hourColumn: "hour", valueColumn: "occupancy", clockMode: "24h", clockwise: true, fillColor: "#5F016F" }}
        width={400}
        height={400}
        colorScheme="light"
        onClick={() => {}}
        onHover={() => {}}
      />
    </div>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
