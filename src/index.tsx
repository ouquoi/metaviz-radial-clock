import {
  type CreateCustomVisualization,
  defineConfig,
} from "@metabase/custom-viz";
import type { Settings } from "./types";
import { RadialClock } from "./RadialClock";
import { isNumericCol, isIntegerCol } from "./utils";

const createVisualization: CreateCustomVisualization<Settings> = ({ defineSetting }) => {
  const ds = (def: any) => (defineSetting as any)(def);

  return defineConfig<Settings>({
    id: "radial-clock",
    getName: () => "Radial Clock",
    minSize: { width: 2, height: 2 },
    defaultSize: { width: 4, height: 4 },

    settings: {
      hourColumn: ds({
        id: "hourColumn",
        title: "Hour column (0–23)",
        widget: "select",
        getSection() { return "Data"; },
        getDefault(series: any) {
          const cols = (series?.[0]?.data?.cols ?? []) as any[];
          return (
            cols.find((c: any) => isIntegerCol(c) && /hour|heure|h$/i.test(c.name)) ??
            cols.find((c: any) => isIntegerCol(c)) ??
            cols[0]
          )?.name ?? "";
        },
        getProps(series: any) {
          const cols = (series?.[0]?.data?.cols ?? []) as any[];
          return {
            options: cols.map((c: any) => ({
              name: c.display_name || c.name,
              value: c.name,
            })),
          };
        },
      }),

      valueColumn: ds({
        id: "valueColumn",
        title: "Value column",
        widget: "select",
        getSection() { return "Data"; },
        getDefault(series: any) {
          const cols = (series?.[0]?.data?.cols ?? []) as any[];
          const numeric = cols.filter((c: any) => isNumericCol(c));
          return (
            numeric.find((c: any) => !isIntegerCol(c)) ??
            numeric[1] ??
            numeric[0] ??
            cols[1] ??
            cols[0]
          )?.name ?? "";
        },
        getProps(series: any) {
          const cols = (series?.[0]?.data?.cols ?? []) as any[];
          return {
            options: cols.map((c: any) => ({
              name: c.display_name || c.name,
              value: c.name,
            })),
          };
        },
      }),

      startHour: ds({
        id: "startHour",
        title: "Start hour (top)",
        widget: "number",
        getSection() { return "Appearance"; },
        getDefault() { return 0; },
      }),

      centerLabel: ds({
        id: "centerLabel",
        title: "Center label",
        widget: "input",
        getSection() { return "Appearance"; },
        getDefault(series: any) {
          const cols = (series?.[0]?.data?.cols ?? []) as any[];
          const numeric = cols.filter((c: any) => isNumericCol(c));
          const valueCol =
            numeric.find((c: any) => !isIntegerCol(c)) ??
            numeric[1] ?? numeric[0] ?? cols[1] ?? cols[0];
          return valueCol?.display_name ?? valueCol?.name ?? "";
        },
      }),

      showPercent: defineSetting({
        id: "showPercent",
        title: "Show percentage in tooltip",
        widget: "toggle",
        getSection() { return "Appearance"; },
        getDefault() { return false; },
      }),

      clockwise: defineSetting({
        id: "clockwise",
        title: "Clockwise",
        widget: "toggle",
        getSection() { return "Appearance"; },
        getDefault() { return true; },
      }),

      fillColor: defineSetting({
        id: "fillColor",
        title: "Fill color",
        widget: "color",
        getSection() { return "Appearance"; },
        getDefault() { return "#5F016F"; },
      }),
    },

    checkRenderable(series) {
      const cols = (series?.[0]?.data?.cols ?? []) as any[];
      if (cols.length < 2 || !cols.some((c: any) => isNumericCol(c))) {
        throw new Error(
          "Radial Clock requires at least two columns: one integer for the hour (0–23) and one numeric for the value.",
        );
      }
    },

    VisualizationComponent: RadialClock,
  });
};

export default createVisualization;
