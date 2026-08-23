import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { inr } from "@/lib/utils";

export function CashBars({
  data,
}: {
  data: { name: string; collected: number; remaining: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barGap={4}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis hide />
        <Tooltip
          formatter={(v) => inr(Number(v), true)}
          contentStyle={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-line)",
            borderRadius: 8,
            fontSize: 12,
          }}
        />
        <Bar dataKey="collected" stackId="a" fill="var(--color-primary)" radius={[0, 0, 0, 0]} />
        <Bar dataKey="remaining" stackId="a" fill="var(--color-line)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
