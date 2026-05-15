import { CreditCard, ExternalLink } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { openCustomerPortal, startCheckout } from "@/lib/billing/actions";
import { checkPaywall } from "@/lib/billing/paywall";
import { isBillingBypassed } from "@/lib/billing/stripe";
import type { User } from "@/payload-types";

const STATUS_TONE: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  trialing: "default",
  past_due: "destructive",
  unpaid: "destructive",
  canceled: "outline",
  incomplete: "outline",
  incomplete_expired: "outline",
};

export async function SubscriptionCard({ user }: { user: User }) {
  const state = await checkPaywall(user);

  if (isBillingBypassed()) {
    return (
      <Card className="border-dashed">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Subscription (dev)</CardTitle>
              <CardDescription>
                STRIPE_BYPASS=1 — paywall is open, billing is skipped. Set to 0
                in the .env to test the real Checkout + webhook flow.
              </CardDescription>
            </div>
            <Badge variant="outline">bypass</Badge>
          </div>
        </CardHeader>
      </Card>
    );
  }

  if (state.ok && state.reason === "active") {
    const sub = state.subscription;
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle>Pro subscription</CardTitle>
              <CardDescription>
                Renews{" "}
                {sub.currentPeriodEnd
                  ? new Date(sub.currentPeriodEnd).toLocaleDateString()
                  : "—"}
                {sub.cancelAtPeriodEnd
                  ? " — set to cancel at period end."
                  : "."}
              </CardDescription>
            </div>
            <Badge variant={STATUS_TONE[sub.status] ?? "secondary"}>
              {sub.status}
            </Badge>
          </div>
        </CardHeader>
        <CardFooter>
          <form action={openCustomerPortal}>
            <Button type="submit" variant="outline">
              Manage subscription
              <ExternalLink className="size-4" />
            </Button>
          </form>
        </CardFooter>
      </Card>
    );
  }

  // Either no subscription or one that's lapsed.
  const isLapsed = !state.ok && state.reason === "inactive";
  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>
              {isLapsed
                ? "Reactivate Pro"
                : "Subscribe to Pro to start generating"}
            </CardTitle>
            <CardDescription>
              {isLapsed
                ? `Your subscription is currently ${state.status}. Update your payment method or restart it to keep generating.`
                : "Pro is $29/mo — unlimited carousel generations and one-click publishing to Instagram."}
            </CardDescription>
          </div>
          {isLapsed && (
            <Badge variant={STATUS_TONE[state.status] ?? "secondary"}>
              {state.status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardFooter className="flex flex-wrap gap-2">
        <form action={startCheckout}>
          <Button type="submit">
            <CreditCard className="size-4" />
            {isLapsed ? "Resubscribe" : "Subscribe"}
          </Button>
        </form>
        {isLapsed && (
          <form action={openCustomerPortal}>
            <Button type="submit" variant="outline">
              Manage subscription
              <ExternalLink className="size-4" />
            </Button>
          </form>
        )}
      </CardFooter>
    </Card>
  );
}

export function BillingResultBanner({ status }: { status?: string }) {
  if (!status) return null;
  if (status === "success") {
    return (
      <Alert>
        <AlertTitle>Subscription started</AlertTitle>
        <AlertDescription>
          Stripe will confirm via webhook within a few seconds — refresh if the
          status badge below still shows the previous state.
        </AlertDescription>
      </Alert>
    );
  }
  if (status === "canceled") {
    return (
      <Alert variant="destructive">
        <AlertTitle>Checkout canceled</AlertTitle>
        <AlertDescription>
          You can restart it from the Subscribe button below whenever you&apos;re
          ready.
        </AlertDescription>
      </Alert>
    );
  }
  return null;
}
