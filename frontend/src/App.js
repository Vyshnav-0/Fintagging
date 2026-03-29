import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { StatusProvider } from './context/StatusContext';
import Layout from './components/Layout';
import Upload from './components/Upload';
import Processing from './components/Processing';
import Results from './components/Results';
import Docs from './components/Docs';

// Core design system
import './styles/design-system.css';

export default function App() {
  return (
    <StatusProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Upload />} />
            <Route path="/processing" element={<Processing />} />
            <Route path="/results" element={<Results />} />
            <Route path="/docs" element={<Docs />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </StatusProvider>
  );
}
