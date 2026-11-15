'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-900/95 text-white p-3 rounded-xl border border-slate-700 shadow-xl text-xs backdrop-blur-sm">
        <div className="font-semibold text-slate-300 pb-1 mb-1 border-b border-slate-700/60 flex items-center justify-between gap-4">
          <span>{data.timeFormatted}</span>
          <span className="font-mono text-emerald-400 font-bold">{data.trendArrow}</span>
        </div>
        <div className="flex items-baseline gap-1.5 my-1">
          <span className="text-xl font-bold font-mono text-white">{data.glucose}</span>
          <span className="text-slate-400 font-medium">mg/dL</span>
        </div>
        <div className="text-[11px] text-slate-400 flex items-center justify-between gap-3">
          <span>Rate: <span className="font-mono text-slate-200">{data.rateOfChange > 0 ? `+${data.rateOfChange}` : data.rateOfChange}</span></span>
          {data.activeEvent && (
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
              {data.activeEvent}
            </span>
          )}
        </div>
      </div>
    );
  }
  return null;
}

export default function GlucoseChart({ readings = [], maxPoints = 50 }) {
  // Format data for Recharts
  const chartData = readings.map((r, idx) => {
    const date = r.timestamp ? new Date(r.timestamp) : new Date();
    const timeFormatted = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return {
      index: idx,
      glucose: Math.round(r.glucose),
      rateOfChange: r.rateOfChange !== undefined ? Number(r.rateOfChange).toFixed(1) : 0,
      trendArrow: r.trendArrow || '→',
      activeEvent: r.activeEvent || null,
      timeFormatted,
      source: r.source || 'simulation'
    };
  });

  // Calculate Time-In-Range (TIR) metrics from current displayed points
  const totalPoints = chartData.length;
  const inRangePoints = chartData.filter((d) => d.glucose >= 70 && d.glucose <= 180).length;
  const hypoPoints = chartData.filter((d) => d.glucose < 70).length;
  const hyperPoints = chartData.filter((d) => d.glucose > 180).length;

  const tirPercentage = totalPoints > 0 ? Math.round((inRangePoints / totalPoints) * 100) : 0;
  const hypoPercentage = totalPoints > 0 ? Math.round((hypoPoints / totalPoints) * 100) : 0;
  const hyperPercentage = totalPoints > 0 ? Math.round((hyperPoints / totalPoints) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm mb-6">
      {/* Header and TIR Summary bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            Real-Time Continuous Glucose Stream
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Target Zone: 70–180 mg/dL (shaded green). Live updates emitted over Socket.IO.
          </p>
        </div>

        {/* TIR Pill Badges */}
        {totalPoints > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold text-slate-700">TIR:</span>
            <div className="flex items-center rounded-lg overflow-hidden border border-slate-200 bg-slate-50 p-1 gap-1">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]" title="70-180 mg/dL">
                {tirPercentage}% In Target
              </span>
              {hypoPercentage > 0 && (
                <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 font-bold text-[11px]" title="< 70 mg/dL">
                  {hypoPercentage}% Low
                </span>
              )}
              {hyperPercentage > 0 && (
                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold text-[11px]" title="> 180 mg/dL">
                  {hyperPercentage}% High
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recharts Container */}
      <div className="w-full h-80 pt-2">
        {chartData.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs">
            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center mb-2 text-slate-500 font-mono text-base">
              ~
            </div>
            <span>No glucose telemetry points yet.</span>
            <span className="text-[11px] text-slate-400 mt-1">Click &quot;Start Simulation&quot; above to begin live data stream.</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="timeFormatted"
                tick={{ fontSize: 10, fill: '#64748b' }}
                stroke="#cbd5e1"
                interval="preserveStartEnd"
              />
              <YAxis
                domain={[40, 320]}
                ticks={[40, 70, 100, 140, 180, 240, 300]}
                tick={{ fontSize: 10, fill: '#64748b' }}
                stroke="#cbd5e1"
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Target Zone Green Overlay (70–180 mg/dL) */}
              <ReferenceArea
                y1={70}
                y2={180}
                fill="#10b981"
                fillOpacity={0.09}
                label={{
                  value: 'TARGET RANGE (70-180 mg/dL)',
                  position: 'insideTopLeft',
                  fill: '#059669',
                  fontSize: 10,
                  fontWeight: 600
                }}
              />

              {/* Hypo & Hyper Alert Reference Threshold Lines */}
              <ReferenceLine
                y={70}
                stroke="#ef4444"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: 'Hypo 70', position: 'insideBottomRight', fill: '#dc2626', fontSize: 10 }}
              />
              <ReferenceLine
                y={180}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                strokeWidth={1.5}
                label={{ value: 'Hyper 180', position: 'insideTopRight', fill: '#d97706', fontSize: 10 }}
              />

              {/* Glucose Trajectory Line */}
              <Line
                type="monotone"
                dataKey="glucose"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={{ r: 2.5, fill: '#0284c7', strokeWidth: 1 }}
                activeDot={{ r: 5, fill: '#0369a1', stroke: '#ffffff', strokeWidth: 2 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Showing last {chartData.length} readings</span>
        <span>Graph updates automatically on each simulator tick</span>
      </div>
    </div>
  );
}

