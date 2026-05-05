"use client";

import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";

import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSidebar } from "@/components/ui/sidebar";
import { routes } from "@/lib/routes";

import { Logo } from "./logo";

interface BrandHeaderProps {
  userEmail?: string | null;
  signOutAction: () => Promise<void>;
}

export function BrandHeader({ userEmail, signOutAction }: BrandHeaderProps) {
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : "ME";

  return (
    <header className="fixed z-50 w-full border-border border-b bg-background">
      <div className="flex h-16 items-center justify-between px-2">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            className="hidden size-8 md:flex"
            onClick={toggleSidebar}
            aria-label={isCollapsed ? "Open sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <Menu className="size-4" /> : <X className="size-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="size-8 md:hidden"
            onClick={toggleSidebar}
            aria-label="Open sidebar"
          >
            <Menu className="size-4" />
          </Button>

          <Link href={routes.customer.dashboard()} className="flex items-center">
            <Logo />
          </Link>
        </div>

        <div className="flex items-center gap-2 px-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8 rounded-full">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <span className="text-xs">{initials}</span>
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              {userEmail && (
                <>
                  <DropdownMenuLabel className="truncate font-normal text-muted-foreground">
                    {userEmail}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </>
              )}
              <form action={signOutAction}>
                <DropdownMenuItem asChild>
                  <button type="submit" className="w-full cursor-pointer">
                    <LogOut className="mr-2 size-4" />
                    Sign out
                  </button>
                </DropdownMenuItem>
              </form>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
