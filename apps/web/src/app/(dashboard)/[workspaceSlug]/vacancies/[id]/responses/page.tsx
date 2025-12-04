"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
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
  searchParams: Promise<{ tab?: string }>;
}

export default function VacancyResponsesPage({
  params,
  searchParams,
}: VacancyResponsesPageProps) {
  const { workspaceSlug, id } = use(params);
  const { tab } = use(searchParams);
  const trpc = useTRPC();

  const { data: vacancy, isLoading: vacancyLoading } = useQuery(
    trpc.vacancy.getById.queryOptions({ id }),
  );
  const { data: responsesCount, isLoading: responsesLoading } = useQuery(
    trpc.vacancy.responses.getCount.queryOptions({ vacancyId: id }),
  );

  const isLoading = vacancyLoading || responsesLoading;

  if (isLoading) {
    return (
      <>
        <SiteHeader title="Загрузка..." />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <Skeleton className="h-10 w-40 mb-4" />

                <div className="space-y-6">
                  {/* Tabs skeleton */}
                  <Skeleton className="h-10 w-64" />

                  <Card>
                    <CardHeader>
                      <Skeleton className="h-7 w-48 mb-2" />
                      <Skeleton className="h-4 w-64" />
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Toolbar skeleton */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-10 w-48" />
                          </div>
                          <div className="flex gap-2">
                            <Skeleton className="h-10 w-48" />
                            <Skeleton className="h-10 w-32" />
                            <Skeleton className="h-10 w-32" />
                          </div>
                        </div>

                        {/* Table skeleton */}
                        <div className="rounded-lg border">
                          <div className="p-4 border-b">
                            <div className="flex items-center gap-4">
                              <Skeleton className="h-5 w-5" />
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-4 w-20" />
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-4 w-20" />
                            </div>
                          </div>

                          {Array.from(
                            { length: 5 },
                            (_, i) => `skeleton-row-${i}`,
                          ).map((key) => (
                            <div
                              key={key}
                              className="p-4 border-b last:border-b-0"
                            >
                              <div className="flex items-center gap-4">
                                <Skeleton className="h-5 w-5" />
                                <div className="flex-1 space-y-2">
                                  <Skeleton className="h-5 w-48" />
                                  <Skeleton className="h-4 w-32" />
                                </div>
                                <Skeleton className="h-6 w-20" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-8 w-24" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
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
      <SiteHeader title={vacancy.title} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              <div className="mb-4">
                <Link href={`/${workspaceSlug}/vacancies`}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Назад к списку
                  </Button>
                </Link>
              </div>

              <Tabs defaultValue={tab || "responses"} className="space-y-6">
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="overview" asChild>
                      <Link href={`/${workspaceSlug}/vacancies/${id}`}>
                        Обзор
                      </Link>
                    </TabsTrigger>
                    <TabsTrigger value="responses" asChild>
                      <Link
                        href={`/${workspaceSlug}/vacancies/${id}/responses`}
                      >
                        Отклики ({responsesCount?.total ?? 0})
                      </Link>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="responses" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Отклики на вакансию</CardTitle>
                      <CardDescription>Управление откликами</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponseTable
                        vacancyId={id}
                        workspaceSlug={workspaceSlug}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
