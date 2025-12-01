"use client";

import { cn } from "@selectio/ui";
import { Building2, Globe, User } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const sidebarNavItems = [
  {
    title: "Профиль",
    href: "/settings/profile",
    icon: User,
  },
  {
    title: "Компания",
    href: "/settings/company",
    icon: Building2,
  },
  {
    title: "Интеграции",
    href: "/settings/integrations",
    icon: Globe,
  },
];

export function SettingsSidebar({ workspaceSlug }: { workspaceSlug: string }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col space-y-1">
      {sidebarNavItems.map((item) => {
        const href = `/${workspaceSlug}${item.href}`;
        return (
          <Link
            key={item.href}
            href={href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
              pathname === href
                ? "bg-accent text-foreground"
                : "text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
}
