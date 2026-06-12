"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const CORES = ["#ffb300", "#4e8ec9", "#3ddc84", "#e5484d", "#a18be6", "#ffce4f", "#8c92a3", "#ff7849"];

export type DiaEvolucao = { dia: string } & Record<string, number | string>;

/** Linha de pontos acumulados por participante, dia a dia. */
export function RankingChart({ dias, nomes }: { dias: DiaEvolucao[]; nomes: string[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={dias} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(140,160,205,0.12)" />
        <XAxis dataKey="dia" stroke="#8c92a3" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#8c92a3" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
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
        {nomes.map((nome, i) => (
          <Line
            key={nome}
            type="monotone"
            dataKey={nome}
            stroke={CORES[i % CORES.length]}
            strokeWidth={2.5}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
