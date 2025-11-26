import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { LangfuseExporter } from "langfuse-vercel";

export const sdk = new NodeSDK({
  traceExporter: new LangfuseExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});
