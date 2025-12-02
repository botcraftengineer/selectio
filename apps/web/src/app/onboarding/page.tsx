"use client";

import { Button, Input, Label } from "@selectio/ui";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTRPC } from "~/trpc/react";

export default function OnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isGeneratingSlug, setIsGeneratingSlug] = useState(true);
  const [error, setError] = useState("");
  const trpc = useTRPC();

  const createWorkspace = useMutation(
    trpc.workspace.create.mutationOptions({
      onSuccess: (workspace) => {
        router.push(`/${workspace.slug}`);
        router.refresh();
      },
      onError: (err) => {
        setError(err.message || "Ошибка при создании workspace");
      },
    }),
  );

  // Автогенерация slug из названия
  const handleNameChange = (value: string) => {
    setName(value);
    if (isGeneratingSlug) {
      const generatedSlug = value
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 50);
      setSlug(generatedSlug);
    }
  };

  const handleSlugChange = (value: string) => {
    setIsGeneratingSlug(false);
    setSlug(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    createWorkspace.mutate({ name, slug });
  };

  return (
    <div className="relative flex min-h-screen items-start justify-center p-4 pt-20">
      {/* Background gradient */}
      <div className="absolute inset-0 isolate overflow-hidden bg-white">
        <div className="absolute inset-y-0 left-1/2 w-[1200px] -translate-x-1/2 [mask-composite:intersect] [mask-image:linear-gradient(black,transparent_320px),linear-gradient(90deg,transparent,black_5%,black_95%,transparent)]">
          <svg
            className="pointer-events-none absolute inset-0 text-neutral-200"
            width="100%"
            height="100%"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="grid-pattern"
                x="-0.25"
                y="-1"
                width="60"
                height="60"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 60 0 L 0 0 0 60"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </pattern>
            </defs>
            <rect fill="url(#grid-pattern)" width="100%" height="100%" />
          </svg>
        </div>
        <div className="absolute left-1/2 top-6 size-[80px] -translate-x-1/2 -translate-y-1/2 scale-x-[1.6] mix-blend-overlay">
          <div className="absolute -inset-16 mix-blend-overlay blur-[50px] saturate-[2] bg-[conic-gradient(from_90deg,#F00_5deg,#EAB308_63deg,#5CFF80_115deg,#1E00FF_170deg,#855AFC_220deg,#3A8BFD_286deg,#F00_360deg)]" />
          <div className="absolute -inset-16 mix-blend-overlay blur-[50px] saturate-[2] bg-[conic-gradient(from_90deg,#F00_5deg,#EAB308_63deg,#5CFF80_115deg,#1E00FF_170deg,#855AFC_220deg,#3A8BFD_286deg,#F00_360deg)]" />
        </div>
        <div className="absolute left-1/2 top-6 size-[80px] -translate-x-1/2 -translate-y-1/2 scale-x-[1.6] opacity-10">
          <div className="absolute -inset-16 mix-blend-overlay blur-[50px] saturate-[2] bg-[conic-gradient(from_90deg,#F00_5deg,#EAB308_63deg,#5CFF80_115deg,#1E00FF_170deg,#855AFC_220deg,#3A8BFD_286deg,#F00_360deg)]" />
        </div>
      </div>

      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary/10 backdrop-blur-sm">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-8 text-primary"
              aria-label="Workspace icon"
            >
              <title>Workspace</title>
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold">Создайте workspace</h1>
          <p className="text-muted-foreground mt-2">
            Настройте общее пространство для управления вакансиями
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-xl border bg-card p-8 shadow-lg backdrop-blur-sm"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Название workspace</Label>
            <Input
              id="name"
              placeholder="Моя компания"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">Slug workspace</Label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                app.selectio.ru/
              </span>
              <Input
                id="slug"
                placeholder="my-company"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                required
                maxLength={50}
                pattern="[a-z0-9-]+"
                title="Только строчные буквы, цифры и дефис"
              />
            </div>
            <p className="text-muted-foreground text-xs">
              Можно изменить позже в настройках
            </p>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={createWorkspace.isPending || !name || !slug}
          >
            {createWorkspace.isPending ? "Создание..." : "Создать workspace"}
          </Button>

          {error && (
            <p className="text-destructive text-sm text-center">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}
