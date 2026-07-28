import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Auth/Login';
import Signup from './pages/Auth/Signup';
import Dashboard from './pages/Dashboard/Dashboard';
import SubjectPage from './pages/Subject/SubjectPage';
import StudySubject from './pages/Subject/StudySubject';
import GlobalBrainPage from './pages/Brain/GlobalBrain';
import ProgressReport from './pages/Reports/ProgressReport';
import CalendarPage from './pages/Calendar/CalendarPage';
import SemestersPage from './pages/Semesters/SemestersPage';
import AllSubjectsPage from './pages/Subjects/AllSubjectsPage';
import ExamsPage from './pages/Exams/ExamsPage';
import QuizzesPage from './pages/Quizzes/QuizzesPage';
import SettingsPage from './pages/Settings/SettingsPage';
import HelpPage from './pages/Help/HelpPage';

interface PrivateRouteProps {
  children: React.ReactNode;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0F4F7] flex flex-col items-center justify-center space-y-4">
        <div className="animate-spin h-7 w-7 border-2 border-[#2E7C87] border-t-transparent rounded-full" />
        <span className="text-[#6B7B85] text-xs font-medium animate-pulse">Loading LearnOS...</span>
      </div>
    );
  }

  if (user) {
    return <>{children}</>;
  }

  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <PrivateRoute>
              <ProgressReport />
            </PrivateRoute>
          }
        />
        <Route
          path="/semesters/:semesterId"
          element={
            <PrivateRoute>
              <SubjectPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/subjects/:subjectId"
          element={
            <PrivateRoute>
              <StudySubject />
            </PrivateRoute>
          }
        />
        <Route
          path="/brain"
          element={
            <PrivateRoute>
              <GlobalBrainPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <PrivateRoute>
              <CalendarPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/exams"
          element={
            <PrivateRoute>
              <ExamsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/quizzes"
          element={
            <PrivateRoute>
              <QuizzesPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <PrivateRoute>
              <SettingsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/semesters"
          element={
            <PrivateRoute>
              <SemestersPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/subjects"
          element={
            <PrivateRoute>
              <AllSubjectsPage />
            </PrivateRoute>
          }
        />
        <Route
          path="/help"
          element={
            <PrivateRoute>
              <HelpPage />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
