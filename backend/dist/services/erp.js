"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMockERPData = getMockERPData;
exports.syncERPData = syncERPData;
const db_1 = __importDefault(require("../db"));
const rules_1 = require("../engine/rules");
const ai_1 = require("./ai");
const alerts_1 = require("./alerts");
// Mock data fallback in case API credentials fail or are omitted
function getMockERPData() {
    const today = new Date();
    const addDays = (date, days) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        return d;
    };
    return [
        {
            id: "PRJ-001",
            name: "ERP Modernization Project",
            description: "Upgrade the core ERP architecture and migrate database clusters.",
            startDate: addDays(today, -30),
            endDate: addDays(today, 60),
            managerEmail: "pm.modernization@company.com",
            tasks: [
                {
                    id: "TSK-101",
                    title: "Setup Cloud Infrastructure",
                    completionPercentage: 100.0,
                    startDate: addDays(today, -30),
                    endDate: addDays(today, -15),
                    isCritical: true,
                    priority: "HIGH",
                    assignee: "Alex Rivera"
                },
                {
                    id: "TSK-102",
                    title: "Database Cluster Migration",
                    completionPercentage: 85.0,
                    startDate: addDays(today, -14),
                    endDate: addDays(today, 5),
                    isCritical: true,
                    priority: "HIGH",
                    assignee: "Sarah Chen"
                },
                {
                    id: "TSK-103",
                    title: "API Gateway Integration",
                    completionPercentage: 60.0,
                    startDate: addDays(today, -10),
                    endDate: addDays(today, 15),
                    isCritical: false,
                    priority: "MEDIUM",
                    assignee: "David Kim"
                }
            ]
        }
    ];
}
async function syncERPData() {
    const details = [];
    const baseUrl = process.env.ERPNEXT_BASE_URL || 'https://bizcentraldemo.biztechnosys.in';
    const apiKey = process.env.ERPNEXT_API_KEY;
    const apiSecret = process.env.ERPNEXT_API_SECRET;
    const useRealERP = apiKey && apiSecret;
    try {
        // 1. Get current config
        let config = await db_1.default.config.findUnique({ where: { id: 'default' } });
        if (!config) {
            config = await db_1.default.config.create({ data: {} });
        }
        let erpProjects = [];
        let erpTasks = [];
        if (useRealERP) {
            console.log(`[ERP Sync] Fetching live data from ERPNext: ${baseUrl}`);
            const authHeader = `token ${apiKey}:${apiSecret}`;
            const headers = { 'Authorization': authHeader };
            // Fetch projects with standard parameters
            const projectUrl = `${baseUrl}/api/resource/Project?fields=["name","project_name","status","percent_complete","priority","owner","expected_start_date","expected_end_date","creation"]&limit_page_length=1000`;
            const taskUrl = `${baseUrl}/api/resource/Task?fields=["name","subject","status","priority","exp_start_date","exp_end_date","progress","is_milestone","owner","project"]&limit_page_length=1000`;
            const [projRes, taskRes] = await Promise.all([
                fetch(projectUrl, { headers }),
                fetch(taskUrl, { headers })
            ]);
            if (!projRes.ok) {
                throw new Error(`ERPNext projects API returned status ${projRes.status}`);
            }
            if (!taskRes.ok) {
                throw new Error(`ERPNext tasks API returned status ${taskRes.status}`);
            }
            const projData = (await projRes.json());
            const taskData = (await taskRes.json());
            const rawProjects = projData.data || [];
            const rawTasks = taskData.data || [];
            details.push(`Fetched ${rawProjects.length} projects and ${rawTasks.length} tasks from live ERPNext.`);
            // Group projects and tasks
            for (const p of rawProjects) {
                const pTasks = rawTasks.filter((t) => t.project === p.name);
                // Handle Null Dates: calculate timeline from tasks if missing in project
                let startDate = p.expected_start_date ? new Date(p.expected_start_date) : null;
                let endDate = p.expected_end_date ? new Date(p.expected_end_date) : null;
                if (!startDate) {
                    const taskStarts = pTasks
                        .map((t) => t.exp_start_date ? new Date(t.exp_start_date).getTime() : null)
                        .filter((d) => d !== null);
                    startDate = taskStarts.length > 0 ? new Date(Math.min(...taskStarts)) : new Date(p.creation);
                }
                if (!endDate) {
                    const taskEnds = pTasks
                        .map((t) => t.exp_end_date ? new Date(t.exp_end_date).getTime() : null)
                        .filter((d) => d !== null);
                    endDate = taskEnds.length > 0 ? new Date(Math.max(...taskEnds)) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
                }
                // Map tasks
                const mappedTasks = pTasks.map((t) => {
                    const tStart = t.exp_start_date ? new Date(t.exp_start_date) : startDate;
                    const tEnd = t.exp_end_date ? new Date(t.exp_end_date) : endDate;
                    return {
                        id: t.name,
                        projectId: p.name,
                        title: t.subject || "Untitled Task",
                        completionPercentage: t.progress || 0.0,
                        startDate: tStart,
                        endDate: tEnd,
                        isCritical: t.priority === "High",
                        priority: (t.priority || "Medium").toUpperCase(),
                        assignee: t.owner || "Unassigned"
                    };
                });
                erpProjects.push({
                    id: p.name,
                    name: p.project_name || p.name,
                    description: `ERPNext Project Status: ${p.status}. Created by: ${p.owner}`,
                    startDate,
                    endDate,
                    managerEmail: p.owner || "pm@company.com",
                    tasks: mappedTasks,
                    percentComplete: p.percent_complete || 0
                });
            }
        }
        else {
            // Mock Fallback
            details.push("No ERPNext credentials specified. Using simulated ERP datasets.");
            const mockList = getMockERPData();
            for (const m of mockList) {
                erpProjects.push({
                    id: m.id,
                    name: m.name,
                    description: m.description,
                    startDate: m.startDate,
                    endDate: m.endDate,
                    managerEmail: m.managerEmail,
                    tasks: m.tasks,
                    percentComplete: 0
                });
            }
        }
        // Process all resolved projects
        for (const project of erpProjects) {
            const existingProject = await db_1.default.project.findUnique({
                where: { id: project.id }
            });
            const previousStatus = existingProject ? existingProject.healthStatus : 'HEALTHY';
            // Assess health using engine rules
            const healthResult = (0, rules_1.assessProjectHealth)({ startDate: project.startDate, endDate: project.endDate }, project.tasks, config);
            // If project has no tasks, we use the direct percent_complete from ERPNext as actual progress
            if (project.tasks.length === 0) {
                healthResult.actualProgress = Math.round(project.percentComplete);
            }
            // Upsert project
            const upsertedProject = await db_1.default.project.upsert({
                where: { id: project.id },
                update: {
                    name: project.name,
                    description: project.description,
                    startDate: project.startDate,
                    endDate: project.endDate,
                    expectedProgress: healthResult.expectedProgress,
                    actualProgress: healthResult.actualProgress,
                    healthScore: healthResult.healthScore,
                    healthStatus: healthResult.healthStatus,
                    managerEmail: project.managerEmail,
                    lastSynced: new Date(),
                },
                create: {
                    id: project.id,
                    name: project.name,
                    description: project.description,
                    startDate: project.startDate,
                    endDate: project.endDate,
                    expectedProgress: healthResult.expectedProgress,
                    actualProgress: healthResult.actualProgress,
                    healthScore: healthResult.healthScore,
                    healthStatus: healthResult.healthStatus,
                    managerEmail: project.managerEmail,
                }
            });
            // Upsert tasks
            for (const task of project.tasks) {
                await db_1.default.task.upsert({
                    where: { id: task.id },
                    update: {
                        title: task.title,
                        completionPercentage: task.completionPercentage,
                        startDate: task.startDate,
                        endDate: task.endDate,
                        isCritical: task.isCritical,
                        priority: task.priority,
                        assignee: task.assignee
                    },
                    create: task
                });
            }
            // Run AI insights generator
            const aiResult = await (0, ai_1.analyzeProjectHealth)(upsertedProject, project.tasks, healthResult.healthScore, healthResult.healthStatus, healthResult.deductions, config.aiPromptTemplate);
            // Create history logs
            await db_1.default.healthLog.create({
                data: {
                    projectId: upsertedProject.id,
                    healthScore: healthResult.healthScore,
                    healthStatus: healthResult.healthStatus,
                    aiReason: aiResult.reason,
                    aiRisks: JSON.stringify(aiResult.risks),
                    aiSuggestions: JSON.stringify(aiResult.suggestions)
                }
            });
            // Dispatch alert notifications
            await (0, alerts_1.sendAlertIfNeeded)({
                project: upsertedProject,
                previousStatus,
                currentStatus: healthResult.healthStatus,
                aiReason: aiResult.reason,
                aiSuggestions: aiResult.suggestions
            }, config);
            details.push(`Synchronized "${project.name}" (${project.id}): Health Score ${healthResult.healthScore} [${healthResult.healthStatus}]`);
        }
        // Delete any old projects that were not in the current sync
        const activeProjectIds = erpProjects.map((p) => p.id);
        const deletedResult = await db_1.default.project.deleteMany({
            where: {
                id: {
                    notIn: activeProjectIds,
                },
            },
        });
        if (deletedResult.count > 0) {
            details.push(`Cleaned up ${deletedResult.count} obsolete/mock projects from the database.`);
        }
        return {
            success: true,
            syncedProjectsCount: erpProjects.length,
            details
        };
    }
    catch (error) {
        console.error('[ERP Sync Engine] Synchronization failure:', error);
        return {
            success: false,
            syncedProjectsCount: 0,
            details: [`Sync execution failed: ${error.message}`]
        };
    }
}
