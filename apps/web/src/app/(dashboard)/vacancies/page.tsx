"use client";

import {
  Badge,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@selectio/ui";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { triggerUpdateVacancies } from "~/actions/trigger";
import { SiteHeader } from "~/components/layout";
import { useTRPC } from "~/trpc/react";

export default function VacanciesPage() {
  const trpc = useTRPC();
  const { data: vacancies, isLoading } = useQuery(
    trpc.vacancy.list.queryOptions()
  );
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      const result = await triggerUpdateVacancies();
      if (result.success) {
        toast.success("Обновление вакансий запущено");
      } else {
        toast.error("Ошибка при запуске обновления");
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <SiteHeader title="Вакансии" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              <div className="mb-4 flex justify-end">
                <Button onClick={handleUpdate} disabled={isUpdating}>
                  {isUpdating ? "Обновление..." : "Обновить"}
                </Button>
              </div>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Регион</TableHead>
                      <TableHead className="text-right">Просмотры</TableHead>
                      <TableHead className="text-right">Отклики</TableHead>
                      <TableHead className="text-right">Новые</TableHead>
                      <TableHead className="text-right">В работе</TableHead>
                      <TableHead>Статус</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="h-[400px] text-center"
                        >
                          <p className="text-muted-foreground">Загрузка...</p>
                        </TableCell>
                      </TableRow>
                    ) : !vacancies || vacancies.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-[400px]">
                          <div className="flex items-center justify-center">
                            <div className="text-center">
                              <h2 className="text-2xl font-semibold mb-2">
                                Нет вакансий
                              </h2>
                              <p className="text-muted-foreground">
                                Запустите парсер для загрузки вакансий
                              </p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      vacancies.map((vacancy) => (
                        <TableRow key={vacancy.id}>
                          <TableCell>
                            <Link
                              href={`/vacancies/${vacancy.id}`}
                              className="font-medium hover:underline"
                            >
                              {vacancy.title}
                            </Link>
                          </TableCell>
                          <TableCell>{vacancy.region || "—"}</TableCell>
                          <TableCell className="text-right">
                            {vacancy.views}
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              href={`/vacancies/${vacancy.id}/responses`}
                              className="font-medium hover:underline text-primary"
                            >
                              {vacancy.responses}
                            </Link>
                          </TableCell>
                          <TableCell className="text-right">
                            {vacancy.newResponses ? (
                              <Badge variant="default">
                                {vacancy.newResponses}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {vacancy.resumesInProgress || "—"}
                          </TableCell>
                          <TableCell>
                            {vacancy.isActive ? (
                              <Badge variant="default">Активна</Badge>
                            ) : (
                              <Badge variant="secondary">Неактивна</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
