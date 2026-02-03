import React from "react";

// Premium shimmer effect with gradient animation
export const SkeletonShimmer: React.FC<{ className?: string; children?: React.ReactNode }> = ({
  className = "",
  children,
}) => (
  <div className={`relative overflow-hidden ${className}`}>
    {children}
    <div
      className="absolute inset-0 -translate-x-full animate-shimmer"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)",
      }}
    />
  </div>
);

// Individual skeleton box with shimmer
export const SkeletonBox: React.FC<{ className?: string }> = ({ className = "" }) => (
  <SkeletonShimmer className={`bg-slate-200 dark:bg-slate-700 rounded-lg ${className}`}>
    <div className="w-full h-full" />
  </SkeletonShimmer>
);

// Skeleton for circular elements (avatars, progress circles)
export const SkeletonCircle: React.FC<{ className?: string; size?: "sm" | "md" | "lg" | "xl" }> = ({
  className = "",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12",
    lg: "w-20 h-20",
    xl: "w-40 h-40",
  };

  return (
    <SkeletonShimmer
      className={`${sizeClasses[size]} rounded-full bg-slate-200 dark:bg-slate-700 ${className}`}
    >
      <div className="w-full h-full rounded-full" />
    </SkeletonShimmer>
  );
};

// Skeleton for text lines
export const SkeletonText: React.FC<{
  lines?: number;
  className?: string;
  lineClassName?: string;
}> = ({ lines = 1, className = "", lineClassName = "" }) => (
  <div className={`space-y-2 ${className}`}>
    {[...Array(lines)].map((_, i) => (
      <SkeletonBox
        key={i}
        className={`h-4 ${i === lines - 1 ? "w-3/4" : "w-full"} ${lineClassName}`}
      />
    ))}
  </div>
);

// Skeleton for cards
export const SkeletonCard: React.FC<{ className?: string; hasImage?: boolean }> = ({
  className = "",
  hasImage = true,
}) => (
  <div
    className={`bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm ${className}`}
  >
    <div className="flex gap-4">
      {hasImage && <SkeletonCircle size="lg" />}
      <div className="flex-1 space-y-3">
        <SkeletonBox className="h-6 w-3/4" />
        <SkeletonText lines={2} />
      </div>
    </div>
  </div>
);

// Criterios Panel Skeleton
export const CriteriosPanelSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-lg">
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <div className="lg:col-span-3 flex flex-col sm:flex-row items-center gap-8">
        <SkeletonCircle size="xl" />
        <div className="flex-1 w-full space-y-4">
          <SkeletonBox className="h-8 w-3/4" />
          <SkeletonText lines={2} />
        </div>
      </div>
      <div className="lg:col-span-2 flex flex-col justify-center gap-8 border-t-2 lg:border-t-0 lg:border-l-2 border-slate-200/60 dark:border-slate-700 pt-8 lg:pt-0 lg:pl-8">
        <div className="space-y-3">
          <SkeletonBox className="h-6 w-1/2" />
          <SkeletonBox className="h-4 w-full" />
        </div>
        <div className="space-y-3">
          <SkeletonBox className="h-6 w-1/2" />
          <SkeletonBox className="h-10 w-full rounded-xl" />
        </div>
      </div>
    </div>
  </div>
);

// Table Skeleton with headers
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({
  rows = 5,
  columns = 4,
}) => (
  <div className="space-y-3">
    {/* Header */}
    <div className="flex items-center gap-4 p-3 border-b border-slate-200 dark:border-slate-700">
      {[...Array(columns)].map((_, i) => (
        <SkeletonBox key={i} className="h-6 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-3">
        {[...Array(columns)].map((_, j) => (
          <SkeletonBox key={j} className="h-8 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

// List Skeleton
export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 4 }) => (
  <div className="space-y-3">
    {[...Array(items)].map((_, i) => (
      <SkeletonCard key={i} hasImage={i % 2 === 0} />
    ))}
  </div>
);

// Admin Dashboard Skeleton
export const AdminDashboardSkeleton: React.FC = () => (
  <div className="space-y-8 animate-fade-in">
    {/* Metrics Row */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
        <SkeletonBox className="h-6 w-24 mb-4" />
        <SkeletonBox className="h-10 w-16" />
        <SkeletonBox className="h-4 w-32 mt-4" />
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
        <SkeletonBox className="h-6 w-24 mb-4" />
        <SkeletonBox className="h-10 w-16" />
        <SkeletonBox className="h-4 w-32 mt-4" />
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
        <SkeletonBox className="h-6 w-24 mb-4" />
        <SkeletonBox className="h-10 w-16" />
        <SkeletonBox className="h-4 w-32 mt-4" />
      </div>
    </div>

    {/* Main Card */}
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <SkeletonBox className="h-8 w-1/3" />
        <SkeletonBox className="h-10 w-32" />
      </div>
      <div className="space-y-4">
        <SkeletonCard hasImage={false} />
        <SkeletonCard hasImage={false} />
        <SkeletonCard hasImage={false} />
      </div>
    </div>

    {/* Secondary Columns */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 h-80">
        <SkeletonBox className="h-8 w-1/2 mb-6" />
        <ListSkeleton items={3} />
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 h-80">
        <SkeletonBox className="h-8 w-1/2 mb-6" />
        <ListSkeleton items={3} />
      </div>
    </div>
  </div>
);

// Metrics Skeleton
export const MetricsSkeleton: React.FC = () => (
  <div className="space-y-6 animate-fade-in">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700"
        >
          <SkeletonBox className="h-6 w-24 mb-4" />
          <SkeletonBox className="h-12 w-20" />
          <div className="mt-4 flex items-center gap-2">
            <SkeletonBox className="h-4 w-16" />
            <SkeletonCircle size="sm" />
          </div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl h-96 border border-slate-200 dark:border-slate-700">
        <SkeletonBox className="h-8 w-1/3 mb-6" />
        <div className="h-64 flex items-end justify-around gap-4">
          {[...Array(7)].map((_, i) => {
            const heights = ["h-16", "h-24", "h-32", "h-20", "h-28", "h-36", "h-22"];
            return (
              <div key={i} className="flex-1">
                <SkeletonBox className={`w-full ${heights[i]}`} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl h-96 border border-slate-200 dark:border-slate-700">
        <SkeletonBox className="h-8 w-1/3 mb-6" />
        <SkeletonCircle size="xl" className="mx-auto mb-4" />
        <SkeletonText lines={3} className="max-w-xs mx-auto" />
      </div>
    </div>
  </div>
);

// Form Skeleton
export const FormSkeleton: React.FC<{ fields?: number }> = ({ fields = 6 }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {[...Array(fields)].map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonBox className="h-5 w-32" />
          <SkeletonBox className="h-12 w-full rounded-xl" />
        </div>
      ))}
    </div>
    <div className="flex gap-4 pt-4">
      <SkeletonBox className="h-12 w-32 rounded-xl" />
      <SkeletonBox className="h-12 w-32 rounded-xl" />
    </div>
  </div>
);

// Convocatoria Card Skeleton
export const ConvocatoriaCardSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 rounded-[24px] p-6 md:p-8 border border-slate-200/60 dark:border-slate-800/60 shadow-lg">
    <div className="flex justify-between items-start gap-4 mb-6">
      <div className="flex-1">
        <SkeletonBox className="h-8 w-3/4 mb-3" />
        <div className="flex gap-2">
          <SkeletonBox className="h-6 w-24 rounded-lg" />
          <SkeletonBox className="h-6 w-20 rounded-lg" />
        </div>
      </div>
      <SkeletonBox className="h-12 w-32 rounded-xl" />
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {[...Array(4)].map((_, i) => (
        <SkeletonBox key={i} className="h-20 rounded-2xl" />
      ))}
    </div>
    <SkeletonText lines={3} />
  </div>
);
