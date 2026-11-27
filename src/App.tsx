import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { PatternLibraryPage } from './pages/PatternLibraryPage';
import { PatternReaderPage } from './pages/PatternReaderPage';
import { ProjectTrackerPage } from './pages/ProjectTrackerPage';
import { ComparisonPage } from './pages/ComparisonPage';
import { CalculatorPage } from './pages/CalculatorPage';
import { CommunityGalleryPage } from './pages/CommunityGalleryPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12 text-sm text-[var(--text-muted)]">
        Loading session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return <>{children}</>;
}

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="flex min-h-screen flex-col bg-[var(--bg-primary)] text-[var(--text-primary)]">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/patterns" element={<PatternLibraryPage />} />
                <Route path="/patterns/:id" element={<PatternReaderPage />} />
                <Route
                  path="/projects"
                  element={
                    <ProtectedRoute>
                      <ProjectTrackerPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/compare" element={<ComparisonPage />} />
                <Route path="/calculator" element={<CalculatorPage />} />
                <Route path="/gallery" element={<CommunityGalleryPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
