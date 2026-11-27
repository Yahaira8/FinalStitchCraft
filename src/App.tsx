import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';

function PhasePlaceholder({
  title,
  phaseLabel,
  branchName,
  description,
}: {
  title: string;
  phaseLabel: string;
  branchName: string;
  description: string;
}) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-8">
        <p className="text-xs font-medium text-[var(--text-muted)]">
          {phaseLabel} · Branch: {branchName}
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-[var(--text-primary)]">
          {title}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-muted)]">{description}</p>
      </div>
    </section>
  );
}

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
                <Route
                  path="/patterns"
                  element={
                    <PhasePlaceholder
                      title="Pattern Library & Directory"
                      phaseLabel="Phase 2"
                      branchName="phase-2-pattern-reader"
                      description="The searchable, filterable 8-pattern catalog with SQL thumbnails and favorites will be built on branch phase-2-pattern-reader."
                    />
                  }
                />
                <Route
                  path="/patterns/:id"
                  element={
                    <PhasePlaceholder
                      title="Interactive Pattern Reader"
                      phaseLabel="Phase 2 & Phase 3"
                      branchName="phase-2-pattern-reader"
                      description="Round-by-round written instructions, direct YouTube tutorial links, and the hands-free floating row counter will be built in Phases 2 and 3."
                    />
                  }
                />
                <Route
                  path="/projects"
                  element={
                    <ProtectedRoute>
                      <PhasePlaceholder
                        title="Amigurumi Project Tracker"
                        phaseLabel="Phase 4"
                        branchName="phase-4-project-tracker"
                        description="Your authenticated session is active! Multi-part WIP tracking, auto-completion progress bars, and CSV export will be built on branch phase-4-project-tracker."
                      />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/compare"
                  element={
                    <PhasePlaceholder
                      title="Supplies & Safety Eye Comparison"
                      phaseLabel="Phase 5"
                      branchName="phase-5-domain-tools"
                      description="Safety eye washer mechanics, yarn stitch density comparisons, and stuffing guides will be built on branch phase-5-domain-tools."
                    />
                  }
                />
                <Route
                  path="/calculator"
                  element={
                    <PhasePlaceholder
                      title="Pattern Resizer & Safety Eye Sizer"
                      phaseLabel="Phase 5"
                      branchName="phase-5-domain-tools"
                      description="Yarn weight scaling, hook recommendations, eye sizing, and poly-fil volume multipliers will be built on branch phase-5-domain-tools."
                    />
                  }
                />
                <Route
                  path="/gallery"
                  element={
                    <PhasePlaceholder
                      title="Community Showcase & Social Feed"
                      phaseLabel="Phase 6"
                      branchName="phase-6-community-gallery"
                      description="Compressed plushie photo uploads, pattern tags, heart likes, and threaded comments will be built on branch phase-6-community-gallery."
                    />
                  }
                />
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
