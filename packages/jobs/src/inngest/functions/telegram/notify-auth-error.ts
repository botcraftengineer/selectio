import { env } from "@selectio/config";
import { db, eq } from "@selectio/db";
import {
  telegramSession,
  user,
  userWorkspace,
  workspace,
} from "@selectio/db/schema";
import { sendEmail, TelegramAuthErrorEmail } from "@selectio/emails";
import { inngest } from "../../client";

/**
 * Inngest function to notify workspace admins when Telegram authorization fails
 */
export const notifyTelegramAuthErrorFunction = inngest.createFunction(
  {
    id: "notify-telegram-auth-error",
    name: "Notify Telegram Auth Error",
    retries: 3,
  },
  { event: "telegram/auth.error" },
  async ({ event, step }) => {
    const { sessionId, workspaceId, errorType, errorMessage, phone } =
      event.data;

    // Get workspace info and admin emails
    const workspaceData = await step.run("get-workspace-data", async () => {
      const [ws] = await db
        .select()
        .from(workspace)
        .where(eq(workspace.id, workspaceId))
        .limit(1);

      if (!ws) {
        throw new Error(`Workspace not found: ${workspaceId}`);
      }

      // Get all admins and owners of the workspace
      const members = await db
        .select({
          userId: userWorkspace.userId,
          role: userWorkspace.role,
          email: user.email,
          name: user.name,
        })
        .from(userWorkspace)
        .innerJoin(user, eq(user.id, userWorkspace.userId))
        .where(eq(userWorkspace.workspaceId, workspaceId));

      // Filter to admins and owners only
      const admins = members.filter(
        (m) => m.role === "owner" || m.role === "admin",
      );

      return {
        workspace: ws,
        admins,
      };
    });

    // Update session with error notification timestamp
    await step.run("update-session", async () => {
      await db
        .update(telegramSession)
        .set({
          authErrorNotifiedAt: new Date(),
        })
        .where(eq(telegramSession.id, sessionId));
    });

    // Send email to each admin in separate idempotent steps
    const emailResults = await Promise.allSettled(
      workspaceData.admins
        .filter((admin) => admin.email)
        .map((admin) =>
          step
            .run(`send-email-${admin.userId}`, async () => {
              const reauthorizeLink = `${env.APP_URL}/workspaces/${workspaceData.workspace.slug}/settings/telegram`;

              await sendEmail({
                to: [admin.email],
                subject: `⚠️ Telegram авторизация слетела: ${workspaceData.workspace.name}`,
                react: TelegramAuthErrorEmail({
                  workspaceName: workspaceData.workspace.name,
                  phone,
                  errorType,
                  errorMessage,
                  reauthorizeLink,
                }),
              });

              console.log(`✅ Email sent to ${admin.email}`);
              return { email: admin.email, success: true };
            })
            .catch((error) => {
              const errorMsg =
                error instanceof Error ? error.message : "Unknown error";
              console.error(
                `❌ Failed to send email to ${admin.email}:`,
                error,
              );
              return { email: admin.email, success: false, error: errorMsg };
            }),
        ),
    ).then((results) =>
      results.map((r) => (r.status === "fulfilled" ? r.value : r.reason)),
    );

    const successCount = emailResults.filter((r) => r.success).length;
    const failCount = emailResults.filter((r) => !r.success).length;

    console.log(
      `📧 Telegram auth error notification sent: ${successCount} success, ${failCount} failed`,
    );

    return {
      success: true,
      sessionId,
      workspaceId,
      emailsSent: successCount,
      emailsFailed: failCount,
      recipients: emailResults,
    };
  },
);
