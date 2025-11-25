import { Badge, Card, CardContent, CardHeader, CardTitle } from "@selectio/ui";
import {
  IconArrowLeft,
  IconBriefcase,
  IconCalendar,
  IconLanguage,
  IconSchool,
  IconUser,
} from "@tabler/icons-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "~/components/layout";
import { api } from "~/trpc/server";

interface ResponseDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ResponseDetailPage({
  params,
}: ResponseDetailPageProps) {
  const { id } = await params;
  const caller = await api();
  const response = await caller.vacancy.responses.getById({ id });

  if (!response) {
    notFound();
  }

  const isNew =
    new Date(response.createdAt) > new Date(Date.now() - 24 * 60 * 60 * 1000);

  return (
    <>
      <SiteHeader title="Детали отклика" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              {/* Навигация назад */}
              <Link
                href="/responses"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
              >
                <IconArrowLeft className="h-4 w-4" />
                Назад к откликам
              </Link>

              {/* Заголовок */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-3xl font-bold">
                      {response.candidateName || "Без имени"}
                    </h1>
                    {isNew && (
                      <Badge variant="default" className="text-sm">
                        Новый
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <IconCalendar className="h-4 w-4" />
                      {new Date(response.createdAt).toLocaleDateString(
                        "ru-RU",
                        {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </div>
                  </div>
                </div>
                <a
                  href={response.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                  Открыть резюме на HH.ru
                </a>
              </div>

              {/* Вакансия */}
              {response.vacancy && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconBriefcase className="h-5 w-5" />
                      Вакансия
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Link
                      href={`/vacancies/${response.vacancyId}`}
                      className="text-lg font-medium hover:underline"
                    >
                      {response.vacancy.title}
                    </Link>
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-6 md:grid-cols-2">
                {/* О себе */}
                {response.about ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconUser className="h-5 w-5" />О себе
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm">
                        {response.about}
                      </p>
                    </CardContent>
                  </Card>
                ) : null}

                {/* Языки */}
                {response.languages ? (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <IconLanguage className="h-5 w-5" />
                        Языки
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="whitespace-pre-wrap text-sm">
                        {response.languages}
                      </p>
                    </CardContent>
                  </Card>
                ) : null}
              </div>

              {/* Опыт работы */}
              {response.experience ? (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconBriefcase className="h-5 w-5" />
                      Опыт работы
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm">
                      {response.experience}
                    </p>
                  </CardContent>
                </Card>
              ) : null}

              {/* Образование */}
              {response.education ? (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconSchool className="h-5 w-5" />
                      Образование
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm">
                      {response.education}
                    </p>
                  </CardContent>
                </Card>
              ) : null}

              {/* Курсы */}
              {response.courses ? (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconSchool className="h-5 w-5" />
                      Курсы и сертификаты
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm">
                      {response.courses}
                    </p>
                  </CardContent>
                </Card>
              ) : null}

              {/* Контакты */}
              {response.contacts ? (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Контакты</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm bg-muted p-4 rounded-lg overflow-auto">
                      {JSON.stringify(response.contacts, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
