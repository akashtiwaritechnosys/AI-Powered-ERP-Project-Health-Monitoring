"use client";

import React, { useState, useEffect } from "react";

// Types matching the Prisma DB schema
interface Task {
  id: string;
  projectId: string;
  title: string;
  completionPercentage: number;
  startDate: string;
  endDate: string;
  isCritical: boolean;
  priority: string;
  assignee: string;
}

interface HealthLog {
  id: string;
  projectId: string;
  timestamp: string;
  healthScore: number;
  healthStatus: string;
  aiReason: string;
  aiRisks: string; // JSON string representation
  aiSuggestions: string; // JSON string representation
}

interface AlertLog {
  id: string;
  projectId: string;
  timestamp: string;
  statusFrom: string;
  statusTo: string;
  recipients: string;
  channel: string;
  message: string;
  success: boolean;
}

interface Project {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  expectedProgress: number;
  actualProgress: number;
  healthScore: number;
  healthStatus: string;
  managerEmail: string;
  lastSynced: string;
  projectType?: string;
  isActive?: string;
  percentCompleteMethod?: string;
  priority?: string;
  department?: string;
  tasks?: Task[];
  healthLogs?: HealthLog[];
  alertLogs?: AlertLog[];
}

interface Config {
  thresholdWarning: number;
  thresholdCritical: number;
  weightOverdueTask: number;
  weightCriticalOverdue: number;
  weightMilestoneDelay: number;
  weightProgressVariance: number;
  emailAdmin: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  slackWebhookUrl: string;
  aiPromptTemplate: string;
}

const BACKEND_URL = "http://localhost:5000";

// Custom SVG Icons
const RefreshIcon = ({ className = "w-5 h-5", ...props }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.213 6M16 3.5a9 9 0 011 4.5" />
  </svg>
);

const SettingsIcon = ({ className = "w-5 h-5", ...props }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ShieldIcon = ({ className = "w-5 h-5", ...props }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const WarningIcon = ({ className = "w-5 h-5", ...props }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const InfoIcon = ({ className = "w-5 h-5", ...props }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChevronRight = ({ className = "w-5 h-5", ...props }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const HomeIcon = ({ className = "w-5 h-5", ...props }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const CloseIcon = ({ className = "w-6 h-6", ...props }: any) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const safeJsonParse = (str: string | null | undefined, fallback: any = []): any => {
  if (!str) return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.error("JSON parse error:", e, str);
    return fallback;
  }
};

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [detailedProject, setDetailedProject] = useState<Project | null>(null);
  const [config, setConfig] = useState<Config | null>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "settings">("dashboard");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  
  // Settings Form State
  const [settingsForm, setSettingsForm] = useState<Config>({
    thresholdWarning: 80,
    thresholdCritical: 60,
    weightOverdueTask: 5,
    weightCriticalOverdue: 10,
    weightMilestoneDelay: 15,
    weightProgressVariance: 20,
    emailAdmin: "admin@company.com",
    smtpHost: "smtp.mailtrap.io",
    smtpPort: 2525,
    smtpUser: "",
    smtpPass: "",
    slackWebhookUrl: "",
    aiPromptTemplate: "",
  });

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const projectsRes = await fetch(`${BACKEND_URL}/api/projects`);
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData);
      }
      
      const configRes = await fetch(`${BACKEND_URL}/api/config`);
      if (configRes.ok) {
        const configData = await configRes.json();
        setConfig(configData);
        setSettingsForm(configData);
      }
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
      triggerToast("Failed to connect to backend middleware!");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setIsMounted(true);
    loadData();
  }, []);

  const loadProjectDetails = async (id: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/projects/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailedProject(data);
      }
    } catch (err) {
      console.error("Failed to fetch project details:", err);
      triggerToast("Failed to fetch project details.");
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectDetails(selectedProjectId);
    } else {
      setDetailedProject(null);
    }
  }, [selectedProjectId]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncLogs([]);
    try {
      const res = await fetch(`${BACKEND_URL}/api/sync`, { method: "POST" });
      if (res.ok) {
        const result = await res.json();
        if (result.success) {
          triggerToast("ERP Synced and Project Health recalculated!");
          setSyncLogs(result.details);
          loadData();
          if (selectedProjectId) {
            loadProjectDetails(selectedProjectId);
          }
        } else {
          triggerToast("ERP Sync failed. Check logs.");
          setSyncLogs(result.details);
        }
      }
    } catch (err) {
      triggerToast("Sync request failed. Server offline?");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${BACKEND_URL}/api/config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settingsForm),
      });

      if (res.ok) {
        const updatedConfig = await res.json();
        setConfig(updatedConfig);
        triggerToast("Configuration settings updated!");
        // Re-assess projects with new weights
        handleSync();
      }
    } catch (err) {
      triggerToast("Failed to update settings.");
    }
  };

  // Helper calculation
  const getOverviewMetrics = () => {
    const total = projects.length;
    if (total === 0) return { healthy: 0, warning: 0, critical: 0, avgScore: 0, avgProg: 0 };
    
    const healthy = projects.filter((p) => p.healthStatus === "HEALTHY").length;
    const warning = projects.filter((p) => p.healthStatus === "WARNING").length;
    const critical = projects.filter((p) => p.healthStatus === "CRITICAL").length;
    const avgScore = Math.round(projects.reduce((s, p) => s + p.healthScore, 0) / total);
    const avgProg = Math.round(projects.reduce((s, p) => s + p.actualProgress, 0) / total);

    return { healthy, warning, critical, avgScore, avgProg };
  };

  const metrics = getOverviewMetrics();

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "30px 20px" }}>
      {/* Toast Alert */}
      {toastMessage && (
        <div style={{
          position: "fixed",
          top: "24px",
          right: "24px",
          background: "var(--bg-modal)",
          border: "1px solid var(--border-color-hover)",
          padding: "16px 24px",
          borderRadius: "12px",
          color: "white",
          zIndex: 2000,
          boxShadow: "0 10px 30px rgba(0,0,0,0.5), 0 0 10px var(--primary-glow)",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          fontFamily: "var(--font-outfit)"
        }}>
          <InfoIcon className="w-5 h-5 text-indigo-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "40px",
        borderBottom: "1px solid var(--border-color)",
        paddingBottom: "20px"
      }}>
        <div>
          <h1 className="gradient-text" style={{ fontSize: "2.5rem", marginBottom: "8px" }}>
            Health Monitoring System
          </h1>
          <p style={{ color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="pulse-indicator healthy" />
            AI-Powered ERP Project Health Middleware
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              (API status: Online)
            </span>
          </p>
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`btn-secondary ${activeTab === "dashboard" ? "glow-healthy" : ""}`}
            style={{ borderColor: activeTab === "dashboard" ? "var(--primary)" : "var(--border-color)" }}
          >
            <HomeIcon className="w-5 h-5" /> Dashboard
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`btn-secondary ${activeTab === "settings" ? "glow-warning" : ""}`}
            style={{ borderColor: activeTab === "settings" ? "var(--warning)" : "var(--border-color)" }}
          >
            <SettingsIcon className="w-5 h-5" /> Settings
          </button>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="btn-primary"
          >
            {isSyncing ? <span className="spinner" /> : <RefreshIcon />}
            {isSyncing ? "Syncing ERP..." : "Sync ERP"}
          </button>
        </div>
      </header>

      {/* Dashboard View */}
      {activeTab === "dashboard" && (
        <div>
          {/* Sync status logs */}
          {syncLogs.length > 0 && (
            <div className="glass-panel" style={{ padding: "20px", marginBottom: "30px", background: "rgba(99, 102, 241, 0.05)" }}>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
                <InfoIcon style={{ color: "var(--primary)" }} /> Latest Sync Logs
              </h3>
              <div style={{
                maxHeight: "120px",
                overflowY: "auto",
                fontFamily: "monospace",
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                background: "rgba(0,0,0,0.3)",
                padding: "12px",
                borderRadius: "8px"
              }}>
                {syncLogs.map((log, index) => <div key={index}>{log}</div>)}
              </div>
            </div>
          )}

          {/* Metrics summary */}
          <section className="metric-grid" style={{ marginBottom: "40px" }}>
            <div className="glass-panel" style={{ padding: "24px", position: "relative", overflow: "hidden" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", marginBottom: "8px" }}>
                Portfolio Health Index
              </div>
              <div style={{ fontSize: "2.25rem", fontWeight: "700", fontFamily: "var(--font-outfit)", marginBottom: "4px" }}>
                {metrics.avgScore}/100
              </div>
              <div className="progress-container" style={{ height: "6px" }}>
                <div
                  className="progress-bar"
                  style={{
                    width: `${metrics.avgScore}%`,
                    background: metrics.avgScore >= 80 ? "var(--healthy)" : metrics.avgScore >= 60 ? "var(--warning)" : "var(--critical)"
                  }}
                />
              </div>
            </div>

            <div className="glass-panel glow-healthy" style={{ padding: "24px" }}>
              <div style={{ color: "var(--healthy)", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", marginBottom: "8px" }}>
                Healthy Projects
              </div>
              <div style={{ fontSize: "2.25rem", fontWeight: "700", fontFamily: "var(--font-outfit)" }}>
                {metrics.healthy}
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {projects.length > 0 ? Math.round((metrics.healthy / projects.length) * 100) : 0}% of portfolio
              </span>
            </div>

            <div className="glass-panel glow-warning" style={{ padding: "24px" }}>
              <div style={{ color: "var(--warning)", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", marginBottom: "8px" }}>
                Warning / At Risk
              </div>
              <div style={{ fontSize: "2.25rem", fontWeight: "700", fontFamily: "var(--font-outfit)" }}>
                {metrics.warning}
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {projects.length > 0 ? Math.round((metrics.warning / projects.length) * 100) : 0}% of portfolio
              </span>
            </div>

            <div className="glass-panel glow-critical" style={{ padding: "24px" }}>
              <div style={{ color: "var(--critical)", fontSize: "0.85rem", fontWeight: "600", textTransform: "uppercase", marginBottom: "8px" }}>
                Critical / Unhealthy
              </div>
              <div style={{ fontSize: "2.25rem", fontWeight: "700", fontFamily: "var(--font-outfit)" }}>
                {metrics.critical}
              </div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {projects.length > 0 ? Math.round((metrics.critical / projects.length) * 100) : 0}% of portfolio
              </span>
            </div>
          </section>

          {/* Project List */}
          <h2 style={{ fontSize: "1.75rem", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ color: "var(--primary)" }}>■</span> Projects Portfolio
          </h2>

          {isLoading ? (
            <div style={{ textAlign: "center", padding: "60px", color: "var(--text-muted)" }}>
              <span className="spinner" style={{ marginBottom: "16px" }} /><br/>
              Loading project portfolio...
            </div>
          ) : projects.length === 0 ? (
            <div className="glass-panel" style={{ padding: "50px", textAlign: "center", color: "var(--text-muted)" }}>
              No synced projects found in middleware database. Please trigger a "Sync ERP" sync above!
            </div>
          ) : (
            <div className="dashboard-grid">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className={`glass-panel ${
                    project.healthStatus === "HEALTHY"
                      ? "glow-healthy"
                      : project.healthStatus === "WARNING"
                      ? "glow-warning"
                      : "glow-critical"
                  }`}
                  style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
                >
                  <div style={{ padding: "24px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                      <span className={`status-badge ${project.healthStatus.toLowerCase()}`}>
                        {project.healthStatus}
                      </span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{
                          fontSize: "1.5rem",
                          fontWeight: "700",
                          fontFamily: "var(--font-outfit)",
                          color: project.healthStatus === "HEALTHY" ? "var(--healthy)" : project.healthStatus === "WARNING" ? "var(--warning)" : "var(--critical)"
                        }} className="health-score">
                          {project.healthScore}
                        </span>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>/100</span>
                      </div>
                    </div>

                    <h3 style={{ fontSize: "1.25rem", marginBottom: "8px", fontWeight: "600" }}>{project.name}</h3>
                    <p className="pjt-desc" style={{ color: "var(--text-secondary)", fontSize: "0.88rem", marginBottom: "20px", lineBreak: "auto", minHeight: "3.5rem" }}>
                      {project.description}
                    </p>

                    {/* ERP Metadata Fields */}
                    <div style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "8px 12px",
                      fontSize: "0.8rem",
                      color: "var(--text-secondary)",
                      background: "rgba(255, 255, 255, 0.02)",
                      padding: "10px 12px",
                      borderRadius: "8px",
                      marginBottom: "16px",
                      border: "1px solid rgba(255, 255, 255, 0.04)"
                    }}>
                      <div>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "block" }}>Type</span>
                        <strong style={{ color: "white" }}>{project.projectType || "N/A"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "block" }}>Priority</span>
                        <strong style={{
                          color: project.priority === "High" || project.priority === "HIGH" ? "var(--critical)" :
                                 project.priority === "Medium" || project.priority === "MEDIUM" ? "var(--warning)" :
                                 "var(--healthy)"
                        }}>{project.priority || "Medium"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "block" }}>Department</span>
                        <strong style={{ color: "white" }}>{project.department || "N/A"}</strong>
                      </div>
                      <div>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "block" }}>Is Active</span>
                        <strong style={{
                          color: project.isActive === "Yes" || project.isActive === "Active" ? "var(--healthy)" : "var(--text-muted)"
                        }}>{project.isActive || "Yes"}</strong>
                      </div>
                      <div style={{ gridColumn: "span 2" }}>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "block" }}>Complete Method</span>
                        <strong style={{ color: "white" }}>{project.percentCompleteMethod || "Task Completion"}</strong>
                      </div>
                      <div style={{ gridColumn: "span 2" }}>
                        <span style={{ color: "var(--text-muted)", fontSize: "0.7rem", display: "block" }}>Expected Timeline</span>
                        <strong style={{ color: "white" }}>
                          {isMounted && project.startDate ? new Date(project.startDate).toLocaleDateString() : ""} to {isMounted && project.endDate ? new Date(project.endDate).toLocaleDateString() : ""}
                        </strong>
                      </div>
                    </div>

                    {/* Progress indicator */}
                    <div style={{ marginBottom: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "6px" }}>
                        <span style={{ color: "var(--text-secondary)" }}>Timeline Schedule Mismatch</span>
                        <span>
                          Expected: <strong style={{ color: "#fff" }}>{project.expectedProgress}%</strong> | Actual: <strong style={{
                            color: project.actualProgress >= project.expectedProgress ? "var(--healthy)" : "var(--critical)"
                          }}>{project.actualProgress}%</strong>
                        </span>
                        {/* <span className="percent-completed">{project.percent_complete}</span> */}
                      </div>
                      <div className="progress-container">
                        {/* Actual progress filled */}
                        <div
                          className="progress-bar"
                          style={{
                            width: `${project.actualProgress}%`,
                            background: project.healthStatus === "HEALTHY" ? "var(--healthy)" : project.healthStatus === "WARNING" ? "var(--warning)" : "var(--critical)"
                          }}
                        />
                        {/* Expected progress marker */}
                        <div
                          className="progress-marker"
                          style={{ left: `${project.expectedProgress}%` }}
                          title={`Expected: ${project.expectedProgress}%`}
                        />
                      </div>
                    </div>
                  </div>

                  <div style={{
                    borderTop: "1px solid var(--border-color)",
                    padding: "16px 24px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "rgba(0,0,0,0.15)",
                    borderBottomLeftRadius: "16px",
                    borderBottomRightRadius: "16px"
                  }}>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                      Synced: {isMounted ? new Date(project.lastSynced).toLocaleTimeString() : ""}
                    </span>
                    <button
                      onClick={() => setSelectedProjectId(project.id)}
                      className="btn-secondary"
                      style={{ padding: "6px 12px", fontSize: "0.85rem", borderRadius: "6px" }}
                    >
                      AI Insights <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings View */}
      {activeTab === "settings" && (
        <div className="glass-panel" style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
          <h2 style={{ fontSize: "1.75rem", marginBottom: "24px", display: "flex", alignItems: "center", gap: "10px" }}>
            <SettingsIcon style={{ color: "var(--warning)" }} /> Middleware Configuration
          </h2>
          <p style={{ color: "var(--text-secondary)", marginBottom: "30px", fontSize: "0.95rem" }}>
            Modify rule assessment weights, status thresholds, SMTP credentials, Slack channels, and custom LLM prompts. 
            Saving settings will automatically trigger a sync and recalculate the scores.
          </p>

          <form onSubmit={handleSaveConfig} style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            
            {/* Status thresholds */}
            <div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", color: "#fff" }}>
                1. Status Alert Thresholds
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "8px" }}>
                    Warning Status Threshold (Score Below)
                  </label>
                  <input
                    type="number"
                    value={settingsForm.thresholdWarning}
                    onChange={(e) => setSettingsForm({ ...settingsForm, thresholdWarning: parseInt(e.target.value) })}
                    style={{
                      width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                      background: "rgba(0,0,0,0.3)", color: "white"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "8px" }}>
                    Critical Status Threshold (Score Below)
                  </label>
                  <input
                    type="number"
                    value={settingsForm.thresholdCritical}
                    onChange={(e) => setSettingsForm({ ...settingsForm, thresholdCritical: parseInt(e.target.value) })}
                    style={{
                      width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                      background: "rgba(0,0,0,0.3)", color: "white"
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Deductions weights */}
            <div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", color: "#fff" }}>
                2. Health Engine Deduction Points
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "8px" }}>
                    Overdue Task Deduction (&gt;3 Days Delay)
                  </label>
                  <input
                    type="number"
                    value={settingsForm.weightOverdueTask}
                    onChange={(e) => setSettingsForm({ ...settingsForm, weightOverdueTask: parseInt(e.target.value) })}
                    style={{
                      width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                      background: "rgba(0,0,0,0.3)", color: "white"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "8px" }}>
                    Critical Overdue Task Deduction
                  </label>
                  <input
                    type="number"
                    value={settingsForm.weightCriticalOverdue}
                    onChange={(e) => setSettingsForm({ ...settingsForm, weightCriticalOverdue: parseInt(e.target.value) })}
                    style={{
                      width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                      background: "rgba(0,0,0,0.3)", color: "white"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "8px" }}>
                    Project Missed Due Date Deduction
                  </label>
                  <input
                    type="number"
                    value={settingsForm.weightMilestoneDelay}
                    onChange={(e) => setSettingsForm({ ...settingsForm, weightMilestoneDelay: parseInt(e.target.value) })}
                    style={{
                      width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                      background: "rgba(0,0,0,0.3)", color: "white"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "8px" }}>
                    Variance &gt;20% Deduction
                  </label>
                  <input
                    type="number"
                    value={settingsForm.weightProgressVariance}
                    onChange={(e) => setSettingsForm({ ...settingsForm, weightProgressVariance: parseInt(e.target.value) })}
                    style={{
                      width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                      background: "rgba(0,0,0,0.3)", color: "white"
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Alert systems configuration */}
            <div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", color: "#fff" }}>
                3. Alert Channels & SMTP Server
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "8px" }}>
                    Administrator Email Recipient
                  </label>
                  <input
                    type="email"
                    value={settingsForm.emailAdmin}
                    onChange={(e) => setSettingsForm({ ...settingsForm, emailAdmin: e.target.value })}
                    style={{
                      width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                      background: "rgba(0,0,0,0.3)", color: "white"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "8px" }}>
                    SMTP Host Name
                  </label>
                  <input
                    type="text"
                    value={settingsForm.smtpHost}
                    onChange={(e) => setSettingsForm({ ...settingsForm, smtpHost: e.target.value })}
                    style={{
                      width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                      background: "rgba(0,0,0,0.3)", color: "white"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "8px" }}>
                    SMTP Port
                  </label>
                  <input
                    type="number"
                    value={settingsForm.smtpPort}
                    onChange={(e) => setSettingsForm({ ...settingsForm, smtpPort: parseInt(e.target.value) })}
                    style={{
                      width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                      background: "rgba(0,0,0,0.3)", color: "white"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "8px" }}>
                    SMTP User
                  </label>
                  <input
                    type="text"
                    value={settingsForm.smtpUser}
                    onChange={(e) => setSettingsForm({ ...settingsForm, smtpUser: e.target.value })}
                    style={{
                      width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                      background: "rgba(0,0,0,0.3)", color: "white"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "8px" }}>
                    SMTP Password
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={settingsForm.smtpPass}
                    onChange={(e) => setSettingsForm({ ...settingsForm, smtpPass: e.target.value })}
                    style={{
                      width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                      background: "rgba(0,0,0,0.3)", color: "white"
                    }}
                  />
                </div>
              </div>
              <div>
                <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "8px" }}>
                  Slack Webhook Web URL (Leave blank to mock alerts in console log)
                </label>
                <input
                  type="text"
                  placeholder="https://hooks.slack.com/services/..."
                  value={settingsForm.slackWebhookUrl}
                  onChange={(e) => setSettingsForm({ ...settingsForm, slackWebhookUrl: e.target.value })}
                  style={{
                    width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                    background: "rgba(0,0,0,0.3)", color: "white"
                  }}
                />
              </div>
            </div>

            {/* Prompt template */}
            <div>
              <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", borderBottom: "1px solid var(--border-color)", paddingBottom: "8px", color: "#fff" }}>
                4. AI Prompt Template
              </h3>
              <label style={{ display: "block", color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "8px" }}>
                Prompt Structure (Variables: {"{{projectName}}"}, {"{{healthScore}}"}, {"{{healthStatus}}"}, {"{{tasksSummary}}"})
              </label>
              <textarea
                rows={5}
                value={settingsForm.aiPromptTemplate}
                onChange={(e) => setSettingsForm({ ...settingsForm, aiPromptTemplate: e.target.value })}
                style={{
                  width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid var(--border-color)",
                  background: "rgba(0,0,0,0.3)", color: "white", fontFamily: "monospace", fontSize: "0.85rem", resize: "vertical"
                }}
              />
            </div>

            {/* Save Buttons */}
            <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "20px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                onClick={() => {
                  if (config) setSettingsForm(config);
                  setActiveTab("dashboard");
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn-primary">
                Save & Apply Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Details modal */}
      {selectedProjectId && (
        <div className="modal-overlay" onClick={() => setSelectedProjectId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "24px",
              borderBottom: "1px solid var(--border-color)",
              position: "sticky",
              top: 0,
              background: "var(--bg-modal)",
              zIndex: 10
            }}>
              <div>
                <span className={`status-badge ${detailedProject?.healthStatus.toLowerCase() || ""}`} style={{ marginBottom: "8px" }}>
                  {detailedProject?.healthStatus}
                </span>
                <h2 style={{ fontSize: "1.5rem" }}>
                  {detailedProject?.name || "Loading Project..."}
                </h2>
              </div>
              <button
                onClick={() => setSelectedProjectId(null)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <CloseIcon />
              </button>
            </div>

            {!detailedProject ? (
              <div style={{ textAlign: "center", padding: "80px", color: "var(--text-muted)" }}>
                <span className="spinner" /><br/>
                Retrieving detailed analysis & logs...
              </div>
            ) : (
              <div style={{ padding: "24px" }}>

                {/* Project Metadata Section */}
                <div className="glass-panel" style={{
                  padding: "20px 24px",
                  marginBottom: "30px",
                  background: "rgba(255, 255, 255, 0.01)"
                }}>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    📋 ERP Database Fields (Live Sync)
                  </h3>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "16px",
                    fontSize: "0.88rem"
                  }}>
                    <div style={{ background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block", marginBottom: "2px" }}>Project Name</span>
                      <strong style={{ color: "white" }}>{detailedProject.name}</strong>
                    </div>
                    <div style={{ background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block", marginBottom: "2px" }}>Project Type</span>
                      <strong style={{ color: "white" }}>{detailedProject.projectType || "N/A"}</strong>
                    </div>
                    <div style={{ background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block", marginBottom: "2px" }}>Priority</span>
                      <strong style={{
                        color: detailedProject.priority === "High" || detailedProject.priority === "HIGH" ? "var(--critical)" :
                               detailedProject.priority === "Medium" || detailedProject.priority === "MEDIUM" ? "var(--warning)" :
                               "var(--healthy)"
                      }}>{detailedProject.priority || "Medium"}</strong>
                    </div>
                    <div style={{ background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block", marginBottom: "2px" }}>Department</span>
                      <strong style={{ color: "white" }}>{detailedProject.department || "N/A"}</strong>
                    </div>
                    <div style={{ background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block", marginBottom: "2px" }}>Is Active</span>
                      <strong style={{
                        color: detailedProject.isActive === "Yes" || detailedProject.isActive === "Active" ? "var(--healthy)" : "var(--text-muted)"
                      }}>{detailedProject.isActive || "Yes"}</strong>
                    </div>
                    <div style={{ background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block", marginBottom: "2px" }}>% Complete Method</span>
                      <strong style={{ color: "white" }}>{detailedProject.percentCompleteMethod || "Task Completion"}</strong>
                    </div>
                    <div style={{ background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block", marginBottom: "2px" }}>Expected Start Date</span>
                      <strong style={{ color: "white" }}>{isMounted && detailedProject.startDate ? new Date(detailedProject.startDate).toLocaleDateString() : ""}</strong>
                    </div>
                    <div style={{ background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block", marginBottom: "2px" }}>Expected End Date</span>
                      <strong style={{ color: "white" }}>{isMounted && detailedProject.endDate ? new Date(detailedProject.endDate).toLocaleDateString() : ""}</strong>
                    </div>
                    <div style={{ background: "rgba(0,0,0,0.2)", padding: "10px 14px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.03)" }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.75rem", display: "block", marginBottom: "2px" }}>Manager / Owner Email</span>
                      <strong style={{ color: "white" }}>{detailedProject.managerEmail || "N/A"}</strong>
                    </div>
                  </div>
                </div>

                {/* AI-Powered insights box */}
                <div className={`glass-panel ${
                  detailedProject.healthStatus === "HEALTHY"
                    ? "glow-healthy"
                    : detailedProject.healthStatus === "WARNING"
                    ? "glow-warning"
                    : "glow-critical"
                }`} style={{
                  padding: "24px",
                  marginBottom: "30px",
                  borderLeft: `4px solid ${
                    detailedProject.healthStatus === "HEALTHY" ? "var(--healthy)" : detailedProject.healthStatus === "WARNING" ? "var(--warning)" : "var(--critical)"
                  }`
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                    <h3 style={{ fontSize: "1.25rem", color: "white", display: "flex", alignItems: "center", gap: "8px" }}>
                      ✨ AI-Powered Insights
                    </h3>
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "1.25rem", fontWeight: "700", color: "#fff" }}>
                        {detailedProject.healthScore}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>/100 Health Score</span>
                    </div>
                  </div>

                  {/* AI reason explanation */}
                  <div style={{ marginBottom: "20px" }}>
                    <h4 style={{ fontSize: "0.95rem", color: "var(--primary)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "6px" }}>
                      Explanation
                    </h4>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.92rem", lineHeight: "1.5" }}>
                      {detailedProject.healthLogs && detailedProject.healthLogs.length > 0
                        ? detailedProject.healthLogs[0].aiReason
                        : "AI analysis has not run. Perform a sync to generate insights."}
                    </p>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                    {/* Key Risks */}
                    <div>
                      <h4 style={{ fontSize: "0.95rem", color: "var(--critical)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                        Identified Risks
                      </h4>
                      <ul style={{ paddingLeft: "16px", color: "var(--text-secondary)", fontSize: "0.88rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {detailedProject.healthLogs && detailedProject.healthLogs.length > 0 && detailedProject.healthLogs[0].aiRisks ? (
                          (safeJsonParse(detailedProject.healthLogs[0].aiRisks) as string[]).map((risk, index) => (
                            <li key={index} style={{ lineHeight: "1.4" }}>{risk}</li>
                          ))
                        ) : (
                          <li>No risks identified.</li>
                        )}
                      </ul>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <h4 style={{ fontSize: "0.95rem", color: "var(--healthy)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px" }}>
                        Recommended Actions
                      </h4>
                      <ul style={{ paddingLeft: "16px", color: "var(--text-secondary)", fontSize: "0.88rem", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {detailedProject.healthLogs && detailedProject.healthLogs.length > 0 && detailedProject.healthLogs[0].aiSuggestions ? (
                          (safeJsonParse(detailedProject.healthLogs[0].aiSuggestions) as string[]).map((suggestion, index) => (
                            <li key={index} style={{ lineHeight: "1.4" }}>{suggestion}</li>
                          ))
                        ) : (
                          <li>No recommendations available.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Task Breakdown list */}
                <h3 style={{ fontSize: "1.2rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
                  📋 Tasks & Timelines
                </h3>
                
                <div style={{ overflowX: "auto", marginBottom: "30px", border: "1px solid var(--border-color)", borderRadius: "12px" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", textAlign: "left" }}>
                    <thead>
                      <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--border-color)", color: "var(--text-muted)" }}>
                        <th style={{ padding: "12px 16px" }}>Task Title</th>
                        <th style={{ padding: "12px 16px" }}>Priority</th>
                        <th style={{ padding: "12px 16px" }}>Assignee</th>
                        <th style={{ padding: "12px 16px" }}>Due Date</th>
                        <th style={{ padding: "12px 16px" }}>Status / Completion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedProject.tasks?.map((task) => {
                        const isOverdue = task.completionPercentage < 100 && new Date().getTime() > new Date(task.endDate).getTime();
                        return (
                          <tr key={task.id} style={{ borderBottom: "1px solid var(--border-color)", background: isOverdue ? "rgba(244, 63, 94, 0.03)" : "none" }}>
                            <td style={{ padding: "16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                {task.isCritical && (
                                  <span style={{
                                    fontSize: "0.65rem", background: "rgba(244,63,94,0.1)", color: "var(--critical)",
                                    border: "1px solid rgba(244,63,94,0.2)", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold"
                                  }}>
                                    CRITICAL
                                  </span>
                                )}
                                <strong style={{ color: "white" }}>{task.title}</strong>
                              </div>
                            </td>
                            <td style={{ padding: "16px" }}>
                              <span style={{
                                color: task.priority === "HIGH" ? "var(--critical)" : task.priority === "MEDIUM" ? "var(--warning)" : "var(--text-muted)"
                              }}>
                                {task.priority}
                              </span>
                            </td>
                            <td style={{ padding: "16px", color: "var(--text-secondary)" }}>{task.assignee}</td>
                            <td style={{ padding: "16px", color: isOverdue ? "var(--critical)" : "var(--text-secondary)" }}>
                              {isMounted ? new Date(task.endDate).toLocaleDateString() : ""}
                              {isOverdue && <span style={{ fontSize: "0.75rem", display: "block", color: "var(--critical)" }}>(Overdue)</span>}
                            </td>
                            <td style={{ padding: "16px" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                <div className="progress-container" style={{ width: "80px", height: "6px" }}>
                                  <div className="progress-bar" style={{ width: `${task.completionPercentage}%`, background: "var(--primary)" }} />
                                </div>
                                <span>{task.completionPercentage}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Audit & alert logs tabs */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
                  {/* Health Audit History */}
                  <div>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "12px" }}>📈 Health History Log</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "250px", overflowY: "auto" }}>
                      {detailedProject.healthLogs?.map((log) => (
                        <div key={log.id} style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "10px 14px", border: "1px solid var(--border-color)", borderRadius: "8px", background: "rgba(0,0,0,0.15)"
                        }}>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                            {isMounted ? new Date(log.timestamp).toLocaleString() : ""}
                          </span>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{
                              color: log.healthStatus === "HEALTHY" ? "var(--healthy)" : log.healthStatus === "WARNING" ? "var(--warning)" : "var(--critical)",
                              fontWeight: "600", fontSize: "0.85rem"
                            }}>{log.healthStatus}</span>
                            <strong style={{ fontSize: "0.9rem" }}>{log.healthScore}</strong>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Alert Trigger Log */}
                  <div>
                    <h3 style={{ fontSize: "1.1rem", marginBottom: "12px" }}>🔔 Escalation & Alerts Log</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "250px", overflowY: "auto" }}>
                      {detailedProject.alertLogs && detailedProject.alertLogs.length > 0 ? (
                        detailedProject.alertLogs.map((alert) => (
                          <div key={alert.id} style={{
                            padding: "10px 14px", border: "1px solid var(--border-color)", borderRadius: "8px",
                            background: alert.success ? "rgba(16, 185, 129, 0.02)" : "rgba(244, 63, 94, 0.02)"
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "4px" }}>
                              <span style={{ color: "var(--text-muted)" }}>{isMounted ? new Date(alert.timestamp).toLocaleString() : ""}</span>
                              <span style={{
                                color: alert.success ? "var(--healthy)" : "var(--critical)", fontWeight: "600"
                              }}>{alert.channel} {alert.success ? "SENT" : "FAILED"}</span>
                            </div>
                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                              Transition: {alert.statusFrom} → <strong>{alert.statusTo}</strong>
                            </div>
                            <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
                              Recipients: {alert.recipients}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.88rem", border: "1px dashed var(--border-color)", borderRadius: "8px" }}>
                          No alerts sent for this project.
                        </div>
                      )}
                    </div>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
