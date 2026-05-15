import { redirect } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { signIn } from "@/lib/auth/actions";
import { AuthForm } from "@/lib/auth/AuthForm";
import { currentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

type SearchParams = Promise<{ next?: string; deleted?: string }>;

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (user) redirect(routes.customer.dashboard());

  const params = await searchParams;
  return (
    <>
      {params?.deleted && (
        <div className="mx-auto max-w-md px-4 pt-6">
          <Alert>
            <AlertTitle>Your account was deleted</AlertTitle>
            <AlertDescription>
              All your data has been removed from SMN. Some records may
              persist in third-party processors per their own retention
              policies.
            </AlertDescription>
          </Alert>
        </div>
      )}
      <AuthForm variant="sign-in" action={signIn} next={params?.next} />
    </>
  );
}
