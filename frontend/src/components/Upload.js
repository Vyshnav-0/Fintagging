import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FileUp, Info, Building2, Calendar, FileText, XCircle } from 'lucide-react';
import { useStatus } from '../context/StatusContext';
import api from '../services/api';

const Upload = () => {
  const navigate = useNavigate();
  const { setReportId, setStatusData, setProcessingStartedAt, metadata, setMetadata } = useStatus();
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first.');
      return;
    }
    setError('');
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("companyName", metadata.companyName);
      formData.append("fiscalYear", metadata.fiscalYear);
      formData.append("documentType", metadata.documentType);

      const { data } = await api.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setReportId(data?.data?.id);
      setStatusData({ status: "uploaded" });
      setProcessingStartedAt(Date.now());
      navigate('/processing');
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="upload-page glass-card premium-card">
      <div className="premium-card-header">
        <h2>Document Ingestion</h2>
        <p>Upload your financial statements to initiate US-GAAP mapping</p>
      </div>

      <div className="upload-grid">
        <div className="upload-main">
          <div 
            className={`drop-zone ${file ? 'has-file' : ''}`}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault();
              const dropped = e.dataTransfer.files[0];
              if (dropped) setFile(dropped);
            }}
          >
            <input 
              type="file" 
              id="file-upload" 
              onChange={handleFileChange} 
              hidden 
              accept=".pdf,.html,.doc,.docx"
            />
            <label htmlFor="file-upload" className="drop-zone-inner">
              <div className="drop-orb">
                <FileUp size={32} color={file ? '#10b981' : '#6366f1'} />
              </div>
              <h3>{file ? 'File Selected' : 'Drop financial document here'}</h3>
              <p>{file ? file.name : 'Supported formats: PDF, HTML, DOC, DOCX'}</p>
              {file && (
                <button 
                  className="clear-file" 
                  onClick={e => { e.preventDefault(); setFile(null); }}
                >
                  <XCircle size={16} /> Remove
                </button>
              )}
            </label>
          </div>
        </div>

        <div className="upload-fields">
          <div className="field-group">
            <label className="premium-label">
              <Building2 size={14} /> Company Name
            </label>
            <input 
              className="premium-input" 
              placeholder="e.g. Microsoft Corporation"
              value={metadata.companyName}
              onChange={e => setMetadata({ ...metadata, companyName: e.target.value })}
            />
          </div>

          <div className="field-row">
            <div className="field-group">
              <label className="premium-label">
                <Calendar size={14} /> Fiscal Year
              </label>
              <input 
                className="premium-input" 
                placeholder="2024"
                value={metadata.fiscalYear}
                onChange={e => setMetadata({ ...metadata, fiscalYear: e.target.value })}
              />
            </div>
            <div className="field-group">
              <label className="premium-label">
                <FileText size={14} /> Document Type
              </label>
              <input 
                className="premium-input" 
                placeholder="10-K, 10-Q"
                value={metadata.documentType}
                onChange={e => setMetadata({ ...metadata, documentType: e.target.value })}
              />
            </div>
          </div>

          <button 
            className="premium-button full-width" 
            onClick={handleUpload}
            disabled={isUploading || !file}
          >
            {isUploading ? 'Initializing...' : 'Start Intelligence Analysis'}
          </button>

          {error && <div className="error-badge">{error}</div>}
          
          <div className="info-block">
            <Info size={14} />
            <p>Our AI will automatically detect data types and link values to the official US-GAAP taxonomy.</p>
          </div>
        </div>
      </div>

      <style>{`
        .upload-page {
          padding: 40px;
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .premium-card-header h2 {
          font-size: 1.75rem;
          margin: 0;
          font-weight: 700;
        }

        .premium-card-header p {
          color: var(--text-secondary);
          margin: 8px 0 0 0;
        }

        .upload-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 40px;
        }

        .drop-zone {
          height: 100%;
          min-height: 380px;
          border: 2px dashed rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          background: rgba(15, 23, 42, 0.4);
          transition: all 0.3s;
          position: relative;
        }

        .drop-zone:hover {
          border-color: var(--accent-primary);
          background: rgba(99, 102, 241, 0.05);
        }

        .drop-zone.has-file {
          border-color: var(--accent-secondary);
          background: rgba(16, 185, 129, 0.03);
          border-style: solid;
        }

        .drop-zone-inner {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          text-align: center;
          padding: 24px;
        }

        .drop-orb {
          width: 80px;
          height: 80px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid var(--border-glass);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 24px;
          transition: transform 0.3s ease;
        }

        .drop-zone:hover .drop-orb {
          transform: scale(1.1) rotate(5deg);
        }

        .drop-zone-inner h3 {
          font-size: 1.25rem;
          margin: 0;
          font-weight: 600;
        }

        .drop-zone-inner p {
          color: var(--text-secondary);
          margin: 8px 0 0 0;
          font-size: 0.875rem;
        }

        .clear-file {
          margin-top: 16px;
          background: rgba(220, 38, 38, 0.1);
          color: #fca5a5;
          border: 1px solid rgba(220, 38, 38, 0.2);
          padding: 4px 12px;
          border-radius: 8px;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 4px;
          cursor: pointer;
        }

        .upload-fields {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .field-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .field-group label {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .premium-button.full-width {
          width: 100%;
          height: 52px;
          margin-top: 8px;
        }

        .error-badge {
          background: rgba(220, 38, 38, 0.1);
          border-left: 3px solid #dc2626;
          padding: 12px 16px;
          border-radius: 8px;
          color: #fca5a5;
          font-size: 0.875rem;
        }

        .info-block {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid var(--border-glass);
          padding: 16px;
          border-radius: 16px;
          display: flex;
          gap: 12px;
          color: var(--text-secondary);
          font-size: 0.8125rem;
          line-height: 1.5;
        }

        @media (max-width: 900px) {
          .upload-grid {
            grid-template-columns: 1fr;
          }
          .upload-page {
            padding: 24px;
          }
        }
      `}</style>
    </div>
  );
};

export default Upload;
