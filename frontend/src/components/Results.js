import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, Search, Filter, ArrowLeft, ChevronRight, 
  ExternalLink, Info, CheckCircle2, ChevronDown 
} from 'lucide-react';
import { useStatus } from '../context/StatusContext';

function normalizeGaapConcept(raw) {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;
  const fixedPrefix = value
    .replace(/^us[_-]?gaap[:\s-]?/i, "us-gaap:")
    .replace(/^us-gaap(?=[A-Z])/i, "us-gaap:");
  if (/^us-gaap:/i.test(fixedPrefix)) {
    return fixedPrefix.replace(/^us-gaap:/i, "us-gaap:");
  }
  return null;
}

function formatPercent(conf) {
  if (typeof conf !== "number") return "-";
  return `${(conf * 100).toFixed(1)}%`;
}

const Results = () => {
  const navigate = useNavigate();
  const { reportId, statusData, resetAll } = useStatus();
  
  const [search, setSearch] = useState("");
  const [selectedRow, setSelectedRow] = useState(null);
  const [onlyMapped, setOnlyMapped] = useState(true);

  const hasResults = Boolean(reportId && statusData?.results);

  useEffect(() => {
    if (hasResults) return;
    if (reportId && statusData?.status === 'processing') {
      navigate('/processing', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [hasResults, reportId, statusData?.status, navigate]);

  const rows = useMemo(() => {
    const out = [];
    const finclResultSets = (statusData?.results || []).filter(s => s?.taskType === "FinCL");
    
    finclResultSets.forEach((set, setIndex) => {
      const predictions = set?.results?.predictions || [];
      predictions.forEach((pred, predIndex) => {
        const gaapConcept = normalizeGaapConcept(pred?.xbrlTag?.concept);
        out.push({
          id: `FinCL-${setIndex}-${predIndex}`,
          entityType: pred?.entityType ?? "-",
          value: pred?.value ?? "-",
          confidence: formatPercent(pred?.confidence),
          gaapConcept: gaapConcept || "-",
          taxonomy: pred?.xbrlTag?.taxonomy || "-",
          mappingExplanation: pred?.mappingExplanation || "-",
          rawPrediction: pred
        });
      });
    });
    return out;
  }, [statusData?.results]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (onlyMapped && r.gaapConcept === "-") return false;
      if (!q) return true;
      return (
        r.value.toLowerCase().includes(q) ||
        r.entityType.toLowerCase().includes(q) ||
        r.gaapConcept.toLowerCase().includes(q)
      );
    });
  }, [rows, search, onlyMapped]);

  if (!hasResults) {
    return null;
  }

  const downloadCsv = () => {
    const headers = ["Entity Type", "Value", "Confidence", "US-GAAP Concept", "Taxonomy"];
    const csvContent = [
      headers.join(","),
      ...filteredRows.map(r => [
        `"${r.entityType}"`,
        `"${r.value}"`,
        `"${r.confidence}"`,
        `"${r.gaapConcept}"`,
        `"${r.taxonomy}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analysis_results_${reportId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="results-page">
      <div className="results-toolbar-v2">
        <div className="toolbar-left">
          <button className="back-nav-btn" onClick={() => { resetAll(); navigate('/'); }}>
            <ArrowLeft size={16} /> New Upload
          </button>
          <h2>Semantic Mapping Results</h2>
        </div>

        <div className="toolbar-right">
          <div className="search-pill">
            <Search size={16} />
            <input 
              placeholder="Search concepts or values..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="premium-button" onClick={downloadCsv}>
            <Download size={18} /> Export Data
          </button>
        </div>
      </div>

      <div className="results-content-v2">
        <div className="table-container-v2 glass-card">
          <div className="table-meta-bar">
            <div className="count-badge">
              {filteredRows.length} Entities Found
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={onlyMapped} 
                onChange={e => setOnlyMapped(e.target.checked)} 
              />
              <span className="slider" />
              <span className="label-text">Only mapped to US-GAAP</span>
            </label>
          </div>

          <table className="premium-table">
            <thead>
              <tr>
                <th>Entity Type</th>
                <th>Literal Value</th>
                <th>Confidence</th>
                <th>US-GAAP Concept</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filteredRows.map(r => (
                <tr 
                  key={r.id} 
                  className={selectedRow?.id === r.id ? 'selected' : ''}
                  onClick={() => setSelectedRow(r)}
                >
                  <td className="entity-cell">
                    <span className="type-pill">{r.entityType}</span>
                  </td>
                  <td className="value-cell mono">{r.value}</td>
                  <td className="conf-cell">
                    <div className="conf-bar-wrap">
                      <div className="conf-bar" style={{ width: r.confidence }} />
                      <span>{r.confidence}</span>
                    </div>
                  </td>
                  <td className="concept-cell">
                    {r.gaapConcept !== "-" ? (
                      <div className="mapping-link">
                        <CheckCircle2 size={14} className="tick" />
                        <span>{r.gaapConcept}</span>
                      </div>
                    ) : (
                      <span className="no-mapping">N/A</span>
                    )}
                  </td>
                  <td className="action-cell">
                    <ChevronRight size={16} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredRows.length === 0 && (
            <div className="empty-table-state">
              <Info size={40} />
              <h3>No results found</h3>
              <p>Adjust your search filters or check the "Only mapped" toggle.</p>
            </div>
          )}
        </div>

        <AnimatePresence>
          {selectedRow && (
            <motion.aside 
              className="detail-inspector-v2 glass-card"
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
            >
              <div className="inspector-header">
                <h3>Entity Intelligence</h3>
                <button className="close-btn" onClick={() => setSelectedRow(null)}>
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="inspector-body">
                <div className="info-card-mono">
                  <label>RAW VALUE</label>
                  <div className="value">{selectedRow.value}</div>
                </div>

                <div className="info-grid">
                  <div className="info-item">
                    <label>Entity Category</label>
                    <p>{selectedRow.entityType}</p>
                  </div>
                  <div className="info-item">
                    <label>Confidence Score</label>
                    <p>{selectedRow.confidence}</p>
                  </div>
                </div>

                <div className="info-item">
                  <label>Linked Concept</label>
                  <div className="concept-box">
                    {selectedRow.gaapConcept}
                    <ExternalLink size={14} />
                  </div>
                </div>

                <div className="info-item highlight">
                  <label>Mapping Rationale</label>
                  <p>{selectedRow.mappingExplanation}</p>
                </div>

                <div className="json-inspector">
                  <div className="json-header">
                    <span>Provenance JSON</span>
                  </div>
                  <pre>{JSON.stringify(selectedRow.rawPrediction, null, 2)}</pre>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .results-page {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .results-toolbar-v2 {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 24px;
        }

        .toolbar-left {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .toolbar-left h2 {
          font-size: 1.75rem;
          margin: 0;
          font-weight: 800;
        }

        .back-nav-btn {
          background: transparent;
          border: none;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.8125rem;
          cursor: pointer;
          padding: 0;
          transition: color 0.2s;
        }

        .back-nav-btn:hover {
          color: white;
        }

        .toolbar-right {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .search-pill {
          background: rgba(15, 23, 42, 0.4);
          border: 1px solid var(--border-glass);
          border-radius: 12px;
          display: flex;
          align-items: center;
          padding: 8px 16px;
          gap: 12px;
          color: var(--text-muted);
          width: 300px;
        }

        .search-pill input {
          background: transparent;
          border: none;
          color: white;
          width: 100%;
          font-size: 0.875rem;
          outline: none;
        }

        .results-content-v2 {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
          position: relative;
        }

        .table-container-v2 {
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .table-meta-bar {
          padding: 20px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-glass);
        }

        .count-badge {
          background: rgba(99, 102, 241, 0.1);
          color: var(--accent-primary);
          padding: 4px 12px;
          border-radius: 999px;
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .premium-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }

        .premium-table th {
          padding: 16px 24px;
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          font-weight: 700;
          border-bottom: 1px solid var(--border-glass);
        }

        .premium-table td {
          padding: 16px 24px;
          font-size: 0.875rem;
          border-bottom: 1px solid var(--border-glass);
          cursor: pointer;
          transition: background 0.2s;
        }

        .premium-table tr:hover td {
          background: rgba(255, 255, 255, 0.02);
        }

        .premium-table tr.selected td {
          background: rgba(99, 102, 241, 0.05);
          color: white;
        }

        .type-pill {
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 10px;
          border-radius: 8px;
          font-size: 0.75rem;
          color: var(--text-secondary);
        }

        .conf-bar-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .conf-bar {
          height: 6px;
          background: linear-gradient(90deg, var(--accent-primary), var(--accent-secondary));
          border-radius: 3px;
          opacity: 0.6;
        }

        .mapping-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--accent-secondary);
        }

        .no-mapping {
          color: var(--text-muted);
        }

        .empty-table-state {
          padding: 80px 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: var(--text-muted);
        }

        /* Toggle Slider */
        .toggle-switch {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }

        .toggle-switch input { display: none; }
        .slider {
          width: 36px;
          height: 20px;
          background: rgba(255,255,255,0.1);
          border-radius: 10px;
          position: relative;
          transition: 0.3s;
        }
        .slider::before {
          content: "";
          position: absolute;
          width: 14px; height: 14px;
          left: 3px; top: 3px;
          background: white;
          border-radius: 50%;
          transition: 0.3s;
        }
        input:checked + .slider { background: var(--accent-primary); }
        input:checked + .slider::before { transform: translateX(16px); }
        .label-text { font-size: 0.8125rem; color: var(--text-secondary); }

        /* Detail Inspector */
        .detail-inspector-v2 {
          position: fixed;
          top: 100px;
          right: 24px;
          bottom: 24px;
          width: 420px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          background: rgba(15, 23, 42, 0.95);
          overflow: hidden;
          box-shadow: -20px 0 40px rgba(0,0,0,0.4);
        }

        .inspector-header {
          padding: 24px;
          border-bottom: 1px solid var(--border-glass);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .inspector-header h3 { margin: 0; font-size: 1.125rem; }
        .close-btn { background: none; border: none; color: white; cursor: pointer; }

        .inspector-body {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .info-card-mono {
          background: #000;
          padding: 20px;
          border-radius: 16px;
          border: 1px solid var(--border-glass);
        }

        .info-card-mono label { font-size: 0.6875rem; color: var(--text-muted); display: block; margin-bottom: 8px; font-weight: 700;; }
        .info-card-mono .value { font-family: var(--font-mono); font-size: 1.125rem; word-break: break-all; }

        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .info-item label { font-size: 0.75rem; color: var(--text-muted); display: block; margin-bottom: 6px; }
        .info-item p { margin: 0; font-weight: 600; font-size: 0.9375rem; }

        .concept-box {
          background: rgba(99, 102, 241, 0.1);
          color: var(--accent-primary);
          padding: 12px 16px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.875rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }

        .info-item.highlight p { color: var(--text-secondary); font-weight: 400; line-height: 1.6; }

        .json-inspector {
          margin-top: auto;
        }

        .json-header {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        pre {
          background: rgba(0,0,0,0.3);
          padding: 16px;
          border-radius: 12px;
          font-family: var(--font-mono);
          font-size: 0.75rem;
          margin: 0;
          color: #a5b4fc;
          overflow-x: auto;
        }

        @media (max-width: 1200px) {
          .detail-inspector-v2 { width: 100%; right: 0; top: 0; bottom: 0; border-radius: 0; }
        }
      `}</style>
    </div>
  );
};

export default Results;
