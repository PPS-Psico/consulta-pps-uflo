import React from "react";
import { motion } from "framer-motion";
import {
  IllusSearch,
  IllusEmpty,
  IllusError,
  IllusSuccess,
  IllusConstruction,
  IllusDocuments,
  IllusNoConvocatorias,
  IllusNoPracticas,
  IllusNoSolicitudes,
  IllusWaiting,
  IllusNoAccess,
} from "./Illustrations";

type EmptyStateType =
  | "search"
  | "error"
  | "success"
  | "construction"
  | "documents"
  | "no-convocatorias"
  | "no-practicas"
  | "no-solicitudes"
  | "waiting"
  | "no-access"
  | "empty";

interface EmptyStateProps {
  type?: EmptyStateType;
  icon?: string; // Legacy support
  title: string;
  message: string;
  className?: string;
  action?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

const EmptyState: React.FC<EmptyStateProps> = ({
  type,
  icon,
  title,
  message,
  className = "",
  action,
  size = "md",
}) => {
  // Determine the type from legacy icon prop or use the new type prop
  const getEmptyStateType = (): EmptyStateType => {
    if (type) return type;

    // Legacy mapping from icon names
    switch (icon) {
      case "search_off":
      case "person_search":
      case "search":
        return "search";
      case "error":
      case "warning":
      case "report":
        return "error";
      case "check_circle":
      case "task_alt":
      case "verified":
      case "verified_user":
        return "success";
      case "construction":
      case "pending_actions":
        return "construction";
      case "inbox":
      case "list_alt":
      case "description":
      case "folder_off":
      case "upcoming":
        return "documents";
      default:
        return "empty";
    }
  };

  const emptyStateType = getEmptyStateType();

  const sizeClasses = {
    sm: "w-24 h-24",
    md: "w-32 h-32 sm:w-40 sm:h-40",
    lg: "w-40 h-40 sm:w-48 sm:h-48",
  };

  const illustrationClass = `${sizeClasses[size]} mx-auto drop-shadow-lg`;

  // Render the appropriate illustration
  const renderIllustration = () => {
    switch (emptyStateType) {
      case "search":
        return <IllusSearch className={illustrationClass} />;
      case "error":
        return <IllusError className={illustrationClass} />;
      case "success":
        return <IllusSuccess className={illustrationClass} />;
      case "construction":
        return <IllusConstruction className={illustrationClass} />;
      case "documents":
        return <IllusDocuments className={illustrationClass} />;
      case "no-convocatorias":
        return <IllusNoConvocatorias className={illustrationClass} />;
      case "no-practicas":
        return <IllusNoPracticas className={illustrationClass} />;
      case "no-solicitudes":
        return <IllusNoSolicitudes className={illustrationClass} />;
      case "waiting":
        return <IllusWaiting className={illustrationClass} />;
      case "no-access":
        return <IllusNoAccess className={illustrationClass} />;
      default:
        return <IllusEmpty className={illustrationClass} />;
    }
  };

  // Get color theme based on type
  const getThemeColors = () => {
    switch (emptyStateType) {
      case "search":
        return "from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20";
      case "error":
        return "from-rose-50 to-red-50 dark:from-rose-900/20 dark:to-red-900/20";
      case "success":
        return "from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20";
      case "construction":
        return "from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20";
      case "documents":
      case "no-convocatorias":
      case "no-practicas":
      case "no-solicitudes":
        return "from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20";
      case "waiting":
        return "from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20";
      case "no-access":
        return "from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20";
      default:
        return "from-slate-50 to-gray-50 dark:from-slate-800/50 dark:to-gray-800/50";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`relative overflow-hidden ${className}`}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${getThemeColors()} rounded-3xl`} />

      {/* Content */}
      <div className="relative text-center py-12 px-6">
        {/* Illustration with animation */}
        <motion.div
          className="mb-6"
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {renderIllustration()}
        </motion.div>

        {/* Title */}
        <motion.h3
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="font-extrabold text-slate-900 dark:text-white text-xl sm:text-2xl tracking-tight mb-3"
        >
          {title}
        </motion.h3>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="text-slate-500 dark:text-slate-400 text-sm sm:text-base font-medium max-w-md mx-auto leading-relaxed"
        >
          {message}
        </motion.div>

        {/* Action */}
        {action && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mt-8 flex justify-center"
          >
            {action}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default EmptyState;
