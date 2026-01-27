"use client";

import { useSession } from "@/lib/auth-client";
import { useTheme } from "next-themes";
import { Bell, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const { data: session } = useSession();
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <header className="flex h-16 items-center justify-between border-b border-border/50 bg-card/50 px-6 backdrop-blur-xl">
      <div>
        <h1 className="text-lg font-semibold">
          Welcome back{session?.user?.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your Instagram automation
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            3
          </span>
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        <div className="ml-2 flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary p-0.5">
            <div className="flex h-full w-full items-center justify-center rounded-full bg-background text-sm font-medium">
              {session?.user?.name?.[0]?.toUpperCase() || "U"}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
