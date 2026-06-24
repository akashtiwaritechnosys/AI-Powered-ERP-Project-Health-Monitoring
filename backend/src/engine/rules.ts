import { Task, Config } from '@prisma/client';

export interface HealthAssessmentResult {
  healthScore: number;
  healthStatus: string;
  expectedProgress: number;
  actualProgress: number;
  deductions: Array<{
    reason: string;
    points: number;
  }>;
}

export function assessProjectHealth(
  project: { startDate: Date; endDate: Date },
  tasks: Task[],
  config: Config
): HealthAssessmentResult {
  const today = new Date();
  
  // 1. Calculate Expected Progress based on timeline
  const totalTimeline = project.endDate.getTime() - project.startDate.getTime();
  const elapsedTimeline = today.getTime() - project.startDate.getTime();
  let expectedProgress = 0;
  
  if (totalTimeline > 0) {
    expectedProgress = Math.max(0, Math.min(100, (elapsedTimeline / totalTimeline) * 100));
  }

  // 2. Calculate Actual Progress (average completion of all tasks)
  let actualProgress = 0;
  if (tasks.length > 0) {
    const totalCompletion = tasks.reduce((sum, task) => sum + task.completionPercentage, 0);
    actualProgress = totalCompletion / tasks.length;
  }

  let healthScore = 100;
  const deductions: Array<{ reason: string; points: number }> = [];

  // 3. Apply Deductions
  let overdueTasksCount = 0;
  let criticalOverdueTasksCount = 0;

  for (const task of tasks) {
    const isCompleted = task.completionPercentage >= 100;
    const taskEndDate = new Date(task.endDate);
    const isOverdue = !isCompleted && today.getTime() > taskEndDate.getTime();

    if (isOverdue) {
      const daysOverdue = (today.getTime() - taskEndDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (task.isCritical) {
        criticalOverdueTasksCount++;
        deductions.push({
          reason: `Critical task "${task.title}" is overdue`,
          points: config.weightCriticalOverdue,
        });
        healthScore -= config.weightCriticalOverdue;
      } else if (daysOverdue > 3) {
        overdueTasksCount++;
        deductions.push({
          reason: `Task "${task.title}" is overdue by ${Math.floor(daysOverdue)} days`,
          points: config.weightOverdueTask,
        });
        healthScore -= config.weightOverdueTask;
      }
    }
  }

  // 4. Milestone/Project Timeline Delay
  const projectEndDate = new Date(project.endDate);
  if (today.getTime() > projectEndDate.getTime() && actualProgress < 100) {
    deductions.push({
      reason: `Project is past its due date (${projectEndDate.toLocaleDateString()}) but not fully completed`,
      points: config.weightMilestoneDelay,
    });
    healthScore -= config.weightMilestoneDelay;
  }

  // 5. Progress Variance
  const progressVariance = expectedProgress - actualProgress;
  if (progressVariance > 20) {
    deductions.push({
      reason: `Actual progress (${actualProgress.toFixed(1)}%) is behind expected progress (${expectedProgress.toFixed(1)}%) by more than 20%`,
      points: config.weightProgressVariance,
    });
    healthScore -= config.weightProgressVariance;
  }

  // Cap health score between 0 and 100
  healthScore = Math.max(0, Math.min(100, healthScore));

  // Determine Status
  let healthStatus = 'HEALTHY';
  if (healthScore < config.thresholdCritical) {
    healthStatus = 'CRITICAL';
  } else if (healthScore < config.thresholdWarning) {
    healthStatus = 'WARNING';
  }

  return {
    healthScore,
    healthStatus,
    expectedProgress: Math.round(expectedProgress),
    actualProgress: Math.round(actualProgress),
    deductions,
  };
}
