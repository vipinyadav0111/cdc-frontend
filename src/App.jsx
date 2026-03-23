import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import DashboardPage from './pages/DashboardPage';
import TimetablePage from './pages/TimetablePage';
import DutiesPage from './pages/DutiesPage';
import UsersPage from './pages/UsersPage';
import ReportsPage from './pages/ReportsPage';
import ProfilePage from './pages/ProfilePage';
import NoticeBoardPage from './pages/NoticeBoardPage';
import AttendancePage from './pages/AttendancePage';
import MeetingsPage from './pages/MeetingsPage';
import MessagesPage from './pages/MessagesPage';
import ChatBubble from './pages/ChatBubble';
import TodoPage from './pages/TodoPage';
import CMPPage        from './pages/CMPPage';
import LessonPlansPage from './pages/LessonPlansPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import HiringTrendsPage from './pages/HiringTrendsPage';
import Layout from './pages/Layout';
import { getToken, getUser } from './api';

const PrivateRoute = ({ children, adminOnly = false }) => {
  const token = getToken();
  const user = getUser();
  if (!token || !user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== 'super_admin') return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/change-password" element={<ChangePasswordPage />} />
        <Route path="/" element={<PrivateRoute><><Layout /><ChatBubble /></></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"    element={<DashboardPage />} />
          <Route path="timetable"    element={<TimetablePage />} />
          <Route path="duties"       element={<DutiesPage />} />
          <Route path="noticeboard"  element={<NoticeBoardPage />} />
          <Route path="attendance"   element={<AttendancePage />} />
          <Route path="cmp"           element={<CMPPage />} />
          <Route path="lessonplans"  element={<LessonPlansPage />} />
          <Route path="meetings"     element={<MeetingsPage />} />
          <Route path="messages"     element={<MessagesPage />} />
          <Route path="todo"         element={<TodoPage />} />
          <Route path="analytics"    element={<PrivateRoute adminOnly><AnalyticsPage /></PrivateRoute>} />
          <Route path="settings"     element={<PrivateRoute adminOnly><SettingsPage /></PrivateRoute>} />
          <Route path="hiring"       element={<HiringTrendsPage />} />
          <Route path="users"        element={<PrivateRoute adminOnly><UsersPage /></PrivateRoute>} />
          <Route path="reports"      element={<ReportsPage />} />
          <Route path="profile"      element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
