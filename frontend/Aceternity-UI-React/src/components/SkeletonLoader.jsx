import React from 'react';

/**
 * Base skeleton block — the building block for all skeletons
 */
export function SkeletonBlock({ className = '', style = {} }) {
  return (
    <div
      className={`animate-pulse bg-stone-200/80 rounded-xl ${className}`}
      style={style}
    />
  );
}

/**
 * Table skeleton — mimics rows of table data in light mode
 * @param {number} rows - Number of skeleton rows
 * @param {number} cols - Number of columns per row
 */
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full space-y-3 p-5 bg-white border border-[#E8E2D7] rounded-2xl shadow-sm">
      {/* Header */}
      <div className="flex gap-4 pb-4 border-b border-[#E8E2D7]">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-stone-200 rounded-lg animate-pulse flex-1"
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 py-3 border-b border-[#F2ECE1] last:border-b-0">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="h-4 bg-stone-100 rounded-lg animate-pulse flex-1"
              style={{ animationDelay: `${rowIdx * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Card skeleton — for stat cards in light mode
 */
export function CardSkeleton() {
  return (
    <div className="p-5 bg-white rounded-2xl border border-[#E8E2D7] shadow-sm animate-pulse">
      <div className="h-3 w-1/2 bg-stone-200 rounded-lg mb-3" />
      <div className="h-8 w-2/3 bg-stone-300/80 rounded-lg mb-2" />
      <div className="h-3 w-1/3 bg-stone-200 rounded-lg" />
    </div>
  );
}

/**
 * Dashboard skeleton — full-page layout with stats + table in light mode
 */
export function DashboardSkeleton({ cards = 4, tableRows = 6, tableCols = 4 }) {
  return (
    <div className="w-full space-y-6 py-2" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {/* Header */}
      <div className="flex justify-between items-center pb-6 border-b border-[#E8E2D7]">
        <div className="space-y-2">
          <div className="h-4 w-32 bg-orange-100/80 border border-orange-200 rounded-full animate-pulse" />
          <div className="h-8 w-64 bg-stone-200 rounded-xl animate-pulse" />
          <div className="h-3.5 w-96 max-w-full bg-stone-100 rounded-lg animate-pulse" />
        </div>
        <div className="flex gap-3">
          <div className="h-10 w-10 bg-white border border-[#E8E2D7] rounded-xl animate-pulse" />
          <div className="h-10 w-32 bg-stone-200 rounded-xl animate-pulse" />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Controls row */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-[#E8E2D7] shadow-sm">
        <div className="h-10 w-full sm:w-72 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl animate-pulse" />
        <div className="h-10 w-full sm:w-40 bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl animate-pulse" />
      </div>

      {/* Table */}
      <TableSkeleton rows={tableRows} cols={tableCols} />
    </div>
  );
}

/**
 * Profile skeleton — avatar + fields in light mode
 */
export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-8 bg-white border border-[#E8E2D7] rounded-2xl shadow-sm space-y-6" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      <div className="flex items-center gap-4 pb-6 border-b border-[#E8E2D7]">
        <div className="w-20 h-20 rounded-2xl bg-stone-200 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-1/3 bg-stone-200 rounded-xl animate-pulse" />
          <div className="h-4 w-1/2 bg-stone-100 rounded-lg animate-pulse" />
        </div>
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 bg-stone-200 rounded animate-pulse" />
          <div className="h-11 w-full bg-[#FAF7F2] border border-[#E8E2D7] rounded-xl animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/**
 * List skeleton — for simple lists (papers, colleges, users) in light mode
 */
export function ListSkeleton({ items = 5 }) {
  return (
    <div className="space-y-3" style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#E8E2D7] shadow-sm animate-pulse"
        >
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-stone-200 rounded-lg" />
            <div className="h-3 w-1/2 bg-stone-100 rounded-lg" />
          </div>
          <div className="h-8 w-20 bg-stone-200/80 rounded-xl" />
        </div>
      ))}
    </div>
  );
}
