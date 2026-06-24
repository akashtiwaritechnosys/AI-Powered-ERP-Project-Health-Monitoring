import nodemailer from 'nodemailer';
import prisma from '../db';
import { Project, Config } from '@prisma/client';

export interface AlertPayload {
  project: Project;
  previousStatus: string;
  currentStatus: string;
  aiReason: string;
  aiSuggestions: string[];
}

export async function sendAlertIfNeeded(
  payload: AlertPayload,
  config: Config
): Promise<void> {
  const { project, previousStatus, currentStatus, aiReason, aiSuggestions } = payload;

  // We only trigger alerts if status degrades or stays CRITICAL
  const isCriticalNow = currentStatus === 'CRITICAL';
  const wasHealthyOrWarning = previousStatus !== 'CRITICAL';
  
  // Alert conditions:
  // 1. Project transitions from non-critical to critical.
  // 2. Project transitions to WARNING (lower severity alert).
  if (!isCriticalNow && currentStatus !== 'WARNING') {
    return;
  }

  const subject = `[ALERT] Project "${project.name}" Status is now ${currentStatus}`;
  const actionItemsHtml = aiSuggestions.map(item => `<li>${item}</li>`).join('');
  const emailBody = `
    <h2>Project Health Alert</h2>
    <p><strong>Project:</strong> ${project.name} (ID: ${project.id})</p>
    <p><strong>Previous Status:</strong> ${previousStatus}</p>
    <p><strong>Current Status:</strong> <span style="color: ${currentStatus === 'CRITICAL' ? 'red' : 'orange'}">${currentStatus}</span></p>
    <p><strong>Health Score:</strong> ${project.healthScore}/100</p>
    <br/>
    <h3>AI Analysis Reason:</h3>
    <p>${aiReason}</p>
    <br/>
    <h3>Recommended Actions:</h3>
    <ul>${actionItemsHtml}</ul>
    <hr/>
    <p>This is an automated notification from the ERP Project Health Monitoring Middleware.</p>
  `;

  const recipients = [project.managerEmail, config.emailAdmin].filter(Boolean).join(', ');

  // 1. Attempt Email Send
  let emailSuccess = false;
  if (config.smtpHost && config.smtpUser && config.smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpPort === 465,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass,
        },
      });

      await transporter.sendMail({
        from: '"Project Health Monitor" <no-reply@company.com>',
        to: recipients,
        subject,
        html: emailBody,
      });

      emailSuccess = true;
      console.log(`[ALERT] Email notification sent successfully to ${recipients} for project ${project.name}`);
    } catch (error) {
      console.error('[ALERT] Failed to send email alert:', error);
    }
  } else {
    // Console log fallback
    console.log(`\n============== MOCK EMAIL ALERT ==============`);
    console.log(`TO: ${recipients}`);
    console.log(`SUBJECT: ${subject}`);
    console.log(`CONTENT:\n${emailBody.replace(/<[^>]*>/g, '')}`);
    console.log(`==============================================\n`);
    emailSuccess = true; // Count as successful mock for POC
  }

  // Save to AlertLog
  await prisma.alertLog.create({
    data: {
      projectId: project.id,
      statusFrom: previousStatus,
      statusTo: currentStatus,
      recipients,
      channel: 'EMAIL',
      message: `Status transitioned to ${currentStatus}. AI Reason: ${aiReason.substring(0, 100)}...`,
      success: emailSuccess,
    },
  });

  // 2. Slack Alert
  if (config.slackWebhookUrl) {
    try {
      const slackPayload = {
        text: `🚨 *Project Health Alert* 🚨\n*Project:* ${project.name}\n*Status:* ${currentStatus} (Score: ${project.healthScore})\n*Reason:* ${aiReason}\n*Recommendations:*\n${aiSuggestions.map(s => `- ${s}`).join('\n')}`,
      };
      
      const response = await fetch(config.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackPayload),
      });

      const slackSuccess = response.ok;
      
      await prisma.alertLog.create({
        data: {
          projectId: project.id,
          statusFrom: previousStatus,
          statusTo: currentStatus,
          recipients: 'Slack Webhook Channel',
          channel: 'SLACK',
          message: `Slack Alert Sent`,
          success: slackSuccess,
        },
      });
      console.log(`[ALERT] Slack notification sent to webhook. Response status: ${response.status}`);
    } catch (error) {
      console.error('[ALERT] Failed to send Slack alert:', error);
    }
  } else {
    console.log(`[ALERT] Slack Webhook URL not configured. Skipping Slack alert.`);
  }
}
