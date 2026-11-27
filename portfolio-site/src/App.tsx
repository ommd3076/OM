import { useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { PORTFOLIO_DATA } from './data/portfolio';
import { AboutPage } from './pages/AboutPage';
import { HomePage } from './pages/HomePage';
import { NoteDetailPage } from './pages/NoteDetailPage';
import { NotesIndexPage } from './pages/NotesIndexPage';
import { NotesStudioPage } from './pages/NotesStudioPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ProjectDetailPage } from './pages/ProjectDetailPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { RoadmapPage } from './pages/RoadmapPage';

function RouteTitleSync() {
  const { pathname } = useLocation();
  const { fullName, roleHeadline } = PORTFOLIO_DATA.identity;

  useEffect(() => {
    if (pathname === '/') {
      document.title = `${fullName} — ${roleHeadline}`;
      return;
    }

    if (pathname === '/projects') {
      document.title = `Projects — ${fullName}`;
      return;
    }

    if (pathname.startsWith('/projects/')) {
      const slug = pathname.slice('/projects/'.length);
      const study = PORTFOLIO_DATA.caseStudies.find((c) => c.slug === slug);
      document.title = study
        ? `${study.title} — ${fullName}`
        : `404 — ${fullName}`;
      return;
    }

    if (pathname === '/about') {
      document.title = `About — ${fullName}`;
      return;
    }

    if (pathname === '/roadmap') {
      document.title = `Roadmap — ${fullName}`;
      return;
    }

    if (pathname === '/notes') {
      document.title = `Notes — ${fullName}`;
      return;
    }

    if (pathname === '/notes/studio') {
      document.title = `Notes Studio — ${fullName}`;
      return;
    }

    if (pathname.startsWith('/notes/')) {
      document.title = `Notes — ${fullName}`;
      return;
    }

    document.title = `404 — ${fullName}`;
  }, [pathname, fullName, roleHeadline]);

  return null;
}

export default function App() {
  return (
    <>
      <RouteTitleSync />
      <Routes>
        {/* Completely isolated Ellipsus-inspired Notes blog universe */}
        <Route path="/notes" element={<NotesIndexPage />} />
        <Route path="/notes/studio" element={<NotesStudioPage />} />
        <Route path="/notes/:slug" element={<NoteDetailPage />} />

        {/* Portfolio routes inside the main checkerboard / telemetry shell */}
        <Route
          path="/"
          element={
            <Layout>
              <HomePage />
            </Layout>
          }
        />
        <Route
          path="/projects"
          element={
            <Layout>
              <ProjectsPage />
            </Layout>
          }
        />
        <Route
          path="/projects/:slug"
          element={
            <Layout>
              <ProjectDetailPage />
            </Layout>
          }
        />
        <Route
          path="/about"
          element={
            <Layout>
              <AboutPage />
            </Layout>
          }
        />
        <Route
          path="/roadmap"
          element={
            <Layout>
              <RoadmapPage />
            </Layout>
          }
        />
        <Route
          path="*"
          element={
            <Layout>
              <NotFoundPage />
            </Layout>
          }
        />
      </Routes>
    </>
  );
}
