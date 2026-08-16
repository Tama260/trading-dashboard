"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { SetupResult } from "@/lib/setupDetection";

const PASSED_COLOR = "#22c55e";
const FAILED_COLOR = "#3f3f46"; // abu gelap netral — item ini gak nyumbang poin, bukan berarti "buruk"

export default function ConfidenceBreakdown({
  breakdown,
  confidence,
}: {
  breakdown: SetupResult["confidenceBreakdown"];
  confidence: number;
}) {
  if (!breakdown || breakdown.length === 0) return null;

  const chartData = breakdown.map((item) => ({
    label: item.label,
    points: item.passed ? item.points : 0,
    maxPoints: item.points,
    passed: item.passed,
  }));

  const rawSum = breakdown.reduce((s, i) => (i.passed ? s + i.points : s), 0);
  const wasCapped = rawSum > confidence;

  return (
    <div className="mt-3">
      <div
        className="text-[10px] uppercase tracking-wide mb-2"
        style={{ color: "var(--text-faint)" }}
      >
        📊 Confidence Breakdown
      </div>
      <div style={{ width: "100%", height: chartData.length * 32 + 10 }}>
        <ResponsiveContainer>
          <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 20 }}>
            <XAxis type="number" domain={[0, "dataMax"]} hide />
            <YAxis
              type="category"
              dataKey="label"
              width={200}
              tick={{ fontSize: 10, fill: "var(--text-tertiary)" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value, _name, props) => {
                const payload = props?.payload as unknown as
                  | { maxPoints: number; passed: boolean }
                  | undefined;
                return [
                  `${value} / ${payload?.maxPoints ?? "?"} poin`,
                  payload?.passed ? "Lolos" : "Tidak lolos",
                ];
              }}
              contentStyle={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-card)",
                fontSize: 11,
              }}
            />
            <Bar dataKey="points" radius={[0, 4, 4, 0]} barSize={14}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.passed ? PASSED_COLOR : FAILED_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {wasCapped && (
        <p className="text-[10px] mt-1" style={{ color: "var(--text-faint)" }}>
          Total mentah {rawSum} poin, dibatasi maksimal {confidence}% (confidence
          rule-based sengaja gak pernah ditampilkan 100% — selalu ada ruang buat
          salah, market gak pernah pasti).
        </p>
      )}
    </div>
  );
}
