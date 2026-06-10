"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

export type DonutSlice = { name: string; value: number; color: string };

export function DonutChart({ data, height = 280 }: { data: DonutSlice[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Tooltip
          contentStyle={{
            background: "#0b1020",
            border: "1px solid rgba(140,160,205,0.2)",
            borderRadius: 12,
            color: "#eaf0ff",
          }}
        />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(v) => <span style={{ color: "#8ea0c6", fontSize: 12 }}>{v}</span>}
        />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="45%"
          innerRadius={58}
          outerRadius={92}
          paddingAngle={3}
          stroke="none"
        >
          {data.map((d) => (
            <Cell key={d.name} fill={d.color} />
          ))}
        </Pie>
      </PieChart>
    </ResponsiveContainer>
  );
}
