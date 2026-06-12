"use client";

import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type BarDatum = { label: string; value: number; color?: string };

export function SimpleBarChart({
  data,
  color = "#ffb300",
  height = 280,
}: {
  data: BarDatum[];
  color?: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <XAxis dataKey="label" stroke="#8c92a3" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#8c92a3" fontSize={12} tickLine={false} axisLine={false} />
        <Tooltip
          cursor={{ fill: "rgba(140,160,205,0.08)" }}
          contentStyle={{
            background: "#11141b",
            border: "1px solid rgba(140,160,205,0.2)",
            borderRadius: 12,
            color: "#eaf0ff",
          }}
        />
        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.color ?? color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
