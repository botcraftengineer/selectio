import { NextResponse } from "next/server";
import { triggerScreenResponse } from "~/actions/trigger";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { responseId } = body;

    if (!responseId || typeof responseId !== "string") {
      return NextResponse.json(
        { error: "responseId is required" },
        { status: 400 }
      );
    }

    const result = await triggerScreenResponse(responseId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, runId: result.runId });
  } catch (error) {
    console.error("Error in screen-response API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
