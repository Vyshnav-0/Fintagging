import React, { createContext, useContext, useState, useMemo, useEffect, useRef } from 'react';
import api from '../services/api';

const StatusContext = createContext();

export const StatusProvider = ({ children }) => {
  const [reportId, setReportId] = useState("");
  const [statusData, setStatusData] = useState(null);
  const [processingStartedAt, setProcessingStartedAt] = useState(null);
  const [metadata, setMetadata] = useState({ companyName: '', fiscalYear: '', documentType: '' });
  const pollingLockRef = useRef(false);

  const isTerminalStatus =
    statusData?.status === "completed" || statusData?.status === "failed";

  const refreshStatus = async ({ silent = true } = {}) => {
    if (!reportId) return;
    try {
      const { data } = await api.get(`/status/${reportId}/status`);
      setStatusData(data?.data || null);
    } catch (err) {
      console.error("Status check failed", err);
    }
  };

  const loadResults = async () => {
    if (!reportId) return;
    try {
      const { data } = await api.get(`/reports/${reportId}`);
      setStatusData((prev) => ({
        ...(prev || {}),
        results: data?.data || null,
        status: prev?.status || "completed",
      }));
    } catch (err) {
      console.error("Load results failed", err);
    }
  };

  const resetAll = () => {
    setReportId("");
    setStatusData(null);
    setProcessingStartedAt(null);
    setMetadata({ companyName: '', fiscalYear: '', documentType: '' });
  };

  const value = {
    reportId, setReportId,
    statusData, setStatusData,
    processingStartedAt, setProcessingStartedAt,
    metadata, setMetadata,
    isTerminalStatus,
    refreshStatus,
    loadResults,
    resetAll
  };

  return <StatusContext.Provider value={value}>{children}</StatusContext.Provider>;
};

export const useStatus = () => useContext(StatusContext);
