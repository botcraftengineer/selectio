"use client";

import { Skeleton } from "@selectio/ui";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { IntegrationCard } from "~/components/settings/integration-card";
import { IntegrationDialog } from "~/components/settings/integration-dialog";
import { AVAILABLE_INTEGRATIONS } from "~/lib/integrations";
import { useTRPC } from "~/trpc/react";

export default function IntegrationsPage() {
  const trpc = useTRPC();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<string | null>(null);

  const { data: integrations, isLoading } = useQuery(
    trpc.integration.list.queryOptions(),
  );

  const handleEdit = (type: string) => {
    setEditingType(type);
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditingType(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4">
        {AVAILABLE_INTEGRATIONS.map((availableIntegration) => {
          const existingIntegration = integrations?.find(
            (i) => i.type === availableIntegration.type,
          );

          return (
            <IntegrationCard
              key={availableIntegration.type}
              availableIntegration={availableIntegration}
              integration={existingIntegration}
              onEdit={() => handleEdit(availableIntegration.type)}
            />
          );
        })}
      </div>

      <IntegrationDialog
        open={dialogOpen}
        onClose={handleClose}
        editingType={editingType}
      />
    </div>
  );
}
