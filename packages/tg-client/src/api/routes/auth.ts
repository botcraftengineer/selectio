import { Hono } from "hono";
import { createUserClient } from "../../user-client";
import { checkPasswordSchema, sendCodeSchema, signInSchema } from "../schemas";
import { handleError, isAuthError } from "../utils";

const auth = new Hono();

auth.post("/send-code", async (c) => {
  try {
    const body = await c.req.json();
    const result = sendCodeSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: "Invalid request data", details: result.error.issues },
        400,
      );
    }

    const { apiId, apiHash, phone } = result.data;
    const { client, storage } = await createUserClient(apiId, apiHash);

    await client.connect();
    const authResult = await client.sendCode({ phone });

    if ("phoneCodeHash" in authResult) {
      const sessionData = await storage.export();

      return c.json({
        success: true,
        phoneCodeHash: authResult.phoneCodeHash,
        timeout: authResult.timeout,
        sessionData: JSON.stringify(sessionData),
      });
    }

    return c.json({ error: "User already authorized" }, 400);
  } catch (error) {
    return c.json({ error: handleError(error, "Failed to send code") }, 500);
  }
});

auth.post("/sign-in", async (c) => {
  let storage: Awaited<ReturnType<typeof createUserClient>>["storage"] | null =
    null;
  try {
    const body = await c.req.json();
    const result = signInSchema.safeParse(body);

    if (!result.success) {
      return c.json(
        { error: "Invalid request data", details: result.error.issues },
        400,
      );
    }

    const { apiId, apiHash, phone, phoneCode, phoneCodeHash, sessionData } =
      result.data;

    const parsedSessionData = sessionData
      ? (JSON.parse(sessionData) as Record<string, string>)
      : undefined;

    const clientData = await createUserClient(
      apiId,
      apiHash,
      parsedSessionData,
    );
    storage = clientData.storage;

    await clientData.client.connect();
    const user = await clientData.client.signIn({
      phone,
      phoneCode,
      phoneCodeHash,
    });
    const newSessionData = await storage.export();

    return c.json({
      success: true,
      sessionData: JSON.stringify(newSessionData),
      user: {
        id: user.id.toString(),
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "",
        phone: "phone" in user ? user.phone : phone,
      },
    });
  } catch (error) {
    if (isAuthError(error, "SESSION_PASSWORD_NEEDED")) {
      // Сохраняем sessionData для использования в checkPassword
      if (storage) {
        const newSessionData = await storage.export();
        return c.json(
          {
            error: "SESSION_PASSWORD_NEEDED",
            sessionData: JSON.stringify(newSessionData),
          },
          400,
        );
      }
    }
    if (isAuthError(error, "PHONE_CODE_EXPIRED")) {
      return c.json({ error: "PHONE_CODE_EXPIRED" }, 400);
    }
    if (isAuthError(error, "PHONE_CODE_INVALID")) {
      return c.json({ error: "PHONE_CODE_INVALID" }, 400);
    }

    return c.json({ error: handleError(error, "Failed to sign in") }, 500);
  }
});

auth.post("/check-password", async (c) => {
  try {
    const body = await c.req.json();
    const result = checkPasswordSchema.safeParse(body);
    if (!result.success) {
      return c.json(
        { error: "Invalid request data", details: result.error.issues },
        400,
      );
    }

    const { apiId, apiHash, phone, password, sessionData } = result.data;

    const { client, storage } = await createUserClient(
      apiId,
      apiHash,
      JSON.parse(sessionData) as Record<string, string>,
    );
    const user = await client.checkPassword(password);
    const newSessionData = await storage.export();

    return c.json({
      success: true,
      sessionData: JSON.stringify(newSessionData),
      user: {
        id: user.id.toString(),
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "",
        phone: "phone" in user ? user.phone : phone,
      },
    });
  } catch (error) {
    return c.json(
      { error: handleError(error, "Failed to check password") },
      500,
    );
  }
});

export default auth;
