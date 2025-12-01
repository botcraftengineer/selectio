import { createIntegration } from "./create";
import { deleteIntegrationProcedure } from "./delete";
import { listIntegrations } from "./list";
import { updateIntegration } from "./update";

export const integrationRouter = {
  list: listIntegrations,
  create: createIntegration,
  update: updateIntegration,
  delete: deleteIntegrationProcedure,
};
