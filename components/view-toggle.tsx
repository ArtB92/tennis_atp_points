"use client";

import { useState } from "react";

/** Switch between server-rendered views of the same data. */
export function ViewToggle({ views, label }: { views: { key: string; label: string; content: React.ReactNode }[]; label: string }) {
  const [current, setCurrent] = useState(views[0].key);
  return (
    <div>
      <div role="tablist" aria-label={label} className="mb-5 inline-flex rounded-full border border-rule bg-raised p-1">
        {views.map((v) => (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={v.key === current}
            onClick={() => setCurrent(v.key)}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              v.key === current ? "bg-ink text-surface" : "text-ink-2 hover:text-ink"
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>
      {views.map((v) => (
        <div key={v.key} role="tabpanel" hidden={v.key !== current}>
          {v.content}
        </div>
      ))}
    </div>
  );
}
