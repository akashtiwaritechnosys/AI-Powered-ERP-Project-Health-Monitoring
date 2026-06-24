"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeProjectHealth = analyzeProjectHealth;
const genai_1 = require("@google/genai");
const openai_1 = __importDefault(require("openai"));
function cleanJsonString(str) {
    let cleaned = str.trim();
    if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(json)?/, '').replace(/```$/, '').trim();
    }
    return cleaned;
}
async function analyzeProjectHealth(project, tasks, healthScore, healthStatus, deductions, promptTemplate) {
    const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase();
    let apiKey = '';
    if (provider === 'gemini') {
        apiKey = process.env.GEMINI_API_KEY || '';
    }
    else if (provider === 'openai') {
        apiKey = process.env.OPENAI_API_KEY || '';
    }
    else if (provider === 'deepseek') {
        apiKey = process.env.DEEPSEEK_API_KEY || '';
    }
    const tasksSummary = tasks
        .map((t) => `- ${t.title} (${t.completionPercentage}% completed, due ${new Date(t.endDate).toLocaleDateString()}, critical: ${t.isCritical}, assignee: ${t.assignee})`)
        .join('\n');
    const deductionsSummary = deductions.map((d) => `- ${d.reason} (-${d.points} pts)`).join('\n');
    const prompt = promptTemplate
        .replace('{{projectName}}', project.name)
        .replace('{{healthScore}}', healthScore.toString())
        .replace('{{healthStatus}}', healthStatus)
        .replace('{{tasksSummary}}', tasksSummary)
        + `\n\nDeductions applied:\n${deductionsSummary || 'None'}\n\nPlease format your response as a JSON object with this exact structure:
{
  "reason": "Clear explanation of why the project status is what it is.",
  "risks": ["Risk 1", "Risk 2"],
  "suggestions": ["Suggestion 1", "Suggestion 2"]
}`;
    if (!apiKey || apiKey.trim() === '') {
        // Return mock analysis
        return getMockAIAnalysis(project.name, healthScore, healthStatus, deductions, tasks);
    }
    try {
        if (provider === 'gemini') {
            const ai = new genai_1.GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: 'application/json',
                },
            });
            const text = response.text;
            if (text) {
                return JSON.parse(cleanJsonString(text));
            }
        }
        else if (provider === 'openai') {
            const openai = new openai_1.default({ apiKey });
            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert project management assistant. You analyze project status and return structured insights.',
                    },
                    { role: 'user', content: prompt },
                ],
                response_format: { type: 'json_object' },
            });
            const text = response.choices[0].message.content;
            if (text) {
                return JSON.parse(cleanJsonString(text));
            }
        }
        else if (provider === 'deepseek') {
            const openai = new openai_1.default({
                apiKey,
                baseURL: 'https://api.deepseek.com/v1',
            });
            const response = await openai.chat.completions.create({
                model: 'deepseek-chat',
                messages: [
                    {
                        role: 'system',
                        content: 'You are an expert project management assistant. You analyze project status and return structured insights.',
                    },
                    { role: 'user', content: prompt },
                ],
                response_format: { type: 'json_object' },
            });
            const text = response.choices[0].message.content;
            if (text) {
                return JSON.parse(cleanJsonString(text));
            }
        }
    }
    catch (error) {
        console.error(`AI analysis failed using ${provider}:`, error);
    }
    // Fallback to mock if API call fails
    return getMockAIAnalysis(project.name, healthScore, healthStatus, deductions, tasks);
}
function getMockAIAnalysis(projectName, healthScore, healthStatus, deductions, tasks) {
    if (healthStatus === 'HEALTHY') {
        return {
            reason: `The project "${projectName}" is currently performing well with a health score of ${healthScore}/100. It is on track, with all key milestones matching or exceeding the expected timeline.`,
            risks: [
                'Minor operational overhead as project progresses.',
                'Potential resource allocation conflicts with upcoming projects.',
            ],
            suggestions: [
                'Maintain the current pace and resource schedule.',
                'Ensure continuous monitoring of upcoming milestones.',
                'Establish feedback loops with the client to maintain high alignment.',
            ],
        };
    }
    else if (healthStatus === 'WARNING') {
        const overdueList = deductions.map((d) => d.reason.toLowerCase()).join(', ');
        return {
            reason: `The project is currently At Risk (Score: ${healthScore}) primarily due to: ${overdueList || 'slight deviations in expected progress'}. The actual progress is slightly behind expected timelines.`,
            risks: [
                'Further delays if tasks currently in progress exceed their allocated buffer.',
                'Compounding delays affecting subsequent milestones.',
                'Potential project manager exhaustion due to handling delayed tasks.',
            ],
            suggestions: [
                'Perform a mini-review of overdue tasks to identify blockers.',
                'Reallocate resources from low-risk areas to critical tasks in warning status.',
                'Conduct a sync meeting with the development team to adjust sprint velocity.',
            ],
        };
    }
    else {
        // CRITICAL
        const criticalOverdue = tasks.filter((t) => t.isCritical && t.completionPercentage < 100);
        return {
            reason: `The project has reached Critical Status (Score: ${healthScore}) due to significant delays. There are critical tasks overdue, and the variance between expected timeline and actual progress is major.`,
            risks: [
                'High probability of missing the final delivery deadline.',
                'Resource burnout due to excessive pressure to catch up.',
                'Client dissatisfaction and breach of service-level agreements (SLAs).',
            ],
            suggestions: [
                'Hold an immediate escalation meeting with stakeholders and the project team.',
                'Apply emergency resource allocation (e.g. shift seniors to work on critical blockers).',
                'Renegotiate timelines or scope for subsequent milestones to relieve pressure.',
                'Implement automated daily standups specifically for the critical tasks.',
            ],
        };
    }
}
