import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useGestionConvocatorias, FilterType } from "../hooks/useGestionConvocatorias";
import { FIELD_NOMBRE_PPS_LANZAMIENTOS } from "../constants";
import { normalizeStringForComparison } from "../utils/formatters";
import Loader from "../components/Loader";
import GestionCard from "../components/admin/GestionCard";
import CollapsibleSection from "../components/CollapsibleSection";
import InstallAdminPWA from "../components/InstallAdminPWA";

const AdminMovilView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilter = (searchParams.get("filter") as FilterType) || "all";

  const {
    institutionsMap,
    loadingState,
    error,
    toastInfo,
    setToastInfo,
    updatingIds,
    searchTerm,
    setSearchTerm,
    handleSave,
    handleUpdateInstitutionPhone,
    filteredData,
    filterType,
    setFilterType,
  } = useGestionConvocatorias({ initialFilter });

  React.useEffect(() => {
    if (filterType !== "all") {
      setSearchParams({ filter: filterType });
    } else {
      setSearchParams({});
    }
  }, [filterType, setSearchParams]);

  if (loadingState === "loading" || loadingState === "initial") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="text-center">
          <span className="material-icons text-red-500 text-5xl mb-4">error</span>
          <h2 className="text-xl font-bold text-slate-800">Error de carga</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  const totalPendientes =
    (filteredData.porContactar?.length || 0) +
    (filteredData.contactadasEsperandoRespuesta?.length || 0);

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      <header className="bg-blue-600 text-white p-4 sticky top-0 z-50 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold">Gestión PPS 2026</h1>
          <div className="bg-white/20 px-3 py-1 rounded-full">
            <span className="text-sm font-bold">{totalPendientes} pendientes</span>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          <button
            onClick={() => setFilterType("all")}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
              filterType === "all"
                ? "bg-white text-blue-600 shadow"
                : "bg-white/20 hover:bg-white/30"
            }`}
          >
            Todo
          </button>
          <button
            onClick={() => setFilterType("vencidas")}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterType === "vencidas"
                ? "bg-white text-rose-600 shadow"
                : "bg-white/20 hover:bg-white/30"
            }`}
          >
            <span className="material-icons !text-sm">priority_high</span>
            Vencidas
          </button>
          <button
            onClick={() => setFilterType("proximas")}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all flex items-center gap-1 ${
              filterType === "proximas"
                ? "bg-white text-amber-600 shadow"
                : "bg-white/20 hover:bg-white/30"
            }`}
          >
            <span className="material-icons !text-sm">schedule</span>
            Próximas
          </button>
        </div>

        <div className="relative mt-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar institución..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-white text-slate-800 placeholder-slate-400 border-0 outline-none"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400">
            search
          </span>
        </div>
      </header>

      <main className="p-3 space-y-4">
        {toastInfo && (
          <div
            className={`p-3 rounded-lg text-sm font-medium mb-3 ${
              toastInfo.type === "success"
                ? "bg-green-100 text-green-800"
                : toastInfo.type === "error"
                  ? "bg-red-100 text-red-800"
                  : "bg-blue-100 text-blue-800"
            }`}
          >
            {toastInfo.message}
            <button onClick={() => setToastInfo(null)} className="ml-2 underline">
              Cerrar
            </button>
          </div>
        )}

        {filterType === "all" &&
          filteredData.porContactar &&
          filteredData.porContactar.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-red-100 text-red-600 p-1.5 rounded-lg">
                  <span className="material-icons text-lg">campaign</span>
                </span>
                <h2 className="font-bold text-slate-800">Por Contactar</h2>
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
                  {filteredData.porContactar.length}
                </span>
              </div>
              <div className="space-y-3">
                {filteredData.porContactar.map((pps: any) => (
                  <GestionCard
                    key={pps.id}
                    pps={pps}
                    onSave={handleSave}
                    isUpdating={updatingIds.has(pps.id)}
                    cardType="porContactar"
                    institution={institutionsMap.get(
                      normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || "")
                    )}
                    onSavePhone={handleUpdateInstitutionPhone}
                    daysLeft={-(pps.daysSinceEnd || 0)}
                    urgency={pps.urgency}
                  />
                ))}
              </div>
            </section>
          )}

        {filterType === "all" &&
          filteredData.contactadasEsperandoRespuesta &&
          filteredData.contactadasEsperandoRespuesta.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-amber-100 text-amber-600 p-1.5 rounded-lg">
                  <span className="material-icons text-lg">pending</span>
                </span>
                <h2 className="font-bold text-slate-800">Esperando Respuesta</h2>
                <span className="bg-amber-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
                  {filteredData.contactadasEsperandoRespuesta.length}
                </span>
              </div>
              <div className="space-y-3">
                {filteredData.contactadasEsperandoRespuesta.map((pps: any) => (
                  <GestionCard
                    key={pps.id}
                    pps={pps}
                    onSave={handleSave}
                    isUpdating={updatingIds.has(pps.id)}
                    cardType="contactadas"
                    institution={institutionsMap.get(
                      normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || "")
                    )}
                    onSavePhone={handleUpdateInstitutionPhone}
                    daysLeft={-(pps.daysSinceEnd || 0)}
                  />
                ))}
              </div>
            </section>
          )}

        {filterType === "all" &&
          filteredData.respondidasPendienteDecision &&
          filteredData.respondidasPendienteDecision.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-blue-100 text-blue-600 p-1.5 rounded-lg">
                  <span className="material-icons text-lg">forum</span>
                </span>
                <h2 className="font-bold text-slate-800">Pendiente Decisión</h2>
                <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
                  {filteredData.respondidasPendienteDecision.length}
                </span>
              </div>
              <div className="space-y-3">
                {filteredData.respondidasPendienteDecision.map((pps: any) => (
                  <GestionCard
                    key={pps.id}
                    pps={pps}
                    onSave={handleSave}
                    isUpdating={updatingIds.has(pps.id)}
                    cardType="respondidas"
                    institution={institutionsMap.get(
                      normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || "")
                    )}
                    onSavePhone={handleUpdateInstitutionPhone}
                    daysLeft={-(pps.daysSinceEnd || 0)}
                  />
                ))}
              </div>
            </section>
          )}

        {filterType === "all" &&
          filteredData.activasYPorFinalizar &&
          filteredData.activasYPorFinalizar.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg">
                  <span className="material-icons text-lg">notifications_active</span>
                </span>
                <h2 className="font-bold text-slate-800">Activas / Por Finalizar</h2>
                <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
                  {filteredData.activasYPorFinalizar.length}
                </span>
              </div>
              <div className="space-y-3">
                {filteredData.activasYPorFinalizar.map((pps: any) => (
                  <GestionCard
                    key={pps.id}
                    pps={pps}
                    onSave={handleSave}
                    isUpdating={updatingIds.has(pps.id)}
                    cardType="activas"
                    institution={institutionsMap.get(
                      normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || "")
                    )}
                    onSavePhone={handleUpdateInstitutionPhone}
                    daysLeft={pps.daysLeft}
                  />
                ))}
              </div>
            </section>
          )}

        {filterType === "all" &&
          filteredData.relanzamientosConfirmados &&
          filteredData.relanzamientosConfirmados.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-emerald-100 text-emerald-600 p-1.5 rounded-lg">
                  <span className="material-icons text-lg">flight_takeoff</span>
                </span>
                <h2 className="font-bold text-slate-800">Confirmados 2026</h2>
                <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
                  {filteredData.relanzamientosConfirmados.length}
                </span>
              </div>
              <div className="space-y-3">
                {filteredData.relanzamientosConfirmados.map((pps: any) => (
                  <GestionCard
                    key={pps.id}
                    pps={pps}
                    onSave={handleSave}
                    isUpdating={updatingIds.has(pps.id)}
                    cardType="relanzamientosConfirmados"
                    institution={institutionsMap.get(
                      normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || "")
                    )}
                    onSavePhone={handleUpdateInstitutionPhone}
                  />
                ))}
              </div>
            </section>
          )}

        {filterType === "all" &&
          filteredData.activasIndefinidas &&
          filteredData.activasIndefinidas.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="bg-slate-100 text-slate-600 p-1.5 rounded-lg">
                  <span className="material-icons text-lg">edit_calendar</span>
                </span>
                <h2 className="font-bold text-slate-800">Indefinidas</h2>
                <span className="bg-slate-600 text-white text-xs font-bold px-2 py-0.5 rounded-full ml-auto">
                  {filteredData.activasIndefinidas.length}
                </span>
              </div>
              <div className="space-y-3">
                {filteredData.activasIndefinidas.map((pps: any) => (
                  <GestionCard
                    key={pps.id}
                    pps={pps}
                    onSave={handleSave}
                    isUpdating={updatingIds.has(pps.id)}
                    cardType="indefinidas"
                    institution={institutionsMap.get(
                      normalizeStringForComparison(pps[FIELD_NOMBRE_PPS_LANZAMIENTOS] || "")
                    )}
                    onSavePhone={handleUpdateInstitutionPhone}
                  />
                ))}
              </div>
            </section>
          )}

        {!filteredData.porContactar?.length &&
          !filteredData.contactadasEsperandoRespuesta?.length &&
          !filteredData.respondidasPendienteDecision?.length &&
          !filteredData.activasYPorFinalizar?.length &&
          !filteredData.relanzamientosConfirmados?.length && (
            <div className="text-center py-12">
              <span className="material-icons text-green-500 text-5xl mb-4">task_alt</span>
              <h2 className="text-xl font-bold text-slate-800">¡Excelente!</h2>
              <p className="text-slate-600">Todas las instituciones están gestionadas.</p>
            </div>
          )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center z-50">
        <button
          onClick={() => setFilterType("all")}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg ${filterType === "all" ? "text-blue-600" : "text-slate-400"}`}
        >
          <span className="material-icons">home</span>
          <span className="text-xs font-medium">Inicio</span>
        </button>
        <button
          onClick={() => {
            setFilterType("all");
            document.getElementById("por-contactar")?.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex flex-col items-center gap-1 p-2 rounded-lg text-slate-400"
        >
          <span className="material-icons">list</span>
          <span className="text-xs font-medium">Gestión</span>
        </button>
        <button
          onClick={() => setFilterType("vencidas")}
          className={`flex flex-col items-center gap-1 p-2 rounded-lg ${filterType === "vencidas" ? "text-rose-600" : "text-slate-400"}`}
        >
          <span className="material-icons">priority_high</span>
          <span className="text-xs font-medium">Urgentes</span>
        </button>
      </nav>

      <InstallAdminPWA />
    </div>
  );
};

export default AdminMovilView;
