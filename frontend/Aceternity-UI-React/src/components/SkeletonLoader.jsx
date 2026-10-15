import React from 'react';

/**
 * Base skeleton block — the building block for all skeletons
 */
export function SkeletonBlock({ className = '', style = {} }) {
  return (
    <div
      className={`animate-pulse bg-neutral-800 rounded ${className}`}
      style={style}
    />
  );
}

/**
 * Table skeleton — mimics rows of table data
 * @param {number} rows - Number of skeleton rows
 * @param {number} cols - Number of columns per row
 */
export function TableSkeleton({ rows = 5, cols = 4 }) {
  return (
    <div className="w-full space-y-3 p-4 bg-neutral-900/40 rounded-lg">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b border-neutral-800">
        {Array.from({ length: cols }).map((_, i) => (
          <div
            key={i}
            className="h-4 bg-neutral-700 rounded animate-pulse flex-1"
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 py-3">
          {Array.from({ length: cols }).map((_, colIdx) => (
            <div
              key={colIdx}
              className="h-4 bg-neutral-800 rounded animate-pulse flex-1"
              style={{ animationDelay: `${rowIdx * 50}ms` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Card skeleton — for stat cards
 */
export function CardSkeleton() {
  return (
    <div className="p-5 bg-neutral-900/60 rounded-lg border border-neutral-800 animate-pulse">
      <div className="h-3 w-1/2 bg-neutral-700 rounded mb-3" />
      <div className="h-8 w-2/3 bg-neutral-800 rounded mb-2" />
      <div className="h-3 w-1/3 bg-neutral-800 rounded" />
    </div>
  );
}

/**
 * Dashboard skeleton — full-page layout with stats + table
 */
export function DashboardSkeleton({ cards = 4, tableRows = 6, tableCols = 4 }) {
  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="h-8 w-1/3 bg-neutral-800 rounded animate-pulse" />
        <div className="h-10 w-32 bg-neutral-800 rounded animate-pulse" />
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: cards }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Controls row */}
      <div className="flex gap-3">
        <div className="h-10 w-64 bg-neutral-800 rounded animate-pulse" />
        <div className="h-10 w-40 bg-neutral-800 rounded animate-pulse" />
      </div>

      {/* Table */}
      <TableSkeleton rows={tableRows} cols={tableCols} />
    </div>
  );
}

/**
 * Profile skeleton — avatar + fields
 */
export function ProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-neutral-800 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-1/3 bg-neutral-800 rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-neutral-800 rounded animate-pulse" />
        </div>
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="h-3 w-24 bg-neutral-700 rounded animate-pulse" />
          <div className="h-10 w-full bg-neutral-800 rounded animate-pulse" />
        </div>
      ))}
    </div>
  );
}

/**
 * List skeleton — for simple lists (papers, colleges, users)
 */
export function ListSkeleton({ items = 5 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between p-4 bg-neutral-900/50 rounded-lg border border-neutral-800 animate-pulse"
        >
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 bg-neutral-700 rounded" />
            <div className="h-3 w-1/2 bg-neutral-800 rounded" />
          </div>
          <div className="h-8 w-20 bg-neutral-800 rounded" />
        </div>
      ))}
    </div>
  );
}
