import React, { useState, lazy, Suspense, useMemo } from "react";
import SubTabs from "../../components/SubTabs";
import AdminSearch from "../../components/admin/AdminSearch";
import type { AirtableRecord, EstudianteFields } from "../../types";
import Loader from "../../components/Loader";
import ErrorBoundary from "../../components/ErrorBoundary";
import Toast from "../../components/ui/Toast";
import RecordEditModal from "../../components/admin/RecordEditModal";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "../../lib/db";
import { schema } from "../../lib/dbSchema";
import {
  FIELD_NOMBRE_ESTUDIANTES,
  FIELD_LEGAJO_ESTUDIANTES,
  FIELD_NOTAS_INTERNAS_ESTUDIANTES,
} from "../../constants";
import { useAdminPreferences } from "../../contexts/AdminPreferencesContext";
import { testPushNotification } from "../../lib/pushSubscription";

// Lazy load heavy components
const DatabaseEditor = lazy(() => import("../../components/admin/DatabaseEditor"));
const PenalizationManager = lazy(() => import("../../components/admin/PenalizationManager"));
const EmailAutomationManager = lazy(() => import("../../components/admin/EmailAutomationManager"));
const NuevosConvenios = lazy(() => import("../../components/admin/NuevosConvenios"));
const ExecutiveReportGenerator = lazy(
  () => import("../../components/admin/ExecutiveReportGenerator")
);
const ActiveInstitutionsReport = lazy(
  () => import("../../components/admin/ActiveInstitutionsReport")
);
const PersonalizationPanel = lazy(() => import("../../components/PersonalizationPanel"));
const DataIntegrityTool = lazy(() => import("../../components/admin/DataIntegrityTool"));
const MonitoringTest = lazy(() => import("../../components/MonitoringTest"));

const QUICK_STUDENT_CONFIG = {
  label: "Estudiante",
  schema: schema.estudiantes,
  fieldConfig: [
    { key: FIELD_NOMBRE_ESTUDIANTES, label: "Nombre Completo", type: "text" as const },
    { key: FIELD_LEGAJO_ESTUDIANTES, label: "Legajo", type: "text" as const },
    { key: FIELD_NOTAS_INTERNAS_ESTUDIANTES, label: "Notas (Opcional)", type: "textarea" as const },
  ],
};

interface HerramientasViewProps {
  onStudentSelect: (student: AirtableRecord<EstudianteFields>) => void;
  isTestingMode?: boolean;
}

const HerramientasView: React.FC<HerramientasViewProps> = ({
  onStudentSelect,
  isTestingMode = false,
}) => {
  const { preferences } = useAdminPreferences();
  const [activeTabId, setActiveTabId] = useState("editor-db");

  const [isCreatingStudent, setIsCreatingStudent] = useState(false);
  const [toastInfo, setToastInfo] = useState<{ message: string; type: "success" | "error" } | null>(
    null
  );
  const [testResult, setTestResult] = useState<any>(null);
  const [isTestingPush, setIsTestingPush] = useState(false);
  const queryClient = useQueryClient();

  const createStudentMutation = useMutation({
    mutationFn: (fields: any) => {
      if (isTestingMode) return new Promise((resolve) => setTimeout(() => resolve(null), 500));
      return db.estudiantes.create(fields);
    },
    onSuccess: () => {
      setToastInfo({ message: "Estudiante registrado correctamente.", type: "success" });
      setIsCreatingStudent(false);
      queryClient.invalidateQueries({ queryKey: ["databaseEditor", "estudiantes"] });
    },
    onError: (e: any) => setToastInfo({ message: `Error al crear: ${e.message}`, type: "error" }),
  });

  const tabs = useMemo(() => {
    const availableTabs = [
      { id: "editor-db", label: "Editor DB", icon: "storage" },
      { id: "search", label: "Buscar Alumno", icon: "person_search" },
    ];

    if (preferences.showNewAgreements)
      availableTabs.push({ id: "convenios", label: "Convenios Nuevos", icon: "handshake" });
    if (preferences.showPenalizations)
      availableTabs.push({ id: "penalizaciones", label: "Penalizaciones", icon: "gavel" });
    if (preferences.showAutomation)
      availableTabs.push({ id: "automation", label: "Automatizaciones", icon: "auto_fix_high" });
    if (preferences.showReports)
      availableTabs.push({ id: "reportes", label: "Reportes", icon: "summarize" });

    // Mantenimiento (Integridad)
    if (preferences.showIntegrity)
      availableTabs.push({ id: "integrity", label: "Integridad", icon: "health_and_safety" });

    // Monitoring (siempre visible para admin si está activo en prefs)
    if (preferences.showMonitoring) {
      availableTabs.push({ id: "monitoring", label: "Monitoring", icon: "monitoring" });
    }

    // Siempre al final
    availableTabs.push({ id: "personalization", label: "Personalización", icon: "tune" });

    return availableTabs;
  }, [preferences]);

  const handleTestNotification = async () => {
    setIsTestingPush(true);
    setTestResult(null);
    try {
      console.log("[UI] Iniciando test de notificación...");
      const result = await testPushNotification();
      console.log("[UI] Resultado del test:", result);

      setTestResult(result);

      if (result.success) {
        setToastInfo({
          message: `✅ Notificación enviada. Éxito: ${result.details?.sent || "?"}/${result.details?.total || "?"}`,
          type: "success",
        });
      } else {
        setToastInfo({
          message: `❌ Error: ${result.error}`,
          type: "error",
        });
      }
    } catch (e: any) {
      console.error("[UI] Error capturado:", e);
      setToastInfo({ message: `❌ Error inesperado: ${e.message}`, type: "error" });
      setTestResult({ success: false, error: e.message, details: e });
    } finally {
      setIsTestingPush(false);
    }
  };

  return (
    <div className="space-y-8">
      {toastInfo && (
        <Toast
          message={toastInfo.message}
          type={toastInfo.type}
          onClose={() => setToastInfo(null)}
        />
      )}

      {/* Botón temporal de prueba de notificaciones */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-amber-800">🧪 Prueba de Notificaciones Push</h3>
            <p className="text-sm text-amber-600">
              Hacé click para enviar una notificación de prueba a todos los usuarios suscritos
            </p>
          </div>
          <button
            onClick={handleTestNotification}
            disabled={isTestingPush}
            className="bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white font-bold py-2 px-4 rounded-lg shadow transition-colors flex items-center gap-2"
          >
            {isTestingPush ? (
              <>
                <span className="animate-spin">⏳</span>
                Enviando...
              </>
            ) : (
              "Enviar Notificación de Prueba"
            )}
          </button>
        </div>

        {/* Resultados detallados */}
        {testResult && (
          <div
            className={`mt-4 p-4 rounded-lg ${testResult.success ? "bg-green-100 border border-green-300" : "bg-red-100 border border-red-300"}`}
          >
            <h4 className={`font-bold ${testResult.success ? "text-green-800" : "text-red-800"}`}>
              {testResult.success ? "✅ Resultado del envío" : "❌ Error detectado"}
            </h4>

            <div className="mt-2 space-y-2 text-sm">
              <p>
                <strong>Estado:</strong> {testResult.success ? "Éxito" : "Fallido"}
              </p>

              {testResult.success && testResult.details && (
                <>
                  <p>
                    <strong>Enviadas:</strong> {testResult.details.sent} de{" "}
                    {testResult.details.total}
                  </p>
                  <p>
                    <strong>Mensaje:</strong> {testResult.details.message || "N/A"}
                  </p>
                </>
              )}

              {testResult.error && (
                <p>
                  <strong>Error:</strong> {testResult.error}
                </p>
              )}

              {testResult.details && (
                <details className="mt-2">
                  <summary className="cursor-pointer font-semibold text-amber-700 hover:text-amber-900">
                    Ver detalles completos (para debug)
                  </summary>
                  <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-48">
                    {JSON.stringify(testResult.details, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          </div>
        )}

        <div className="mt-3 text-xs text-amber-500">
          💡 Tip: Abrí la consola del navegador (F12) para ver logs detallados
        </div>
      </div>

      <SubTabs tabs={tabs} activeTabId={activeTabId} onTabChange={setActiveTabId} />
      <div className="mt-6">
        <Suspense
          fallback={
            <div className="flex justify-center p-8">
              <Loader />
            </div>
          }
        >
          {activeTabId === "editor-db" && (
            <ErrorBoundary>
              <DatabaseEditor isTestingMode={isTestingMode} />
            </ErrorBoundary>
          )}

          {activeTabId === "convenios" && preferences.showNewAgreements && (
            <ErrorBoundary>
              <NuevosConvenios isTestingMode={isTestingMode} />
            </ErrorBoundary>
          )}

          {activeTabId === "penalizaciones" && preferences.showPenalizations && (
            <ErrorBoundary>
              <PenalizationManager isTestingMode={isTestingMode} />
            </ErrorBoundary>
          )}

          {activeTabId === "automation" && preferences.showAutomation && (
            <ErrorBoundary>
              <EmailAutomationManager />
            </ErrorBoundary>
          )}

          {activeTabId === "integrity" && preferences.showIntegrity && (
            <ErrorBoundary>
              <DataIntegrityTool />
            </ErrorBoundary>
          )}

          {activeTabId === "monitoring" && preferences.showMonitoring && (
            <ErrorBoundary>
              <MonitoringTest />
            </ErrorBoundary>
          )}

          {activeTabId === "personalization" && (
            <ErrorBoundary>
              <PersonalizationPanel />
            </ErrorBoundary>
          )}

          {activeTabId === "search" && (
            <ErrorBoundary>
              <div className="p-4 max-w-2xl mx-auto">
                <AdminSearch onStudentSelect={onStudentSelect} isTestingMode={isTestingMode} />
                <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700 text-center">
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    ¿No encuentras al estudiante? Agrégalo manualmente solo con nombre y legajo.
                  </p>
                  <button
                    onClick={() => setIsCreatingStudent(true)}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
                  >
                    <span className="material-icons !text-lg">person_add</span>
                    Alta Rápida de Estudiante
                  </button>
                </div>
                {isCreatingStudent && (
                  <RecordEditModal
                    isOpen={isCreatingStudent}
                    onClose={() => setIsCreatingStudent(false)}
                    record={null}
                    tableConfig={QUICK_STUDENT_CONFIG}
                    onSave={(_, fields) => createStudentMutation.mutate(fields)}
                    isSaving={createStudentMutation.isPending}
                  />
                )}
              </div>
            </ErrorBoundary>
          )}

          {activeTabId === "reportes" && preferences.showReports && (
            <div className="space-y-6">
              <ErrorBoundary>
                <ActiveInstitutionsReport isTestingMode={isTestingMode} />
              </ErrorBoundary>
              <ErrorBoundary>
                <ExecutiveReportGenerator isTestingMode={isTestingMode} />
              </ErrorBoundary>
            </div>
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default HerramientasView;
