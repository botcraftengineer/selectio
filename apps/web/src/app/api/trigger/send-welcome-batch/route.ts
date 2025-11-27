import { NextResponse } from "next/server";
import { triggerSendWelcomeBatch } from "~/actions/trigger";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { responseIds } = body;

    if (!Array.isArray(responseIds) || responseIds.length === 0) {
      return NextResponse.json(
        { error: "responseIds array is required" },
        { status: 400 }
      );
    }

    const result = await triggerSendWelcomeBatch(responseIds);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      count: result.count,
    });
  } catch (error) {
    console.error("Error in send-welcome-batch API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
