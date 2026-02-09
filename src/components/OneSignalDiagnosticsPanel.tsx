import React, { useState, useEffect } from "react";
import {
  runOneSignalDiagnostics,
  getStoredDiagnostics,
  getDebugLogs,
  OneSignalDiagnostics,
} from "@/lib/onesignal";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

interface VerificationResult {
  player_id: string;
  valid: boolean;
  reason?: string;
  device_type?: number;
  loading?: boolean;
}

export const OneSignalDiagnosticsPanel: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<OneSignalDiagnostics | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [verifying, setVerifying] = useState(false);

  const loadDiagnostics = async () => {
    setLoading(true);
    try {
      const result = await runOneSignalDiagnostics();
      setDiagnostics(result);
      setLogs(getDebugLogs());
    } catch (e) {
      console.error("Error running diagnostics:", e);
    }
    setLoading(false);
  };

  const verifyPlayerId = async () => {
    if (!diagnostics?.playerId) return;

    setVerifying(true);
    setVerificationResult({ player_id: diagnostics.playerId, valid: false, loading: true });

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/onesignal-verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ player_id: diagnostics.playerId }),
        }
      );

      const data = await response.json();
      setVerificationResult({
        player_id: diagnostics.playerId,
        valid: data.valid,
        reason: data.reason,
        device_type: data.device_type,
        loading: false,
      });
    } catch (e: any) {
      setVerificationResult({
        player_id: diagnostics.playerId,
        valid: false,
        reason: `Error: ${e.message}`,
        loading: false,
      });
    }
    setVerifying(false);
  };

  useEffect(() => {
    // Cargar diagnósticos previos
    const stored = getStoredDiagnostics();
    if (stored) {
      setDiagnostics(stored);
    }
    setLogs(getDebugLogs());
  }, []);

  const getPermissionBadgeVariant = (status: string): "success" | "error" | "warning" => {
    switch (status) {
      case "granted":
        return "success";
      case "denied":
        return "error";
      default:
        return "warning";
    }
  };

  return (
    <div className="space-y-6">
      <Card
        title="Diagnóstico OneSignal"
        description="Herramientas de debugging para notificaciones push"
        icon="bug_report"
        actions={
          <Button onClick={loadDiagnostics} isLoading={loading} icon="refresh">
            Ejecutar Diagnóstico
          </Button>
        }
      >
        {!diagnostics ? (
          <div className="text-center py-8 text-slate-500">
            Presiona "Ejecutar Diagnóstico" para verificar el estado de OneSignal
          </div>
        ) : (
          <div className="space-y-6">
            {/* Estado General */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="material-icons text-blue-500">activity</span>
                  Estado de Suscripción
                </h4>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-400">Player ID:</span>
                    <code className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                      {diagnostics.playerId || "No disponible"}
                    </code>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Opted In:</span>
                    <Badge variant={diagnostics.optedIn ? "success" : "neutral"}>
                      {diagnostics.optedIn ? "Sí" : "No"}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-slate-600 dark:text-slate-400">Token:</span>
                    <Badge variant={diagnostics.token ? "success" : "error"}>
                      {diagnostics.token ? "Presente" : "Faltante"}
                    </Badge>
                  </div>
                </div>

                {diagnostics.playerId && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={verifyPlayerId}
                    isLoading={verifying}
                    icon="cloud_done"
                  >
                    Verificar en OneSignal API
                  </Button>
                )}

                {verificationResult && !verificationResult.loading && (
                  <div
                    className={`mt-3 p-3 rounded-lg text-sm ${verificationResult.valid ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300" : "bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300"}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="material-icons">
                        {verificationResult.valid ? "check_circle" : "error"}
                      </span>
                      <span>
                        {verificationResult.valid
                          ? "Player ID válido en OneSignal"
                          : verificationResult.reason || "Player ID inválido"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Permisos del Navegador */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                  <span className="material-icons text-blue-500">notifications</span>
                  Permisos del Navegador
                </h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600 dark:text-slate-400">Estado:</span>
                    <Badge variant={getPermissionBadgeVariant(diagnostics.notificationPermission)}>
                      {diagnostics.notificationPermission}
                    </Badge>
                  </div>

                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {diagnostics.notificationPermission === "granted"
                      ? "Las notificaciones están permitidas"
                      : diagnostics.notificationPermission === "denied"
                        ? "Las notificaciones están bloqueadas. Debes cambiar esto en la configuración del navegador."
                        : "Aún no se ha solicitado permiso para notificaciones"}
                  </p>
                </div>
              </div>
            </div>

            {/* Service Workers */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="material-icons text-blue-500">settings_suggest</span>
                Service Workers ({diagnostics.serviceWorkerInfo?.count || 0} registrados)
              </h4>

              {diagnostics.serviceWorkerInfo?.registrations?.length > 0 ? (
                <div className="space-y-2">
                  {diagnostics.serviceWorkerInfo.registrations.map((reg: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-3 bg-white dark:bg-slate-700 rounded-lg text-sm space-y-1"
                    >
                      <div>
                        <strong>Scope:</strong> {reg.scope}
                      </div>
                      <div>
                        <strong>State:</strong>{" "}
                        <Badge variant={reg.state === "activated" ? "success" : "warning"}>
                          {reg.state}
                        </Badge>
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        <strong>Script:</strong> {reg.scriptURL}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                  <span className="material-icons">error</span>
                  <span className="text-sm">
                    No hay Service Workers registrados. Esto es un problema crítico para las
                    notificaciones push.
                  </span>
                </div>
              )}
            </div>

            {/* Información del Navegador */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
              <h4 className="font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="material-icons text-blue-500">language</span>
                Información del Navegador
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-slate-600 dark:text-slate-400">Hostname:</span>
                  <div className="font-mono text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded mt-1">
                    {diagnostics.browserInfo.hostname}
                  </div>
                </div>

                <div>
                  <span className="text-slate-600 dark:text-slate-400">Protocolo:</span>
                  <div className="font-mono text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded mt-1">
                    {diagnostics.browserInfo.protocol}
                  </div>
                </div>

                <div>
                  <span className="text-slate-600 dark:text-slate-400">URL:</span>
                  <div className="font-mono text-xs bg-slate-100 dark:bg-slate-700 p-2 rounded mt-1 truncate">
                    {diagnostics.browserInfo.url}
                  </div>
                </div>
              </div>
            </div>

            {/* Errores */}
            {diagnostics.errors.length > 0 && (
              <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl">
                <h4 className="font-bold text-rose-700 dark:text-rose-300 mb-3 flex items-center gap-2">
                  <span className="material-icons">error</span>
                  Errores Detectados ({diagnostics.errors.length})
                </h4>

                <ul className="space-y-2">
                  {diagnostics.errors.map((error, idx) => (
                    <li
                      key={idx}
                      className="text-sm text-rose-700 dark:text-rose-300 flex items-start gap-2"
                    >
                      <span>•</span>
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Logs */}
            <div className="p-4 bg-slate-900 rounded-xl">
              <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                <span className="material-icons text-blue-400">terminal</span>
                Logs de OneSignal
              </h4>

              <div className="max-h-64 overflow-y-auto font-mono text-xs">
                {logs.length === 0 ? (
                  <span className="text-slate-500">No hay logs disponibles</span>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="mb-1 text-slate-300">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
