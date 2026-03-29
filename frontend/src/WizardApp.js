import { useEffect, useMemo, useRef, useState } from "react";
import api from "./services/api";

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

function formatPercentFromConfidence(conf) {
  if (typeof conf !== "number") return "-";
  return `${(conf * 100).toFixed(1)}%`;
}

function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows) {
  const headers = [
    "taskType",
    "value",
    "entityType",
    "confidence",
    "usGaapConcept",
    "taxonomy",
    "mappingExplanation",
  ];
  const escape = (v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const body = rows.map((r) => [
    escape(r.taskType),
    escape(r.value),
    escape(r.entityType),
    escape(r.confidenceText),
    escape(r.gaapConcept),
    escape(r.taxonomy),
    escape(r.mappingExplanation),
  ]);

  return [headers.join(","), ...body.map((line) => line.join(","))].join("\n");
}

export default function WizardApp() {
  const [step, setStep] = useState("upload"); // upload | processing | results

  const [companyName, setCompanyName] = useState("");
  const [fiscalYear, setFiscalYear] = useState("");
  const [documentType, setDocumentType] = useState("");
  const [file, setFile] = useState(null);

  const [reportId, setReportId] = useState("");
  const [statusData, setStatusData] = useState(null);
  const [processingStartedAt, setProcessingStartedAt] = useState(null);

  const [isUploading, setIsUploading] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [onlyMapped, setOnlyMapped] = useState(true);
  const [search, setSearch] = useState("");
  const [conceptFilter, setConceptFilter] = useState("all");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [selectedRow, setSelectedRow] = useState(null);

  const pollingLockRef = useRef(false);

  const isTerminalStatus =
    statusData?.status === "completed" || statusData?.status === "failed";

  const finclResultSets = useMemo(() => {
    if (!Array.isArray(statusData?.results)) return [];
    return statusData.results.filter((set) => set?.taskType === "FinCL");
  }, [statusData]);

  const rows = useMemo(() => {
    const out = [];
    finclResultSets.forEach((set, setIndex) => {
      const predictions = Array.isArray(set?.results?.predictions)
        ? set.results.predictions
        : [];
      predictions.forEach((pred, predIndex) => {
        const gaapConcept = normalizeGaapConcept(pred?.xbrlTag?.concept);
        const mappingExplanation = pred?.mappingExplanation || "-";
        out.push({
          id: `FinCL-${setIndex}-${predIndex}`,
          taskType: "FinCL",
          value: pred?.value ?? "-",
          entityType: pred?.entityType ?? "-",
          confidence: typeof pred?.confidence === "number" ? pred.confidence : null,
          confidenceText:
            typeof pred?.confidence === "number"
              ? formatPercentFromConfidence(pred.confidence)
              : "-",
          gaapConcept: gaapConcept || "-",
          taxonomy: pred?.xbrlTag?.taxonomy || "-",
          mappingExplanation,
          rawPrediction: pred,
        });
      });
    });
    return out;
  }, [finclResultSets]);

  const uniqueConcepts = useMemo(() => {
    const s = new Set();
    for (const r of rows) {
      if (r.gaapConcept && r.gaapConcept !== "-") s.add(r.gaapConcept);
    }
    return Array.from(s).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => (onlyMapped ? r.gaapConcept !== "-" : true))
      .filter((r) => (conceptFilter === "all" ? true : r.gaapConcept === conceptFilter))
      .filter((r) => {
        if (!q) return true;
        return (
          String(r.value).toLowerCase().includes(q) ||
          String(r.entityType).toLowerCase().includes(q) ||
          String(r.gaapConcept).toLowerCase().includes(q)
        );
      });
  }, [rows, onlyMapped, search, conceptFilter]);

  const progressStage = useMemo(() => {
    if (step === "processing" || step === "results") {
      if (isTerminalStatus) return 3;
      const start = processingStartedAt ? processingStartedAt : Date.now();
      const elapsed = Date.now() - start;
      // 0 = ingest, 1 = finni, 2 = fincl, 3 = done
      if (elapsed < 4500) return 1;
      if (elapsed < 16000) return 2;
      return 2;
    }
    return 0;
  }, [step, processingStartedAt, isTerminalStatus]);

  const progressPercent = useMemo(() => {
    if (isTerminalStatus) return 100;
    const map = { 0: 18, 1: 48, 2: 72, 3: 100 };
    return map[progressStage] ?? 18;
  }, [isTerminalStatus, progressStage]);

  async function refreshStatus({ silent = true } = {}) {
    if (!reportId) return;
    if (isChecking) return;

    setIsChecking(true);
    try {
      const { data } = await api.get(`/status/${reportId}/status`);
      setStatusData(data?.data || null);
      if (!silent) {
        setMessage(data?.data?.message || "Status refreshed.");
      }
    } catch (err) {
      if (!silent) {
        setError(
          err?.response?.data?.message || err?.message || "Could not fetch status."
        );
      }
    } finally {
      setIsChecking(false);
    }
  }

  async function loadResults() {
    if (!reportId) return;
    setIsChecking(true);
    try {
      const { data } = await api.get(`/reports/${reportId}`);
      setStatusData((prev) => ({
        ...(prev || {}),
        results: data?.data || null,
        status: prev?.status || "completed",
      }));
      setMessage(data?.message || "Results loaded.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not load results.");
    } finally {
      setIsChecking(false);
    }
  }

  useEffect(() => {
    if (step !== "processing") return;
    if (!reportId) return;

    pollingLockRef.current = false;
    const timer = setInterval(async () => {
      if (pollingLockRef.current) return;
      pollingLockRef.current = true;
      try {
        await refreshStatus({ silent: true });
      } finally {
        pollingLockRef.current = false;
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [step, reportId]);

  useEffect(() => {
    if (step !== "processing") return;
    if (!isTerminalStatus) return;
    (async () => {
      setMessage("Processing finished. Loading results…");
      await loadResults();
      setStep("results");
    })();
  }, [isTerminalStatus, step]);

  async function uploadAndAnalyze() {
    setError("");
    setMessage("");
    if (!file) {
      setError("Please choose a financial document to upload.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("companyName", companyName);
      formData.append("fiscalYear", fiscalYear);
      formData.append("documentType", documentType);

      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const nextId = data?.data?.id || "";
      setReportId(nextId);
      setStatusData({ status: "uploaded" });
      setProcessingStartedAt(Date.now());
      setSelectedRow(null);
      setStep("processing");
      setMessage(data?.message || "Upload successful. Starting analysis…");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  }

  function resetToUpload() {
    setStep("upload");
    setReportId("");
    setStatusData(null);
    setProcessingStartedAt(null);
    setSelectedRow(null);
    setMessage("");
    setError("");
    setOnlyMapped(true);
    setSearch("");
    setConceptFilter("all");
  }

  function onFileDrop(e) {
    e.preventDefault();
    const dropped = e.dataTransfer?.files?.[0];
    if (dropped) setFile(dropped);
  }

  return (
    <main className="wizardPage">
      <header className="wizardHero">
        <div className="wizardHeroLeft">
          <div className="logo-mark">F</div>
          <div>
            <div className="wizardTitle">FinTagging</div>
            <div className="wizardSubtitle">
              Upload financial documents and get <strong>US-GAAP mapped</strong> entities with a modern processing workflow.
            </div>
          </div>
        </div>
        <div className="wizardHeroRight">
          <div className="stepBadge">
            {step === "upload" && "Step 1 • Upload"}
            {step === "processing" && "Step 2 • Processing"}
            {step === "results" && "Step 3 • Results"}
          </div>
        </div>
      </header>

      <section className="wizardGrid">
        <aside className="wizardSidebar">
          <div className="wizardStep">
            <div className={`wizardDot ${step === "upload" ? "active" : ""}`} />
            <div className="wizardStepText">Upload</div>
          </div>
          <div className="wizardStep">
            <div className={`wizardDot ${step === "processing" ? "active" : ""}`} />
            <div className="wizardStepText">Processing</div>
          </div>
          <div className="wizardStep">
            <div className={`wizardDot ${step === "results" ? "active" : ""}`} />
            <div className="wizardStepText">Results</div>
          </div>
          <div className="wizardSidebarFooter">
            <div className="wizardSidebarHint">
              {reportId ? (
                <>
                  Report: <span className="mono">{reportId}</span>
                </>
              ) : (
                "No report yet."
              )}
            </div>
          </div>
        </aside>

        <section className="wizardMain">
          {step === "upload" && (
            <div className="wizardCard animate-in">
              <div className="wizardCardHead">
                <div className="wizardCardTitle">Upload your document</div>
                <div className="wizardCardSub">
                  Drag & drop or browse a PDF, HTML, DOC, or DOCX.
                </div>
              </div>

              <div
                className="dropzone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={onFileDrop}
              >
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
                <div className="dropzoneInner">
                  <div className="dropIcon" aria-hidden="true" />
                  <div>
                    <div className="dropTitle">
                      {file ? "File selected" : "Drop file to start"}
                    </div>
                    <div className="dropSub">
                      {file ? (
                        <>
                          <span className="mono">{file.name}</span>
                        </>
                      ) : (
                        "Supported: PDF, HTML, DOC, DOCX"
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="wizardFormGrid">
                <label>
                  Company name
                  <input
                    placeholder="e.g. Acme Corp"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </label>
                <label>
                  Fiscal year
                  <input
                    placeholder="e.g. 2024"
                    value={fiscalYear}
                    onChange={(e) => setFiscalYear(e.target.value)}
                  />
                </label>
                <label className="span2">
                  Document type
                  <input
                    placeholder="e.g. Annual report, 10-K"
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                  />
                </label>
              </div>

              <div className="wizardActions">
                <button className="btn-primary wizardBtn" onClick={uploadAndAnalyze} disabled={isUploading}>
                  {isUploading ? "Uploading…" : "Upload & start analysis"}
                </button>
                <button className="btn-ghost wizardBtn" onClick={() => setFile(null)} disabled={!file}>
                  Clear file
                </button>
              </div>

              {message && <div className="toast ok">{message}</div>}
              {error && <div className="toast err">{error}</div>}
            </div>
          )}

          {step === "processing" && (
            <div className="wizardCard animate-in">
              <div className="wizardCardHead">
                <div className="wizardCardTitle">Processing pipeline</div>
                <div className="wizardCardSub">
                  Extracting figures, then linking them to US-GAAP concepts.
                </div>
              </div>

              <div className="timeline">
                <div className={`timelineStep ${progressStage >= 1 ? "done" : ""}`}>
                  <div className="timelineIdx">1</div>
                  <div className="timelineText">
                    <div className="timelineTitle">Ingest document</div>
                    <div className="timelineSub">Upload + preprocessing</div>
                  </div>
                </div>
                <div className={`timelineStep ${progressStage >= 2 ? "done" : ""}`}>
                  <div className="timelineIdx">2</div>
                  <div className="timelineText">
                    <div className="timelineTitle">FinNI extraction</div>
                    <div className="timelineSub">Extract values & entity hints</div>
                  </div>
                </div>
                <div className={`timelineStep ${progressStage >= 3 ? "done" : ""}`}>
                  <div className="timelineIdx">3</div>
                  <div className="timelineText">
                    <div className="timelineTitle">FinCL linking</div>
                    <div className="timelineSub">Map entities to US-GAAP</div>
                  </div>
                </div>
              </div>

              <div className="wizardProgressBlock">
                <div className="wizardProgressTop">
                  <div className="status-label">Status</div>
                  <div className={`status-pill status-${statusData?.status || "uploaded"}`}>
                    {statusData?.status || "uploaded"}
                  </div>
                </div>
                <div className="wizardProgressBar">
                  <div
                    className={`wizardProgressFill ${statusData?.status === "processing" ? "is-processing" : ""}`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="wizardProgressFoot">
                  <div>{progressPercent}%</div>
                  {statusData?.status === "processing" && (
                    <div className="dots" aria-label="processing">
                      <i />
                      <i />
                      <i />
                    </div>
                  )}
                </div>
              </div>

              <div className="wizardInfo">
                {reportId && (
                  <div>
                    Report ID: <span className="mono">{reportId}</span>
                  </div>
                )}
              </div>

              {(message || error) && (
                <div className="wizardToastRow">
                  {message && <div className="toast ok">{message}</div>}
                  {error && <div className="toast err">{error}</div>}
                </div>
              )}
            </div>
          )}

          {step === "results" && (
            <div className="wizardResults animate-in">
              <div className="wizardResultsTop">
                <div>
                  <div className="wizardCardTitle">US-GAAP mapped results</div>
                  <div className="wizardCardSub">
                    Table view only shows FinCL (US-GAAP linked) entities.
                  </div>
                </div>
                <div className="wizardResultsActions">
                  <button className="btn-ghost wizardBtn" onClick={resetToUpload}>
                    New upload
                  </button>
                </div>
              </div>

              <div className="resultsToolbar">
                <label className="toggle">
                  <input
                    type="checkbox"
                    checked={onlyMapped}
                    onChange={(e) => setOnlyMapped(e.target.checked)}
                  />
                  Only mapped
                </label>

                <input
                  className="toolbarSearch"
                  placeholder="Search value / entity / concept"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />

                <select
                  className="toolbarSelect"
                  value={conceptFilter}
                  onChange={(e) => setConceptFilter(e.target.value)}
                >
                  <option value="all">All concepts</option>
                  {uniqueConcepts.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>

                <button
                  className="btn-primary wizardBtn"
                  onClick={() => {
                    const csv = toCsv(filteredRows);
                    downloadText(`fintagging-results-${reportId || "report"}.csv`, csv);
                  }}
                  disabled={filteredRows.length === 0}
                >
                  Export CSV
                </button>
              </div>

              <div className="resultsBody">
                <div className="tableWrap2">
                  {filteredRows.length > 0 ? (
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th>Entity</th>
                          <th>Value</th>
                          <th>Taxonomy</th>
                          <th>Confidence</th>
                          <th>US-GAAP Concept</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRows.map((r) => (
                          <tr
                            key={r.id}
                            className={selectedRow?.id === r.id ? "selected" : ""}
                            onClick={() => setSelectedRow(r)}
                          >
                            <td>{r.entityType}</td>
                            <td className="mono">{r.value}</td>
                            <td>{r.taxonomy}</td>
                            <td>{r.confidenceText}</td>
                            <td>{r.gaapConcept}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="empty-state">
                      <p>
                        No rows match your filters. Try turning off{" "}
                        <strong>Only mapped</strong>.
                      </p>
                    </div>
                  )}
                </div>

                <aside className="detailDrawer">
                  {selectedRow ? (
                    <div className="drawerInner">
                      <div className="drawerHead">
                        <div className="drawerTitle">Entity details</div>
                        <button className="btn-ghost" onClick={() => setSelectedRow(null)}>
                          Close
                        </button>
                      </div>
                      <div className="drawerRow">
                        <div className="drawerLabel">Value</div>
                        <div className="drawerValue mono">{selectedRow.value}</div>
                      </div>
                      <div className="drawerRow">
                        <div className="drawerLabel">Entity Type</div>
                        <div className="drawerValue">{selectedRow.entityType}</div>
                      </div>
                      <div className="drawerRow">
                        <div className="drawerLabel">Confidence</div>
                        <div className="drawerValue">{selectedRow.confidenceText}</div>
                      </div>
                      <div className="drawerRow">
                        <div className="drawerLabel">US-GAAP Concept</div>
                        <div className="drawerValue">{selectedRow.gaapConcept}</div>
                      </div>
                      <div className="drawerRow">
                        <div className="drawerLabel">Mapping explanation</div>
                        <div className="drawerValue">{selectedRow.mappingExplanation}</div>
                      </div>

                      <details className="drawerJson">
                        <summary>Raw prediction JSON</summary>
                        <pre>{JSON.stringify(selectedRow.rawPrediction, null, 2)}</pre>
                      </details>
                    </div>
                  ) : (
                    <div className="drawerEmpty">
                      Click a row to inspect its mapping details.
                    </div>
                  )}
                </aside>
              </div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

