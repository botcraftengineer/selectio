"use client";

import {
  Button,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@selectio/ui";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { use } from "react";
import { SiteHeader } from "~/components/layout";
import {
  GenerateRequirementsButton,
  VacancyAnalytics,
  VacancyHeader,
  VacancyRequirements,
  VacancyStats,
} from "~/components/vacancy";
import { useTRPC } from "~/trpc/react";

interface VacancyDetailPageProps {
  params: Promise<{ workspaceSlug: string; id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default function VacancyDetailPage({
  params,
  searchParams,
}: VacancyDetailPageProps) {
  const { workspaceSlug, id } = use(params);
  const { tab } = use(searchParams);
  const trpc = useTRPC();

  const { data: vacancy, isLoading: vacancyLoading } = useQuery(
    trpc.vacancy.getById.queryOptions({ id }),
  );
  const { data: responsesCount, isLoading: responsesLoading } = useQuery(
    trpc.vacancy.responses.getCount.queryOptions({ vacancyId: id }),
  );
  const { data: analytics } = useQuery({
    ...trpc.vacancy.getAnalytics.queryOptions({ vacancyId: id }),
    enabled: !!id,
  });

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
                  <Skeleton className="h-10 w-full" />
                  <div className="rounded-lg border p-6 space-y-6">
                    <Skeleton className="h-8 w-3/4" />
                    <div className="grid gap-4 md:grid-cols-4">
                      <Skeleton className="h-24" />
                      <Skeleton className="h-24" />
                      <Skeleton className="h-24" />
                      <Skeleton className="h-24" />
                    </div>
                    <Skeleton className="h-64" />
                  </div>
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

              <Tabs defaultValue={tab || "overview"} className="space-y-6">
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

                <TabsContent value="overview" className="space-y-6">
                  {analytics && (
                    <VacancyAnalytics
                      totalResponses={analytics.totalResponses}
                      processedResponses={analytics.processedResponses}
                      highScoreResponses={analytics.highScoreResponses}
                      topScoreResponses={analytics.topScoreResponses}
                      avgScore={analytics.avgScore}
                    />
                  )}

                  <div className="rounded-lg border bg-linear-to-t from-primary/5 to-card dark:bg-card p-6 shadow-xs space-y-6">
                    <VacancyHeader
                      title={vacancy.title}
                      region={vacancy.region}
                      url={vacancy.url}
                      isActive={vacancy.isActive}
                    />

                    <VacancyStats
                      views={vacancy.views}
                      responses={vacancy.responses}
                      newResponses={vacancy.newResponses}
                      resumesInProgress={vacancy.resumesInProgress}
                    />

                    {vacancy.description && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-semibold">
                            Описание вакансии
                          </h2>
                          <GenerateRequirementsButton
                            vacancyId={vacancy.id}
                            description={vacancy.description}
                          />
                        </div>
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                            {vacancy.description}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  {vacancy.requirements ? (
                    <VacancyRequirements
                      requirements={vacancy.requirements as unknown}
                    />
                  ) : null}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
