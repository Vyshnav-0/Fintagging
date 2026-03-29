import React, { useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileUp, Cpu, Table, LayoutGrid, BookOpen, ChevronRight } from 'lucide-react';
import { useStatus } from '../context/StatusContext';

const Layout = ({ children }) => {
  const location = useLocation();
  const { reportId } = useStatus();

  const workflowSteps = [
    { path: '/', label: 'Upload', icon: FileUp },
    { path: '/processing', label: 'Processing', icon: Cpu, disabled: !reportId },
    { path: '/results', label: 'Results', icon: Table, disabled: !reportId },
  ];

  const docsStep = { path: '/docs', label: 'Docs', icon: BookOpen };

  return (
    <div className="premium-container">
      <header className="premium-header">
        {/* Brand Identity */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="brand-identity"
        >
          <div className="logo-package">
            <div className="logo-orb-premium">
              <LayoutGrid size={22} color="white" strokeWidth={2.5} />
              <div className="orb-glow" />
            </div>
            <div className="brand-text">
              <h1 className="brand-title">FinTagging</h1>
              <p className="brand-tagline">Semantic Financial Intelligence</p>
            </div>
          </div>
        </motion.div>

        {/* Navigation Ecosystem */}
        <div className="nav-ecosystem">
          {/* Progressive Workflow Engine */}
          <div className="workflow-engine">
            <div className="engine-label">Workflow</div>
            <div className="steps-container">
              {workflowSteps.map((step, idx) => {
                const isActive = location.pathname === step.path;
                return (
                  <React.Fragment key={step.path}>
                    <Link 
                      to={step.disabled ? '#' : step.path}
                      className={`workflow-node ${isActive ? 'active' : ''} ${step.disabled ? 'disabled' : ''}`}
                      onClick={e => step.disabled && e.preventDefault()}
                    >
                      <div className="node-icon">
                        <step.icon size={16} />
                      </div>
                      <span className="node-label">{step.label}</span>
                      {isActive && <motion.div layoutId="activeWorkflowGlow" className="node-active-indicator" />}
                    </Link>
                    {idx < workflowSteps.length - 1 && (
                      <ChevronRight size={14} className="node-connector-icon" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div className="nav-divider-vertical" />

          {/* Standalone Nav */}
          <Link 
            to={docsStep.path}
            className={`docs-link-standalone ${location.pathname === docsStep.path ? 'active' : ''}`}
          >
            <BookOpen size={18} />
            <span>Documentation</span>
          </Link>
        </div>
      </header>

      <main className="content-wrapper">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      </main>

      <style>{`
        .premium-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 56px;
          gap: 32px;
          padding: 12px 0;
        }

        /* Branding Styles */
        .logo-package {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .logo-orb-premium {
          width: 44px;
          height: 44px;
          background: linear-gradient(135deg, var(--accent-primary), #4338ca);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          box-shadow: 0 8px 16px -4px var(--accent-glow);
          overflow: hidden;
        }

        .orb-glow {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, rgba(255,255,255,0.2) 0%, transparent 70%);
        }

        .brand-title {
          font-size: 1.625rem;
          margin: 0;
          font-weight: 900;
          letter-spacing: -0.04em;
          background: linear-gradient(to bottom, #fff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          line-height: 1;
        }

        .brand-tagline {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin: 4px 0 0 0;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 700;
        }

        /* Nav Ecosystem Styles */
        .nav-ecosystem {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .workflow-engine {
          display: flex;
          align-items: center;
          gap: 16px;
          background: rgba(15, 23, 42, 0.5);
          padding: 6px 6px 6px 16px;
          border-radius: 14px;
          border: 1px solid var(--border-glass);
          backdrop-filter: blur(12px);
        }

        .engine-label {
          font-size: 0.65rem;
          font-weight: 800;
          color: var(--accent-primary);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding-right: 12px;
          border-right: 1px solid var(--border-glass);
        }

        .steps-container {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .workflow-node {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 8px;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.8125rem;
          font-weight: 600;
          transition: all 0.2s;
          position: relative;
        }

        .node-icon {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255,255,255,0.03);
          border-radius: 6px;
          border: 1px solid var(--border-glass);
        }

        .workflow-node.active {
          color: white;
        }

        .workflow-node.active .node-icon {
          background: rgba(99, 102, 241, 0.15);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .node-active-indicator {
          position: absolute;
          bottom: -2px;
          left: 12px;
          right: 12px;
          height: 2px;
          background: var(--accent-primary);
          border-radius: 2px;
          box-shadow: 0 0 8px var(--accent-glow);
        }

        .workflow-node.disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .node-connector-icon {
          color: var(--text-muted);
          opacity: 0.5;
        }

        .nav-divider-vertical {
          width: 1px;
          height: 32px;
          background: var(--border-glass);
        }

        .docs-link-standalone {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text-secondary);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 10px 16px;
          border-radius: 10px;
          transition: all 0.2s;
          border: 1px solid transparent;
        }

        .docs-link-standalone:hover {
          background: rgba(255,255,255,0.03);
          color: white;
        }

        .docs-link-standalone.active {
          background: rgba(255,255,255,0.05);
          border-color: var(--border-glass);
          color: white;
        }

        .content-wrapper {
          min-height: min(70vh, 900px);
        }

        @media (max-width: 1024px) {
          .premium-header {
            flex-direction: column;
            align-items: flex-start;
          }
          .nav-ecosystem {
            width: 100%;
            justify-content: space-between;
          }
        }
      `}</style>
    </div>
  );
};

export default Layout;
