import React, { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cpu, CheckCircle2, Loader2, Sparkles, Database, FileSearch } from 'lucide-react';
import { useStatus } from '../context/StatusContext';

const Processing = () => {
  const navigate = useNavigate();
  const { reportId, statusData, processingStartedAt, isTerminalStatus, refreshStatus, loadResults } = useStatus();
  const pollingLockRef = useRef(false);

  useEffect(() => {
    if (!reportId) {
      navigate('/');
      return;
    }

    const timer = setInterval(async () => {
      if (pollingLockRef.current) return;
      pollingLockRef.current = true;
      try {
        await refreshStatus();
      } finally {
        pollingLockRef.current = false;
      }
    }, 1200);

    return () => clearInterval(timer);
  }, [reportId, navigate, refreshStatus]);

  useEffect(() => {
    if (isTerminalStatus) {
      (async () => {
        await loadResults();
        // Snappy transition
        setTimeout(() => navigate('/results'), 800);
      })();
    }
  }, [isTerminalStatus, navigate, loadResults]);

  const progressStage = useMemo(() => {
    if (isTerminalStatus) return 3;
    const elapsed = Date.now() - (processingStartedAt || Date.now());
    if (elapsed < 4000) return 1;
    if (elapsed < 12000) return 2;
    return 2;
  }, [processingStartedAt, isTerminalStatus]);

  const stages = [
    { title: 'Ingesting Document', sub: 'Parsing structure & metadata', icon: Database },
    { title: 'FinNI Extraction', sub: 'Identifying numerical patterns', icon: FileSearch },
    { title: 'FinCL Semantic Mapping', sub: 'Linking to US-GAAP Taxonomy', icon: Sparkles },
  ];

  return (
    <div className="processing-page glass-card">
      <div className="processing-layout">
        <div className="visual-column">
          <div className="intelligence-orb">
            <div className="orb-inner" />
            <div className="orb-glow" />
            <motion.div 
              className="orb-particles"
              animate={{ rotate: 360 }}
              transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            >
              {[...Array(6)].map((_, i) => (
                <div 
                  key={i} 
                  className="particle" 
                  style={{ 
                    transform: `rotate(${i * 60}deg) translateY(-110px)` 
                  }} 
                />
              ))}
            </motion.div>
            <div className="orb-content">
              <Cpu size={48} className="pulse-icon" />
              <div className="percentage-text">
                {Math.min(99, Math.floor((progressStage / 2.5) * 100))}%
              </div>
            </div>
          </div>
        </div>

        <div className="status-column">
          <div className="status-header">
            <h2>Analysis in Progress</h2>
            <p className="mono">ID: {reportId}</p>
          </div>

          <div className="timeline-v2">
            {stages.map((stage, idx) => {
              const isActive = progressStage === idx + 1;
              const isDone = progressStage > idx + 1;
              const Icon = stage.icon;

              return (
                <motion.div 
                  key={idx}
                  className={`timeline-item-v2 ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.15 }}
                >
                  <div className="item-icon-hub">
                    {isDone ? <CheckCircle2 size={20} className="done-icon" /> : <Icon size={20} />}
                  </div>
                  <div className="item-text-hub">
                    <h3>{stage.title}</h3>
                    <p>{stage.sub}</p>
                  </div>
                  {isActive && <Loader2 size={18} className="spinning-loader" />}
                </motion.div>
              );
            })}
          </div>

          <div className="status-toast-bar">
            <div className="pulse-dot" />
            <span>Neural engines are active... mapping semantic links.</span>
          </div>

          <div className="intelligence-console">
            <div className="console-header">
              <div className="dot-group">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
              <span className="console-title mono">INTELLIGENCE_LOGS_v1.0</span>
            </div>
            <div className="console-body mono">
              {statusData?.logs?.length > 0 ? (
                statusData.logs.slice(-5).map((log, i) => (
                  <motion.div 
                    key={i} 
                    className={`log-line ${log.type || 'info'}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <span className="timestamp">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}]</span>
                    <span className="message">{log.message}</span>
                  </motion.div>
                ))
              ) : (
                <div className="log-line info">
                  <span className="timestamp">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                  <span className="message">Initializing neural handshake...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .processing-page {
          padding: 60px;
          min-height: 500px;
        }

        .processing-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 60px;
          align-items: center;
        }

        .visual-column {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .intelligence-orb {
          position: relative;
          width: 280px;
          height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .orb-inner {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: radial-gradient(circle at center, rgba(99, 102, 241, 0.15), transparent 70%);
          border: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(8px);
        }

        .orb-glow {
          position: absolute;
          inset: -20px;
          border-radius: 50%;
          background: radial-gradient(circle at center, var(--accent-glow), transparent 70%);
          opacity: 0.2;
          animation: pulse-glow 3s ease-in-out infinite;
        }

        .orb-particles {
          position: absolute;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
        }

        .orb-content {
          z-index: 10;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          text-align: center;
        }

        .percentage-text {
          font-family: var(--font-mono);
          font-size: 1.75rem;
          font-weight: 800;
          letter-spacing: -0.05em;
          background: linear-gradient(to bottom, #fff, #94a3b8);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          margin-top: -4px;
        }

        .pulse-icon {
          color: var(--accent-primary);
          filter: drop-shadow(0 0 15px var(--accent-glow));
        }

        .particle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: var(--accent-primary);
          border-radius: 50%;
          box-shadow: 0 0 15px var(--accent-primary);
          transform-origin: center;
        }

        .status-header h2 {
          font-size: 2rem;
          margin: 0;
          font-weight: 800;
        }

        .status-header p {
          color: var(--text-muted);
          margin: 8px 0 0 0;
          font-size: 0.8125rem;
        }

        .timeline-v2 {
          margin-top: 40px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .timeline-item-v2 {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 16px 20px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid transparent;
          transition: all 0.3s;
          opacity: 0.4;
        }

        .timeline-item-v2.active {
          opacity: 1;
          background: rgba(99, 102, 241, 0.05);
          border-color: rgba(99, 102, 241, 0.2);
          transform: translateX(10px);
        }

        .timeline-item-v2.done {
          opacity: 0.8;
          border-color: rgba(16, 185, 129, 0.2);
        }

        .item-icon-hub {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
        }

        .active .item-icon-hub {
          background: var(--accent-primary);
          color: white;
          border-color: transparent;
          box-shadow: 0 10px 15px -5px var(--accent-glow);
        }

        .done .item-icon-hub {
          background: rgba(16, 185, 129, 0.1);
          color: var(--accent-secondary);
          border-color: rgba(16, 185, 129, 0.2);
        }

        .item-text-hub h3 {
          font-size: 1rem;
          margin: 0;
          font-weight: 600;
        }

        .item-text-hub p {
          margin: 4px 0 0 0;
          font-size: 0.8125rem;
          color: var(--text-muted);
        }

        .spinning-loader {
          margin-left: auto;
          color: var(--accent-primary);
          animation: spin 1s linear infinite;
        }

        .status-toast-bar {
          margin-top: 40px;
          background: rgba(0, 0, 0, 0.4);
          padding: 12px 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.8125rem;
          color: var(--text-secondary);
          border: 1px solid var(--border-glass);
        }

        .intelligence-console {
          margin-top: 24px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border-glass);
          border-radius: 12px;
          overflow: hidden;
          font-family: var(--font-mono);
          width: 100%;
        }

        .console-header {
          background: rgba(255, 255, 255, 0.05);
          padding: 8px 12px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-glass);
        }

        .dot-group {
          display: flex;
          gap: 6px;
        }

        .dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
        }

        .console-title {
          font-size: 0.7rem;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .console-body {
          padding: 16px;
          font-size: 0.75rem;
          color: var(--text-secondary);
          display: flex;
          flex-direction: column;
          gap: 10px;
          max-height: 160px;
          overflow-y: auto;
        }

        .log-line {
          display: flex;
          gap: 12px;
          line-height: 1.4;
        }

        .log-line.error { color: #f87171; }
        .log-line.warn { color: #fbbf24; }
        .log-line.success { color: #10b981; }

        .log-line .timestamp {
          color: var(--text-muted);
          flex-shrink: 0;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: #10b981;
          border-radius: 50%;
          box-shadow: 0 0 10px #10b981;
          animation: pulse-dot 1s infinite alternate;
        }

        @keyframes pulse-glow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }

        @keyframes pulse-dot {
          from { opacity: 0.4; }
          to { opacity: 1; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (max-width: 900px) {
          .processing-layout {
            grid-template-columns: 1fr;
          }
          .visual-column {
            order: -1;
            margin-bottom: 40px;
          }
        }
      `}</style>
    </div>
  );
};

export default Processing;
