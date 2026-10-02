"use client";

import * as React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTheme } from "@/lib/hooks/use-theme";

const COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];

/** Theme-aware chart colors (grid, axes, tooltip, legend). */
function useChartColors() {
  const { theme } = useTheme();
  const dark = theme === "dark";
  return React.useMemo(
    () => ({
      grid: dark ? "#262626" : "#e2e8f0",
      axis: dark ? "#3f3f3f" : "#cbd5e1",
      tooltipBg: dark ? "#0a0a0a" : "#ffffff",
      tooltipBorder: dark ? "#2a2a2a" : "#e2e8f0",
      tooltipText: dark ? "#e5e5e5" : "#0f172a",
      legend: dark ? "#a3a3a3" : "#475569",
    }),
    [dark]
  );
}

function tooltipStyle(c: ReturnType<typeof useChartColors>): React.CSSProperties {
  return {
    backgroundColor: c.tooltipBg,
    border: `1px solid ${c.tooltipBorder}`,
    borderRadius: "8px",
    fontSize: "12px",
    color: c.tooltipText,
  };
}

interface LeadsOverTimeChartProps {
  data: { date: string; count: number; converted: number }[];
}

export function LeadsOverTimeChart({ data }: LeadsOverTimeChartProps) {
  const c = useChartColors();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Leads Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="gradLeadsTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradLeadsConverted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke={c.axis} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} stroke={c.axis} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle(c)} cursor={{ stroke: c.grid }} />
              <Legend wrapperStyle={{ color: c.legend, fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#gradLeadsTotal)"
                name="Total Leads"
                activeDot={{ r: 4 }}
              />
              <Area
                type="monotone"
                dataKey="converted"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#gradLeadsConverted)"
                name="Converted"
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface LeadStatusChartProps {
  data: { name: string; value: number }[];
}

export function LeadStatusChart({ data }: LeadStatusChartProps) {
  const c = useChartColors();

  /**
   * Slice labels: smaller font, skipped for empty slices (they all stack on the
   * same angle and overlap), and anchored outwards so long names stay inside
   * the chart area instead of running off the edge.
   */
  const renderLabel = (props: {
    cx?: number;
    cy?: number;
    x?: number;
    y?: number;
    midAngle?: number;
    outerRadius?: number;
    value?: number;
    percent?: number;
    name?: string;
  }) => {
    const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, value = 0, percent = 0, name = "" } = props;
    if (!value) return null;

    let x = props.x;
    let y = props.y;
    if (typeof x !== "number" || typeof y !== "number") {
      const rad = (-midAngle * Math.PI) / 180;
      const r = outerRadius + 14;
      x = cx + r * Math.cos(rad);
      y = cy + r * Math.sin(rad);
    }

    const angle = Math.atan2((y ?? 0) - cy, (x ?? 0) - cx);
    const cos = Math.cos(angle);
    const textAnchor = cos > 0.2 ? "start" : cos < -0.2 ? "end" : "middle";

    return (
      <text
        x={x}
        y={y}
        fill={c.legend}
        fontSize={11}
        textAnchor={textAnchor}
        dominantBaseline="central"
      >
        {`${name.replace(/_/g, " ")} ${Math.round(percent * 100)}%`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lead Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={95}
                paddingAngle={2}
                dataKey="value"
                label={renderLabel}
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle(c)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface PaymentsOverTimeChartProps {
  data: { date: string; amount: number; count: number }[];
}

export function PaymentsOverTimeChart({ data }: PaymentsOverTimeChartProps) {
  const c = useChartColors();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payments Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <defs>
                <linearGradient id="gradPaymentBars" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke={c.axis} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} stroke={c.axis} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle(c)} cursor={{ fill: c.grid, fillOpacity: 0.3 }} />
              <Legend wrapperStyle={{ color: c.legend, fontSize: 12 }} />
              <Bar dataKey="amount" fill="url(#gradPaymentBars)" name="Amount" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface TeamPerformanceChartProps {
  data: { name: string; totalCustomers: number; converted: number; paymentsReceived: number }[];
}

export function TeamPerformanceChart({ data }: TeamPerformanceChartProps) {
  const c = useChartColors();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Team Member Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical">
              <defs>
                <linearGradient id="gradTeamTotal" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a5b4fc" />
                </linearGradient>
                <linearGradient id="gradTeamConverted" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#059669" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={c.grid} horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} stroke={c.axis} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} stroke={c.axis} tickLine={false} width={100} />
              <Tooltip contentStyle={tooltipStyle(c)} cursor={{ fill: c.grid, fillOpacity: 0.3 }} />
              <Legend wrapperStyle={{ color: c.legend, fontSize: 12 }} />
              <Bar dataKey="totalCustomers" fill="url(#gradTeamTotal)" name="Total Customers" radius={[0, 6, 6, 0]} />
              <Bar dataKey="converted" fill="url(#gradTeamConverted)" name="Converted" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
