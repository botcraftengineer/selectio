import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@selectio/ui";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "~/components/layout";
import {
  EmptyResponses,
  GenerateRequirementsButton,
  ResponseCards,
  ResponseTable,
  VacancyHeader,
  VacancyStats,
} from "~/components/vacancy";
import { api } from "~/trpc/server";

interface VacancyDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function VacancyDetailPage({
  params,
  searchParams,
}: VacancyDetailPageProps) {
  const { id } = await params;
  const { tab } = await searchParams;
  const caller = await api();
  const [vacancy, responses] = await Promise.all([
    caller.vacancy.getById({ id }),
    caller.vacancy.responses.list({ vacancyId: id }),
  ]);

  if (!vacancy) {
    notFound();
  }

  return (
    <>
      <SiteHeader title={vacancy.title} />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              <div className="mb-4">
                <Link href="/vacancies">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Назад к списку
                  </Button>
                </Link>
              </div>

              <Tabs defaultValue={tab || "overview"} className="space-y-6">
                <TabsList>
                  <TabsTrigger value="overview">Обзор</TabsTrigger>
                  <TabsTrigger value="responses">
                    Отклики ({responses.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <div className="rounded-lg border p-6 space-y-6">
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
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h2 className="text-xl font-semibold">Описание</h2>
                          <GenerateRequirementsButton
                            vacancyId={vacancy.id}
                            description={vacancy.description}
                          />
                        </div>
                        <div className="prose prose-sm max-w-none">
                          <p className="whitespace-pre-wrap text-sm">
                            {vacancy.description}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="responses" className="space-y-6">
                  {responses.length === 0 ? (
                    <EmptyResponses />
                  ) : (
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle>Отклики на вакансию</CardTitle>
                          <CardDescription>
                            Всего откликов: {responses.length}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ResponseTable responses={responses} />
                        </CardContent>
                      </Card>

                      <ResponseCards responses={responses} />
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
