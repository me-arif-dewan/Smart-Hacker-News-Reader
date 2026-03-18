"use client";

import { useState } from "react";
import { Summary } from "@/lib/api";

const sentimentColor = {
  positive: "bg-green-100 text-green-800",
  negative: "bg-red-100 text-red-800",
  mixed: "bg-yellow-100 text-yellow-800",
  neutral: "bg-gray-100 text-gray-700",
};

interface Props {
  storyId: number;
  title: string;
  commentCount: number;
}

export default function SummaryPanel({ storyId, commentCount }: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSummarize = () => {
    setLoading(true);
    setError(null);
    setSummary(null);
    setStatus("Connecting...");

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const es = new EventSource(`${apiUrl}/api/summarize/${storyId}`);

    es.addEventListener("status", (e) => {
      const data = JSON.parse(e.data);
      setStatus(data.message);
    });

    es.addEventListener("done", (e) => {
      const data = JSON.parse(e.data);
      setSummary(data);
      setLoading(false);
      setStatus("");
      es.close();
    });

    es.addEventListener("error", (e) => {
      // Try to parse our custom error event
      try {
        const data = JSON.parse((e as MessageEvent).data);
        setError(data.message);
      } catch (_) {
        setError("Connection lost. Please try again.");
      }
      setLoading(false);
      setStatus("");
      es.close();
    });
  };

  if (commentCount === 0) return null;

  return (
    <div className="my-6 border border-orange-200 rounded-lg p-4 bg-orange-50">
      {!summary && !loading && (
        <button
          onClick={handleSummarize}
          className="bg-orange-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-orange-600 transition-colors"
        >
          ✦ Summarize Discussion
        </button>
      )}

      {loading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <svg className="animate-spin h-4 w-4 text-orange-500" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span>{status || "Processing..."}</span>
          </div>
          <p className="text-xs text-gray-400">
            Running on local CPU — this takes 3-5 minutes
          </p>
        </div>
      )}

      {error && (
        <div className="text-red-600 text-sm">
          {error}
          <button onClick={handleSummarize} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}

      {summary && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">AI Summary</h3>
            <span className={`text-xs px-2 py-1 rounded-full font-medium capitalize ${sentimentColor[summary.sentiment]}`}>
              {summary.sentiment}
            </span>
          </div>
          <p className="text-sm text-gray-700">{summary.summary}</p>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Key Points</p>
            <ul className="space-y-1">
              {summary.keyPoints.map((point, i) => (
                <li key={i} className="text-sm text-gray-700 flex gap-2">
                  <span className="text-orange-400 shrink-0">•</span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-gray-500 italic">{summary.sentimentReason}</p>
          <button
            onClick={() => setSummary(null)}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Clear summary
          </button>
        </div>
      )}
    </div>
  );
}