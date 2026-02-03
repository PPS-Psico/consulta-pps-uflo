import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Footer from "../components/layout/Footer";
import AppModals from "../components/AppModals";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import { useAuth } from "../contexts/AuthContext";
import { StudentPanelProvider, useStudentPanel } from "../contexts/StudentPanelContext";
import type { TabId } from "../types";
import StudentDashboard from "./StudentDashboard";
import { PullToRefresh, TabTransitionWrapper } from "../components/layout/MobileTransitions";
import { useTabSwipe } from "../hooks/useSwipe";

// Inner component to consume Context
const StudentLayout: React.FC = () => {
  const { authenticatedUser } = useAuth();
  const { finalizacionRequest } = useStudentPanel(); // Consume finalizationRequest
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active tab from URL
  let activeTab: TabId = "inicio";
  if (location.pathname.includes("/practicas")) activeTab = "practicas";
  else if (location.pathname.includes("/solicitudes")) activeTab = "solicitudes";
  else if (location.pathname.includes("/perfil")) activeTab = "profile";

  const handleTabChange = (tabId: TabId) => {
    // Scroll to top on mobile when changing tabs
    if (window.innerWidth < 768) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    if (tabId === "inicio") navigate("/student");
    else if (tabId === "profile") navigate("/student/perfil");
    else navigate(`/student/${tabId}`);
  };

  const mobileNavTabs = [
    { id: "inicio" as TabId, label: "Inicio", icon: "home", path: "/student" },
    {
      id: "practicas" as TabId,
      label: "Prácticas",
      icon: "work_history",
      path: "/student/practicas",
    },
    {
      id: "solicitudes" as TabId,
      label: "Solicitudes",
      icon: "list_alt",
      path: "/student/solicitudes",
    },
    { id: "profile" as TabId, label: "Perfil", icon: "person", path: "/student/perfil" },
  ];

  // Swipe gesture handling for mobile tab navigation
  const tabIds = mobileNavTabs.map((tab) => tab.id);
  const { swipeHandlers, style } = useTabSwipe({
    tabs: tabIds,
    activeTab: activeTab,
    onTabChange: handleTabChange,
    enabled: typeof window !== "undefined" && window.innerWidth < 768,
  });

  return (
    <div className="pb-28 md:pb-8 min-h-screen flex flex-col">
      <main className="flex-grow md:block">
        {/* Desktop: sin transiciones */}
        <div className="hidden md:block">
          <StudentDashboard
            user={authenticatedUser as any}
            activeTab={activeTab}
            onTabChange={handleTabChange}
          />
        </div>

        {/* Mobile: solo pull-to-refresh y swipe, sin transiciones de página */}
        <div className="md:hidden touch-pan-y animate-fade-in" {...swipeHandlers} style={style}>
          <PullToRefresh
            onRefresh={async () => {
              // Aquí puedes agregar lógica de refresh
              await new Promise((resolve) => setTimeout(resolve, 1000));
              window.location.reload();
            }}
          >
            <StudentDashboard
              user={authenticatedUser as any}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </PullToRefresh>
        </div>
      </main>

      {/* Hide Footer if Finalization Request is active, as tabs/info are irrelevant */}
      {!finalizacionRequest && <Footer activeTab={activeTab} />}

      <AppModals />

      {/* Mobile Nav is also irrelevant if fully locked in finalization view, but for now we keep it or can hide it too */}
      {!finalizacionRequest && <MobileBottomNav tabs={mobileNavTabs} activeTabId={activeTab} />}
    </div>
  );
};

const StudentView: React.FC = () => {
  const { authenticatedUser } = useAuth();
  if (!authenticatedUser) return null;

  return (
    <StudentPanelProvider legajo={authenticatedUser.legajo}>
      <StudentLayout />
    </StudentPanelProvider>
  );
};

export default StudentView;
