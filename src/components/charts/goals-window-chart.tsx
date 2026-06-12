"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type WindowDatum = { janela: string; marcados: number; sofridos: number };

export function GoalsWindowChart({ data }: { data: WindowDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(140,160,205,0.12)" />
        <XAxis dataKey="janela" stroke="#8c92a3" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#8c92a3" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "rgba(140,160,205,0.08)" }}
          contentStyle={{
            background: "#11141b",
            border: "1px solid rgba(140,160,205,0.2)",
            borderRadius: 12,
            color: "#eaf0ff",
          }}
        />
        <Legend
          iconType="circle"
          formatter={(v) => <span style={{ color: "#8c92a3", fontSize: 12 }}>{v}</span>}
        />
        <Bar dataKey="marcados" name="Marcados" fill="#ffb300" radius={[6, 6, 0, 0]} />
        <Bar dataKey="sofridos" name="Sofridos" fill="#4e8ec9" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
