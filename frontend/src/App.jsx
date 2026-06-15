import { Routes, Route } from 'react-router-dom';
import Topbar from './components/Topbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ExpertsList from './pages/ExpertsList.jsx';
import ExpertForm from './pages/ExpertForm.jsx';
import ExpertDetail from './pages/ExpertDetail.jsx';
import ScheduleNew from './pages/ScheduleNew.jsx';
import History from './pages/History.jsx';

export default function App() {
  return (
    <div className="layout">
      <Topbar />
      <Sidebar />
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/experts" element={<ExpertsList />} />
          <Route path="/experts/new" element={<ExpertForm />} />
          <Route path="/experts/:id" element={<ExpertDetail />} />
          <Route path="/schedule/new" element={<ScheduleNew />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<div className="empty-state">Página não encontrada.</div>} />
        </Routes>
      </main>
    </div>
  );
}
