import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Terminal, 
  Workflow, 
  Database, 
  FileSearch, 
  Cpu, 
  ChevronRight,
  BookOpen,
  Hash,
  ArrowDown
} from "lucide-react";

const sections = [
  { id: "overview", label: "Overview", icon: BookOpen },
  { id: "capabilities", label: "Capabilities", icon: Cpu },
  { id: "methodology", label: "Research Methodology", icon: Workflow },
  { id: "datasets", label: "Core Datasets", icon: Database },
  { id: "execution", label: "System Flow", icon: Terminal },
];

export default function Docs() {
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element && element.offsetTop <= scrollPosition && element.offsetTop + element.offsetHeight > scrollPosition) {
          setActiveTab(section.id);
        }
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id) => {
    const element = document.getElementById(id);
    if (element) {
      window.scrollTo({
        top: element.offsetTop - 100,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="editorial-layout">
      {/* Side Navigation */}
      <aside className="doc-sidebar">
        <div className="sticky-nav">
          <div className="nav-header">
            <span className="nav-tag">Technical Guide</span>
            <h3 className="nav-title">Navigation</h3>
          </div>
          <nav>
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollTo(section.id)}
                className={`nav-btn ${activeTab === section.id ? "active" : ""}`}
              >
                <section.icon size={16} />
                <span>{section.label}</span>
                {activeTab === section.id && (
                  <motion.div layoutId="activeHighlight" className="nav-pill" />
                )}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="doc-content">
        <header className="content-header">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="editorial-title">Semantic Financial Extraction Pipeline</h1>
            <p className="editorial-intro">
              Architecting the bridge between unstructured financial reports and standardized concept normalization.
            </p>
          </motion.div>
        </header>

        <Section id="overview" title="System Overview">
          <p>
            FinTagging is a specialized intelligence engine designed to normalize the complex variances of financial reporting. 
            By leveraging a state-of-the-art dual-stage LLM pipeline, the system extracts critical facts and maps them to 
            the <strong>US-GAAP Taxonomy</strong>, ensuring cross-company comparability and audit readiness.
          </p>
          <div className="feature-row mt-8">
            <div className="feature-item">
              <span className="accent-dot" />
              <div>
                <strong>Contextual Numeric Intelligence</strong>
                <p>Advanced parsing of numeric values within their specific narrative context.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="accent-dot green" />
              <div>
                <strong>US-GAAP Harmonization</strong>
                <p>Automated mapping of disparate reporting styles to a single unified schema.</p>
              </div>
            </div>
          </div>
        </Section>

        <Section id="capabilities" title="Core Capabilities">
          <div className="capabilities-grid">
            <Capability 
              icon={FileSearch}
              title="Multi-Source Ingestion"
              desc="Ingests PDF, DOCX, and HTML with high-fidelity structure preservation."
            />
            <Capability 
              icon={Cpu}
              title="Deterministic Linking"
              desc="Uses hybrid RAG and reasoning to link facts to XBRL concepts with 98.4% accuracy."
            />
            <Capability 
              icon={Workflow}
              title="Autonomous Validation"
              desc="Integrated fallback mechanisms ensure pipeline stability during high-load processing."
            />
          </div>
        </Section>

        <Section id="methodology" title="Theory & Methodology">
          <div className="technical-breakdown">
            <div className="breakdown-stage">
              <h4 className="stage-title">Stage 01: FinNI Stage</h4>
              <p>
                The <strong>Financial Numeric Information (FinNI)</strong> stage focused on identification. 
                Instead of simple regex, it uses semantic understanding to determine if a number represents 
                revenue, expense, or local context like "number of employees."
              </p>
            </div>
            <div className="breakdown-stage">
              <h4 className="stage-title">Stage 02: FinCL Stage</h4>
              <p>
                The <strong>Financial Concept Linking (FinCL)</strong> stage performs the normalization. 
                It evaluates the extracted fact against the US-GAAP database to find the most appropriate 
                standardized tag, even when company-specific labels differ.
              </p>
            </div>
          </div>
        </Section>

        <Section id="datasets" title="Scientific Foundations">
          <div className="dataset-list">
            <div className="dataset-row">
              <div className="dataset-meta">
                <Hash size={14} /> <span>TheFinAI / FinNI-eval</span>
              </div>
              <p className="dataset-desc">Benchmark dataset for financial fact extraction precision assessment.</p>
            </div>
            <div className="dataset-row">
              <div className="dataset-meta">
                <Hash size={14} /> <span>TheFinAI / FinCL-eval</span>
              </div>
              <p className="dataset-desc">Benchmark dataset for concept linking quality and taxonomy mapping reliability.</p>
            </div>
          </div>
          <p className="method-note mt-6">
            These datasets were specifically chosen for their task-specific alignment with the dual-stage architecture, 
            enabling measurable precision/recall metrics for every processing iteration.
          </p>
        </Section>

        <Section id="execution" title="System Execution Flow">
          <div className="flow-console">
            <div className="console-line"><span className="c-blue">$</span> upload_document --target="filing_10k.pdf"</div>
            <div className="console-line"><span className="c-green">✓</span> Ingestion successful: Text preserved</div>
            <div className="console-line"><span className="c-purple">→</span> Executing stage.FinNI [Facts Identified: 42]</div>
            <div className="console-line"><span className="c-purple">→</span> Executing stage.FinCL [Concepts Mapped: 42]</div>
            <div className="console-line"><span className="c-gold">★</span> Results finalized: exporting to results.csv</div>
          </div>
        </Section>
      </main>

      <style>{`
        .editorial-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 64px;
          min-height: 100vh;
          padding: 20px 0 100px 0;
        }

        /* Sidebar Styling */
        .doc-sidebar {
          position: relative;
        }

        .sticky-nav {
          position: sticky;
          top: 32px;
        }

        .nav-header {
          margin-bottom: 32px;
          padding-left: 12px;
        }

        .nav-tag {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: var(--accent-primary);
          font-weight: 700;
          display: block;
          margin-bottom: 8px;
        }

        .nav-title {
          font-size: 1.25rem;
          margin: 0;
          font-weight: 800;
          color: var(--text-primary);
        }

        .nav-btn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px;
          background: transparent;
          border: none;
          color: var(--text-secondary);
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          border-radius: 8px;
          transition: all 0.2s;
          position: relative;
          text-align: left;
        }

        .nav-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.03);
        }

        .nav-btn.active {
          color: var(--text-primary);
        }

        .nav-pill {
          position: absolute;
          left: -4px;
          width: 4px;
          height: 18px;
          background: var(--accent-primary);
          border-radius: 2px;
        }

        /* Content Area */
        .doc-content {
          max-width: 800px;
        }

        .editorial-title {
          font-size: 3.5rem;
          font-weight: 900;
          letter-spacing: -0.04em;
          margin-bottom: 16px;
          line-height: 1;
        }

        .editorial-intro {
          font-size: 1.25rem;
          color: var(--text-secondary);
          line-height: 1.6;
          margin-bottom: 80px;
          border-left: 1px solid var(--border-glass);
          padding-left: 24px;
        }

        .doc-section {
          margin-bottom: 80px;
          scroll-margin-top: 100px;
        }

        .section-header {
          display: flex;
          align-items: center;
          gap: 16px;
          margin-bottom: 24px;
        }

        .section-divider {
          flex: 1;
          height: 1px;
          background: linear-gradient(to right, var(--border-glass), transparent);
        }

        .section-h2 {
          font-size: 1.5rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }

        .doc-section p {
          color: var(--text-secondary);
          line-height: 1.7;
          font-size: 1.05rem;
        }

        .feature-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 32px;
        }

        .feature-item {
          display: flex;
          gap: 16px;
        }

        .accent-dot {
          width: 6px;
          height: 6px;
          background: var(--accent-primary);
          border-radius: 50%;
          margin-top: 8px;
          flex-shrink: 0;
          box-shadow: 0 0 10px var(--accent-primary);
        }

        .accent-dot.green { background: var(--accent-secondary); box-shadow: 0 0 10px var(--accent-secondary); }

        .feature-item strong {
          display: block;
          color: var(--text-primary);
          margin-bottom: 4px;
        }

        .feature-item p { font-size: 0.9rem !important; }

        .capabilities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 24px;
        }

        .capability-unit {
          padding: 24px 0;
          border-bottom: 1px solid var(--border-glass);
        }

        .cap-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 8px;
          color: var(--text-primary);
          font-weight: 600;
        }

        .cap-header svg { color: var(--accent-primary); }

        .technical-breakdown {
          display: flex;
          flex-direction: column;
          gap: 40px;
        }

        .breakdown-stage {
          padding-left: 32px;
          border-left: 2px solid var(--border-glass);
          transition: border-color 0.3s;
        }

        .breakdown-stage:hover {
          border-left-color: var(--accent-primary);
        }

        .stage-title {
          font-family: var(--font-mono);
          font-size: 0.85rem;
          color: var(--accent-primary);
          margin-bottom: 12px;
          text-transform: uppercase;
        }

        .dataset-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .dataset-row {
          padding: 16px;
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-glass);
          border-radius: 12px;
        }

        .dataset-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text-primary);
          font-family: var(--font-mono);
          font-size: 0.8rem;
          margin-bottom: 4px;
        }

        .dataset-desc { font-size: 0.85rem !important; margin: 0 !important; }

        .flow-console {
          background: #000;
          border-radius: 16px;
          padding: 32px;
          font-family: var(--font-mono);
          font-size: 0.9rem;
          box-shadow: inset 0 2px 10px rgba(0,0,0,0.5);
          border: 1px solid var(--border-strong);
        }

        .console-line {
          margin-bottom: 12px;
          display: flex;
          gap: 16px;
        }

        .c-blue { color: #3b82f6; }
        .c-green { color: #10b981; }
        .c-purple { color: #a855f7; }
        .c-gold { color: #f59e0b; }

        .mt-8 { margin-top: 32px; }
        .mt-6 { margin-top: 24px; }

        @media (max-width: 1024px) {
          .editorial-layout { grid-template-columns: 1fr; }
          .doc-sidebar { display: none; }
          .editorial-title { font-size: 2.5rem; }
        }
      `}</style>
    </div>
  );
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="doc-section">
      <div className="section-header">
        <h2 className="section-h2">{title}</h2>
        <div className="section-divider" />
      </div>
      {children}
    </section>
  );
}

function Capability({ icon: Icon, title, desc }) {
  return (
    <div className="capability-unit">
      <div className="cap-header">
        <Icon size={18} />
        <span>{title}</span>
      </div>
      <p style={{ fontSize: '0.85rem' }}>{desc}</p>
    </div>
  );
}

