import React from "react";

export const SkeletonBox: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div
    className={`animate-background-shine bg-slate-200 dark:bg-slate-700 rounded-md ${className}`}
  />
);

export const CriteriosPanelSkeleton: React.FC = () => (
  <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl border border-slate-200/60 dark:border-slate-700 shadow-lg">
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <div className="lg:col-span-3 flex flex-col sm:flex-row items-center gap-8">
        <div className="w-40 h-40 rounded-full bg-slate-200 dark:bg-slate-700 animate-background-shine flex-shrink-0" />
        <div className="flex-1 w-full space-y-4">
          <SkeletonBox className="h-8 w-3/4" />
          <SkeletonBox className="h-5 w-full" />
          <SkeletonBox className="h-5 w-5/6" />
        </div>
      </div>
      <div className="lg:col-span-2 flex flex-col justify-center gap-8 border-t-2 lg:border-t-0 lg:border-l-2 border-slate-200/60 dark:border-slate-700 pt-8 lg:pt-0 lg:pl-8">
        <div className="space-y-3">
          <SkeletonBox className="h-6 w-1/2" />
          <SkeletonBox className="h-4 w-full" />
        </div>
        <div className="space-y-3">
          <SkeletonBox className="h-6 w-1/2" />
          <SkeletonBox className="h-10 w-full" />
        </div>
      </div>
    </div>
  </div>
);

export const TableSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-2">
        <SkeletonBox className="h-8 w-1/4" />
        <SkeletonBox className="h-8 w-1/4" />
        <SkeletonBox className="h-8 w-1/4" />
        <SkeletonBox className="h-8 w-1/4" />
      </div>
    ))}
  </div>
);

export const AdminDashboardSkeleton: React.FC = () => (
  <div className="space-y-8 animate-fade-in">
    {/* Metrics Row */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <SkeletonBox className="h-32 rounded-2xl" />
      <SkeletonBox className="h-32 rounded-2xl" />
      <SkeletonBox className="h-32 rounded-2xl" />
    </div>

    {/* Main Card */}
    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 h-96">
      <SkeletonBox className="h-8 w-1/3 mb-6" />
      <div className="space-y-4">
        <SkeletonBox className="h-16 w-full" />
        <SkeletonBox className="h-16 w-full" />
        <SkeletonBox className="h-16 w-full" />
      </div>
    </div>

    {/* Secondary Columns */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 h-80">
        <SkeletonBox className="h-8 w-1/2 mb-6" />
        <SkeletonBox className="h-12 w-full mb-4" />
        <SkeletonBox className="h-12 w-full mb-4" />
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 h-80">
        <SkeletonBox className="h-8 w-1/2 mb-6" />
        <SkeletonBox className="h-12 w-full mb-4" />
        <SkeletonBox className="h-12 w-full mb-4" />
      </div>
    </div>
  </div>
);

export const MetricsSkeleton: React.FC = () => (
  <div className="space-y-6 animate-fade-in">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <SkeletonBox className="h-48 rounded-2xl" />
      <SkeletonBox className="h-48 rounded-2xl" />
      <SkeletonBox className="h-48 rounded-2xl" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl h-96 border border-slate-200 dark:border-slate-700">
        <SkeletonBox className="h-8 w-1/3 mb-6" />
        <div className="space-y-4">
          <SkeletonBox className="h-10 w-full" />
          <SkeletonBox className="h-10 w-full" />
          <SkeletonBox className="h-10 w-full" />
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl h-96 border border-slate-200 dark:border-slate-700">
        <SkeletonBox className="h-8 w-1/3 mb-6" />
        <SkeletonBox className="h-full w-full" />
      </div>
    </div>
  </div>
);
