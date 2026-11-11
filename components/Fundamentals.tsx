"use client";
import { useState } from "react";
import clsx from "clsx";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Dossier } from "@/lib/types";
import { fmtBig, fmtNum, fmtPct } from "@/lib/format";
import { Card } from "./Panels";

const axis = { stroke: "rgb(var(--mute))", fontSize: 11, tickLine: false, axisLine: false } as const;

function Tip({ active, payload, label, kind }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="card px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold">FY{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color }} />
          <span className="text-mute">{p.name}</span>
          <span className="num ml-auto pl-3 font-medium">{kind === "pct" ? fmtPct(p.value) : kind === "eps" ? fmtNum(p.value) : fmtBig(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Fundamentals({ d }: { d: Dossier }) {
  const [tab, setTab] = useState<"income" | "margins" | "eps">("income");
  const f = d.fundamentals;
  if (!f || f.annual.revenue.length < 2) return null;

  const years = f.annual.revenue.map((p) => p.year);
  const at = (arr: { year: number; value: number }[], y: number) => arr.find((p) => p.year === y)?.value ?? null;
  const rows = years.map((y) => {
    const rev = at(f.annual.revenue, y);
    const ni = at(f.annual.netIncome, y);
    const op = at(f.annual.operatingIncome, y);
    return {
      year: y,
      revenue: rev,
      netIncome: ni,
      fcf: at(f.annual.freeCashFlow, y),
      opMargin: rev && op != null ? op / rev : null,
      netMargin: rev && ni != null ? ni / rev : null,
      eps: at(f.annual.eps, y),
    };
  });
  // Custom legend keeps series in declaration order (recharts may reorder).
  const legend = {
    content: ({ payload }: any) => (
      <div className="flex flex-wrap justify-center gap-4 pt-2 text-xs text-mute">
        {[...(payload ?? [])]
          .sort((a: any, b: any) => order.indexOf(a.dataKey) - order.indexOf(b.dataKey))
          .map((p: any) => (
            <span key={p.dataKey} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ background: p.color }} /> {p.value}
            </span>
          ))}
      </div>
    ),
  };
  const order = ["revenue", "netIncome", "fcf", "opMargin", "netMargin"];
  const grid = <CartesianGrid vertical={false} stroke="rgb(var(--line) / 0.06)" />;

  return (
    <Card
      title="Fundamentals · SEC EDGAR"
      right={
        <div className="flex gap-1">
          {(["income", "margins", "eps"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={clsx("tab capitalize", tab === t && "tab-on")}>{t === "eps" ? "EPS" : t}</button>
          ))}
        </div>
      }
    >
      <div className="h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          {tab === "income" ? (
            <BarChart data={rows} barGap={2} barCategoryGap="22%">
              {grid}
              <XAxis dataKey="year" {...axis} />
              <YAxis {...axis} width={56} tickFormatter={(v) => fmtBig(v)} />
              <ReferenceLine y={0} stroke="rgb(var(--line) / 0.2)" />
              <Tooltip content={<Tip />} cursor={{ fill: "rgb(var(--line) / 0.05)" }} />
              <Legend {...legend} />
              <Bar dataKey="revenue" name="Revenue" fill="rgb(var(--s1))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="netIncome" name="Net income" fill="rgb(var(--s2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fcf" name="Free cash flow" fill="rgb(var(--s3))" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : tab === "margins" ? (
            <LineChart data={rows}>
              {grid}
              <XAxis dataKey="year" {...axis} />
              <YAxis {...axis} width={48} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
              <ReferenceLine y={0} stroke="rgb(var(--line) / 0.2)" />
              <Tooltip content={<Tip kind="pct" />} />
              <Legend {...legend} />
              <Line dataKey="opMargin" name="Operating margin" stroke="rgb(var(--s1))" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "rgb(var(--panel))" }} connectNulls />
              <Line dataKey="netMargin" name="Net margin" stroke="rgb(var(--s2))" strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "rgb(var(--panel))" }} connectNulls />
            </LineChart>
          ) : (
            <BarChart data={rows} barCategoryGap="30%">
              {grid}
              <XAxis dataKey="year" {...axis} />
              <YAxis {...axis} width={44} />
              <ReferenceLine y={0} stroke="rgb(var(--line) / 0.2)" />
              <Tooltip content={<Tip kind="eps" />} cursor={{ fill: "rgb(var(--line) / 0.05)" }} />
              <Bar dataKey="eps" name="Diluted EPS" fill="rgb(var(--s1))" radius={[4, 4, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
      <details className="mt-3 text-xs text-mute">
        <summary className="cursor-pointer select-none hover:text-ink">View as table</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="num w-full text-right">
            <thead>
              <tr className="text-mute"><th className="py-1 text-left font-medium">FY</th><th className="font-medium">Revenue</th><th className="font-medium">Net income</th><th className="font-medium">FCF</th><th className="font-medium">Op. margin</th><th className="font-medium">EPS</th></tr>
            </thead>
            <tbody className="text-ink/85">
              {rows.map((r) => (
                <tr key={r.year} className="border-t hairline"><td className="py-1 text-left">{r.year}</td><td>{fmtBig(r.revenue)}</td><td>{fmtBig(r.netIncome)}</td><td>{fmtBig(r.fcf)}</td><td>{fmtPct(r.opMargin)}</td><td>{fmtNum(r.eps)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}
