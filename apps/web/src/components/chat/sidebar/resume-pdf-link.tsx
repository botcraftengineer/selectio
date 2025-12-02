"use client";

import { Button } from "@selectio/ui";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, FileText } from "lucide-react";
import { useTRPC } from "~/trpc/react";

interface ResumePdfLinkProps {
  fileKey: string;
  fileName?: string;
}

export function ResumePdfLink({ fileKey, fileName }: ResumePdfLinkProps) {
  const trpc = useTRPC();

  const { data: fileData, isLoading } = useQuery({
    ...trpc.telegram.file.getUrl.queryOptions({ key: fileKey }),
  });

  const handleOpen = () => {
    if (fileData?.url) {
      window.open(fileData.url, "_blank");
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <FileText className="h-4 w-4" />
        <span>{fileName || "Резюме.pdf"}</span>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={handleOpen}
        disabled={isLoading || !fileData?.url}
        className="w-full"
      >
        <ExternalLink className="h-4 w-4 mr-2" />
        {isLoading ? "Загрузка..." : "Открыть резюме"}
      </Button>
    </div>
  );
}
