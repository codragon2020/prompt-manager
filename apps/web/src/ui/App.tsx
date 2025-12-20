import { Navigate, Route, Routes } from 'react-router-dom';
import { PromptListPage } from './pages/PromptListPage';
import { LoginPage } from './pages/LoginPage';
import { PromptDetailPage } from './pages/PromptDetailPage';
import { TopBar } from './components/TopBar';
import { CreatePromptPage } from './pages/CreatePromptPage';
import { ImportExportPage } from './pages/ImportExportPage';
import { CompareVersionsPage } from './pages/CompareVersionsPage';
import { VersionEditorPage } from './pages/VersionEditorPage';

export function App() {
  return (
    <div>
      <TopBar />
      <Routes>
        <Route path="/" element={<Navigate to="/prompts" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/prompts" element={<PromptListPage />} />
        <Route path="/prompts/new" element={<CreatePromptPage />} />
        <Route path="/prompts/:promptId" element={<PromptDetailPage />} />
        <Route
          path="/prompts/:promptId/versions/new"
          element={<VersionEditorPage />}
        />
        <Route
          path="/prompts/:promptId/compare"
          element={<CompareVersionsPage />}
        />
        <Route path="/import-export" element={<ImportExportPage />} />
        <Route
          path="*"
          element={<div style={{ padding: 16 }}>Not Found</div>}
        />
      </Routes>
    </div>
  );
}
