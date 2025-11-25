import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@selectio/ui";
import { IconBriefcase, IconClock, IconUser } from "@tabler/icons-react";
import Link from "next/link";
import { SiteHeader } from "~/components/layout";
import { api } from "~/trpc/server";

export default async function ResponsesPage() {
  const caller = await api();
  const responses = await caller.vacancy.responses.listAll();

  const totalResponses = responses.length;
  const newResponses = responses.filter(
    (response) =>
      new Date(response.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length;
  const uniqueVacancies = new Set(
    responses.map((response) => response.vacancyId)
  ).size;

  return (
    <>
      <SiteHeader title="Отклики" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              {/* Статистика */}
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Всего откликов
                    </CardTitle>
                    <IconUser className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{totalResponses}</div>
                    <p className="text-xs text-muted-foreground">
                      На {uniqueVacancies} вакансий
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Новые за 24 часа
                    </CardTitle>
                    <IconClock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{newResponses}</div>
                    <p className="text-xs text-muted-foreground">
                      {newResponses > 0
                        ? `+${((newResponses / totalResponses) * 100).toFixed(1)}%`
                        : "Нет новых"}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Активные вакансии
                    </CardTitle>
                    <IconBriefcase className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{uniqueVacancies}</div>
                    <p className="text-xs text-muted-foreground">С откликами</p>
                  </CardContent>
                </Card>
              </div>

              {/* Таблица откликов */}
              {responses.length === 0 ? (
                <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-dashed">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-2">
                      Нет откликов
                    </h2>
                    <p className="text-muted-foreground">
                      Отклики появятся после запуска парсера
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Кандидат</TableHead>
                        <TableHead>Вакансия</TableHead>
                        <TableHead>Опыт</TableHead>
                        <TableHead>Дата отклика</TableHead>
                        <TableHead>Резюме</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {responses.map((response) => {
                        const isNew =
                          new Date(response.createdAt) >
                          new Date(Date.now() - 24 * 60 * 60 * 1000);

                        return (
                          <TableRow key={response.id}>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <div className="font-medium flex items-center gap-2">
                                  <Link
                                    href={`/responses/${response.id}`}
                                    className="hover:underline"
                                  >
                                    {response.candidateName || "Без имени"}
                                  </Link>
                                  {isNew && (
                                    <Badge
                                      variant="default"
                                      className="text-xs"
                                    >
                                      Новый
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {response.vacancy ? (
                                <Link
                                  href={`/vacancies/${response.vacancyId}`}
                                  className="hover:underline"
                                >
                                  {response.vacancy.title}
                                </Link>
                              ) : (
                                "—"
                              )}
                            </TableCell>
                            <TableCell>
                              {response.experience ? (
                                <HoverCard>
                                  <HoverCardTrigger asChild>
                                    <button
                                      type="button"
                                      className="text-left hover:underline cursor-pointer"
                                    >
                                      {response.experience.length > 50
                                        ? `${response.experience.slice(0, 50)}...`
                                        : response.experience}
                                    </button>
                                  </HoverCardTrigger>
                                  <HoverCardContent className="w-80">
                                    <div className="space-y-2">
                                      <h4 className="text-sm font-semibold">
                                        Опыт работы
                                      </h4>
                                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                        {response.experience}
                                      </p>
                                    </div>
                                  </HoverCardContent>
                                </HoverCard>
                              ) : (
                                "Не указан"
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(response.createdAt).toLocaleDateString(
                                "ru-RU",
                                {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }
                              )}
                            </TableCell>
                            <TableCell>
                              <a
                                href={response.resumeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                Открыть
                              </a>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
