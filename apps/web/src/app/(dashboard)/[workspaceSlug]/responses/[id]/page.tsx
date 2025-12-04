"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
  Skeleton,
} from "@selectio/ui";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, User } from "lucide-react";
import Link from "next/link";
import { use } from "react";
import { SiteHeader } from "~/components/layout";
import { useTRPC } from "~/trpc/react";

interface ResponseDetailPageProps {
  params: Promise<{ workspaceSlug: string; id: string }>;
}

export default function ResponseDetailPage({
  params,
}: ResponseDetailPageProps) {
  const { workspaceSlug, id } = use(params);
  const trpc = useTRPC();

  const { data: response, isLoading } = useQuery(
    trpc.vacancy.responses.getById.queryOptions({ id }),
  );

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
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-64 w-full" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!response) {
    return (
      <>
        <SiteHeader title="Не найдено" />
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-muted-foreground">Отклик не найден</p>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader
        title={`Отклик от ${response.candidateName || "Кандидата"}`}
      />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              <div className="mb-4 flex items-center justify-between">
                <Link href={`/${workspaceSlug}`}>
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Назад
                  </Button>
                </Link>
                {response.conversation && (
                  <Link href={`/${workspaceSlug}/responses/${id}/chat`}>
                    <Button variant="default" size="sm">
                      💬 Открыть чат
                    </Button>
                  </Link>
                )}
              </div>

              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          {response.candidateName || "Имя не указано"}
                        </CardTitle>
                        <CardDescription>
                          {response.vacancy?.title || "Вакансия"}
                        </CardDescription>
                      </div>
                      {response.screening?.detailedScore !== undefined && (
                        <Badge
                          variant={
                            response.screening.detailedScore >= 80
                              ? "default"
                              : response.screening.detailedScore >= 60
                                ? "secondary"
                                : "outline"
                          }
                        >
                          Оценка: {response.screening.detailedScore}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {response.resumeUrl && (
                      <div>
                        <Link
                          href={response.resumeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Открыть резюме
                          </Button>
                        </Link>
                      </div>
                    )}

                    <Separator />

                    <div className="grid gap-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Статус:</span>
                        <Badge variant="outline">{response.status}</Badge>
                      </div>
                      {response.hrSelectionStatus && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Решение HR:
                          </span>
                          <Badge variant="outline">
                            {response.hrSelectionStatus}
                          </Badge>
                        </div>
                      )}
                      {response.createdAt && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Дата отклика:
                          </span>
                          <span>
                            {new Date(response.createdAt).toLocaleDateString(
                              "ru-RU",
                            )}
                          </span>
                        </div>
                      )}
                      {response.phone && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Телефон:
                          </span>
                          <span>{response.phone}</span>
                        </div>
                      )}
                      {response.telegramUsername && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Telegram:
                          </span>
                          <span>@{response.telegramUsername}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {response.screening?.analysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Анализ резюме</CardTitle>
                      {response.screening.score && (
                        <CardDescription>
                          Базовая оценка: {response.screening.score}/5
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap">
                          {response.screening.analysis}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {response.about && (
                  <Card>
                    <CardHeader>
                      <CardTitle>О себе</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {response.about}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {response.experience && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Опыт работы</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {response.experience}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {response.education && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Образование</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {response.education}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
