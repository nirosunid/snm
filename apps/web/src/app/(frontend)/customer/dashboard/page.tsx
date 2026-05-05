import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { currentUser, isStaff } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export default async function DashboardPage() {
  // Layout already enforces auth, so user is guaranteed non-null here — but
  // call again for the typed shape (and so this page works if the layout
  // contract ever changes).
  const user = await currentUser();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          Welcome{user.email ? `, ${user.email.split("@")[0]}` : ""}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {isStaff(user)
            ? `Signed in as ${user.role}.`
            : "You're all set up. Here's what's next."}
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>You don&apos;t have any brands yet</CardTitle>
          <CardDescription>
            Brands hold the voice, palette, and assets your AI agents draft against.
            You can spin up a draft right now using the playground brief while we
            build out brand creation.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button asChild>
            <Link href={routes.customer.generate()}>
              Open the generate playground
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardFooter>
      </Card>

      {isStaff(user) && (
        <Card>
          <CardContent className="text-sm text-muted-foreground">
            Operational tools live in the{" "}
            <Link href={routes.admin()} className="font-medium text-foreground underline-offset-4 hover:underline">
              Payload admin
            </Link>
            .
          </CardContent>
        </Card>
      )}
    </div>
  );
}
