"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@selectio/ui";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { SiteHeader } from "~/components/layout";
import { ResponseTable } from "~/components/vacancy";
import { useTRPC } from "~/trpc/react";

interface VacancyResponsesPageProps {
  params: Promise<{ workspaceSlug: string; id: string }>;
}

export default function VacancyResponsesPage({
  params,
}: VacancyResponsesPageProps) {
  const { workspaceSlug, id } = use(params);
  const trpc = useTRPC();

  const { data: vacancy, isLoading: vacancyLoading } = useQuery(
    trpc.vacancy.getById.queryOptions({ id }),
  );

  const isLoading = vacancyLoading;

  if (isLoading) {
    return (
      <>
        <SiteHeader title="Загрузка..." />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <Skeleton className="h-10 w-40 mb-4" />
                <Skeleton className="h-64" />
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!vacancy) {
    return (
      <>
        <SiteHeader title="Не найдено" />
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-muted-foreground">Вакансия не найдена</p>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader title={`Отклики - ${vacancy.title}`} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              <div className="mb-4">
                <Link href={`/${workspaceSlug}/vacancies/${id}`}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Назад к вакансии
                  </Button>
                </Link>
              </div>

              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Отклики на вакансию</CardTitle>
                    <CardDescription>Управление откликами</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponseTable vacancyId={id} />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
