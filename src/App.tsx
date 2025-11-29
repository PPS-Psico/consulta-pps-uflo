import React, { lazy, Suspense } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useParams, useLocation } from 'react-router-dom';
import Loader from './components/Loader';
import Auth from './components/Auth';
import Layout from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import { PwaInstallProvider } from './contexts/PwaInstallContext';
import ProtectedRoute from './components/ProtectedRoute';
import { useStudentPanel, StudentPanelProvider } from './contexts/StudentPanelContext';

// Views
const StudentView = lazy(() => import('./views/StudentView'));
// StudentHome is now a named export from StudentDashboard
import StudentDashboard, { StudentHome } from './views/StudentDashboard';

const AdminView = lazy(() => import('./views/AdminView'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const LanzadorView = lazy(() => import('./views/admin/LanzadorView'));
const GestionView = lazy(() => import('./views/admin/GestionView'));
const HerramientasView = lazy(() => import('./views/admin/HerramientasView'));
const MetricsView = lazy(() => import('./views/admin/MetricsView')); // Added import
const SolicitudesManager = lazy(() => import('./components/SolicitudesManager'));
const JefeView = lazy(() => import('./views/JefeView'));
const DirectivoView = lazy(() => import('./views/DirectivoView'));
const ReporteroView = lazy(() => import('./views/ReporteroView'));
const AdminTestingView = lazy(() => import('./views/AdminTestingView'));


// Internal wrappers using hooks
import PracticasTable from './components/PracticasTable';
import SolicitudesList from './components/SolicitudesList';
import InformesList from './components/InformesList';
import ProfileView from './components/ProfileView';
import Card from './components/Card';

const StudentPracticasWrapper = () => {
    const { practicas, updateNota } = useStudentPanel();
    return <Card icon="work_history" title="Historial de Prácticas"><PracticasTable practicas={practicas} handleNotaChange={(pid, n, cid) => updateNota.mutate({ practicaId: pid, nota: n, convocatoriaId: cid })} /></Card>;
};
const StudentSolicitudesWrapper = () => {
    const { solicitudes } = useStudentPanel();
    return <Card icon="list_alt" title="Mis Solicitudes"><SolicitudesList solicitudes={solicitudes} /></Card>;
};
const StudentInformesWrapper = () => {
    const { informeTasks, confirmInforme } = useStudentPanel();
    return <Card icon="assignment_turned_in" title="Informes"><InformesList tasks={informeTasks} onConfirmar={confirmInforme.mutate} /></Card>;
};
const StudentProfileWrapper = () => {
    const { studentDetails, isLoading, updateInternalNotes } = useStudentPanel();
    return <Card icon="person" title="Mi Perfil"><ProfileView studentDetails={studentDetails} isLoading={isLoading} updateInternalNotes={updateInternalNotes} /></Card>;
};

const AdminStudentWrapper = () => {
    const { legajo } = useParams();
    if (!legajo) return null;
    // Reusing StudentDashboard (Full Widget) for admin view of student
    return (
        <StudentPanelProvider legajo={legajo}>
            <StudentDashboard user={{ legajo, nombre: 'Estudiante' } as any} showExportButton />
        </StudentPanelProvider>
    );
};


const AppRoutes = () => {
    const { authenticatedUser } = useAuth();
    const location = useLocation();
    
    return (
        <>
            <Routes>
                 {/* Public */}
                <Route path="/login" element={!authenticatedUser ? <Auth /> : <Navigate to="/" />} />
                
                {/* Root Redirect */}
                <Route path="/" element={<ProtectedRoute><Navigate to={authenticatedUser?.role === 'SuperUser' ? "/admin" : authenticatedUser?.role === 'Jefe' ? "/jefe" : authenticatedUser?.role === 'Directivo' ? "/directivo" : authenticatedUser?.role === 'Reportero' ? "/reportero" : "/student"} /></ProtectedRoute>} />

                {/* Student Routes */}
                <Route path="/student" element={<ProtectedRoute allowedRoles={['Student']}><StudentView /></ProtectedRoute>}>
                    <Route index element={<StudentHome />} />
                    <Route path="inicio" element={<Navigate to="/student" replace />} />
                    <Route path="practicas" element={<StudentPracticasWrapper />} />
                    <Route path="solicitudes" element={<StudentSolicitudesWrapper />} />
                    <Route path="informes" element={<StudentInformesWrapper />} />
                    <Route path="perfil" element={<StudentProfileWrapper />} />
                </Route>

                {/* Admin Routes */}
                <Route path="/admin" element={<ProtectedRoute allowedRoles={['SuperUser']}><AdminView /></ProtectedRoute>}>
                    <Route index element={<Navigate to="dashboard" replace />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="metrics" element={<MetricsView onStudentSelect={(s) => window.location.href = `#/admin/estudiantes/${s.legajo}`} />} />
                    <Route path="lanzador" element={<LanzadorView />} />
                    <Route path="gestion" element={<GestionView />} />
                    <Route path="solicitudes" element={<SolicitudesManager />} />
                    <Route path="herramientas" element={<HerramientasView onStudentSelect={(s) => window.location.href = `#/admin/estudiantes/${s.legajo}`} />} />
                    <Route path="estudiantes/:legajo" element={<AdminStudentWrapper />} />
                </Route>

                 {/* Other Roles (Simplified for now, can be expanded similarly) */}
                <Route path="/jefe" element={<ProtectedRoute allowedRoles={['Jefe']}><JefeView /></ProtectedRoute>} />
                <Route path="/directivo" element={<ProtectedRoute allowedRoles={['Directivo']}><DirectivoView /></ProtectedRoute>} />
                <Route path="/reportero" element={<ProtectedRoute allowedRoles={['Reportero']}><ReporteroView /></ProtectedRoute>} />
                <Route path="/testing" element={<ProtectedRoute allowedRoles={['AdminTester']}><AdminTestingView /></ProtectedRoute>} />
                
                 {/* Fallback */}
                <Route path="*" element={<Navigate to="/" />} />
            </Routes>
        </>
    );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <ModalProvider>
        <PwaInstallProvider>
            <Router>
                <AuthProvider>
                    <Layout>
                        <ErrorBoundary>
                            <Suspense fallback={<div className="flex justify-center items-center min-h-[60vh]"><Loader /></div>}>
                                <AppRoutes />
                            </Suspense>
                        </ErrorBoundary>
                    </Layout>
                </AuthProvider>
            </Router>
        </PwaInstallProvider>
      </ModalProvider>
    </ThemeProvider>
  );
};

export default App;