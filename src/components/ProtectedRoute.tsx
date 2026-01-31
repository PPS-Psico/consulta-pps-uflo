import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import Loader from "./Loader";

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: string[];
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const {
    authenticatedUser,
    isAuthLoading,
    isSuperUserMode,
    isJefeMode,
    isDirectivoMode,
    isAdminTesterMode,
    isReporteroMode,
  } = useAuth();
  const location = useLocation();

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader />
      </div>
    );
  }

  if (!authenticatedUser) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles) {
    let hasAccess = false;
    if (allowedRoles.includes("SuperUser") && isSuperUserMode) hasAccess = true;
    if (allowedRoles.includes("Jefe") && isJefeMode) hasAccess = true;
    if (allowedRoles.includes("Directivo") && isDirectivoMode) hasAccess = true;
    if (allowedRoles.includes("Reportero") && isReporteroMode) hasAccess = true;
    // Students
    if (
      allowedRoles.includes("Student") &&
      !isSuperUserMode &&
      !isJefeMode &&
      !isDirectivoMode &&
      !isReporteroMode &&
      !isAdminTesterMode
    )
      hasAccess = true;

    if (isAdminTesterMode) hasAccess = true; // Tester can see everything roughly

    if (!hasAccess) {
      // Redirect based on role
      if (isSuperUserMode) return <Navigate to="/admin/dashboard" replace />;
      if (isJefeMode) return <Navigate to="/jefe/dashboard" replace />; // Assuming Route exists
      return <Navigate to="/student" replace />;
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;
