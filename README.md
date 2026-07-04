# Radial Clock — Metabase Custom Visualization

A 24-hour radial clock that plots hourly data as arc segments around a circle. Arc length is proportional to value, making peaks and troughs immediately visible at a glance.

## Requirements

- Metabase ≥ 1.62.0

## Installation

1. Download `radial-clock-X.Y.Z.tgz` from [Releases](https://github.com/ouquoi/metaviz-radial-clock/releases)
2. In Metabase: **Admin → Visualizations → Upload**
3. Select the `.tgz` file and confirm

## Usage

Point a question at a table with at least two columns: one integer for the hour (0–23) and one numeric for the value. The visualization auto-detects both columns on first load.

### Settings

#### Data

| Setting | Description |
|---|---|
| **Hour column (0–23)** | Integer column containing the hour of day. Auto-detected from columns named `hour`, `heure`, or any integer column. |
| **Value column** | Numeric column used as arc length. Auto-detected as the first non-integer numeric column. |

#### Appearance

| Setting | Description |
|---|---|
| **Start hour (top)** | Which hour appears at the top of the clock (12 o'clock position). Default: `0` (midnight). |
| **Center label** | Text displayed in the center of the clock. Defaults to the value column display name. Clear to hide. |
| **Show percentage in tooltip** | When enabled, the hover tooltip shows each arc's share of the total in addition to the raw value (e.g. `92 (18.4%)`). Default: off. |
| **Clockwise** | Toggle the rotation direction of the hours. Default: on (clockwise). |
| **Fill color** | Base color for all arc segments. Opacity scales with intensity — darker = higher value. Default: `#5F016F`. |

## Capabilities

- 24 arc segments arranged in a circle, one per hour
- Arc length proportional to value; opacity encodes relative intensity
- Configurable start hour — any hour can be placed at the top
- Center label: auto-named from the value column, supports multi-line word wrap
- Hover tooltip: hour label + exact value + optional percentage of total
- Animated entry (ease-out cubic, 550 ms); respects `prefers-reduced-motion`
- Smooth dimming of non-hovered segments (150 ms transition)
- Responsive: fills the full card, adapts to any container size
- Dark mode support

## Data requirements

| Column | Required | Type | Notes |
|---|---|---|---|
| Hour | Yes | Integer | Values 0–23. Values outside this range are wrapped with modulo. |
| Value | Yes | Numeric | Negative values and nulls are ignored. Multiple rows for the same hour are summed. |

## Development

```bash
cd radial-clock/
npm install
npm run build        # → dist/index.js + radial-clock-X.Y.Z.tgz
npm run preview:viz  # standalone preview at http://localhost:5180
```
