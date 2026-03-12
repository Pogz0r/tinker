'use client';

import { useState, useEffect } from 'react';
import { X, Lightbulb, ExternalLink } from 'lucide-react';

interface InsightData {
  insight: string;
  type: string;
  weakCategories?: string[];
  targetPlayers?: Array<{
    name: string;
    team: string;
    cat1Score: string;
    cat2Score: string;
    zTotal: string;
  }>;
}

function renderInsightText(text: string) {
  // Bold **text** → styled span
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} style={{ color: '#3b82f6', fontWeight: 600 }}>
        {part}
      </span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

function SkeletonLine({ width = '100%' }: { width?: string }) {
  return (
    <div
      className="h-4 rounded animate-pulse"
      style={{ width, backgroundColor: '#27272a' }}
    />
  );
}

export default function AIInsightCard() {
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const fetchInsight = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/insight');
      if (!res.ok) throw new Error('Failed to fetch');
      const json = await res.json();
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsight();
  }, []);

  if (dismissed) return null;

  const tagColors: Record<string, string> = {
    'Waiver Wire': '#ea580c',
    'Lineup Tip': '#3b82f6',
    'Trade Target': '#8b5cf6',
  };

  return (
    <div
      className="rounded-lg h-full flex flex-col"
      style={{ backgroundColor: '#18181b', border: '1px solid #27272a' }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid #27272a' }}
      >
        <div className="flex items-center gap-2">
          <Lightbulb size={14} style={{ color: '#eab308' }} />
          <span className="text-sm font-semibold" style={{ color: '#f4f4f5' }}>
            AI Insight
          </span>
          {data && (
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{
                backgroundColor: `${tagColors[data.type] || '#3b82f6'}22`,
                color: tagColors[data.type] || '#3b82f6',
              }}
            >
              {data.type}
            </span>
          )}
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-zinc-800 transition-colors"
        >
          <X size={14} style={{ color: '#71717a' }} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4">
        {loading && (
          <div className="space-y-2">
            <SkeletonLine width="90%" />
            <SkeletonLine width="75%" />
            <SkeletonLine width="85%" />
          </div>
        )}

        {error && !loading && (
          <div className="flex flex-col items-start gap-2">
            <p className="text-sm" style={{ color: '#ef4444' }}>
              Unable to load insight
            </p>
            <button
              onClick={fetchInsight}
              className="text-xs underline"
              style={{ color: '#3b82f6' }}
            >
              Retry
            </button>
          </div>
        )}

        {data && !loading && (
          <div>
            <p className="text-sm leading-relaxed" style={{ color: '#d4d4d8' }}>
              {renderInsightText(data.insight)}
            </p>

            {data.targetPlayers && data.targetPlayers.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {data.targetPlayers.slice(0, 2).map((p) => (
                  <div
                    key={p.name}
                    className="flex items-center justify-between px-3 py-2 rounded"
                    style={{ backgroundColor: '#09090b' }}
                  >
                    <div>
                      <span className="text-sm font-medium" style={{ color: '#3b82f6' }}>
                        {p.name}
                      </span>
                      <span className="text-xs ml-2" style={{ color: '#71717a' }}>
                        {p.team}
                      </span>
                    </div>
                    <span
                      className="text-xs font-mono tabular-nums"
                      style={{ color: parseFloat(p.zTotal) >= 0 ? '#22c55e' : '#ef4444' }}
                    >
                      z: {parseFloat(p.zTotal) > 0 ? '+' : ''}{p.zTotal}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div
        className="px-4 py-3 flex items-center gap-3"
        style={{ borderTop: '1px solid #27272a' }}
      >
        <a
          href="https://football.fantasysports.yahoo.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors"
          style={{ backgroundColor: '#3b82f6', color: '#fff' }}
        >
          Edit lineup on Yahoo
          <ExternalLink size={11} />
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="text-xs"
          style={{ color: '#71717a' }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
