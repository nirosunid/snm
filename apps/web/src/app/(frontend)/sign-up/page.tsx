import { redirect } from "next/navigation";

import { signUp } from "@/lib/auth/actions";
import { AuthForm } from "@/lib/auth/AuthForm";
import { currentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

type SearchParams = Promise<{ next?: string }>;

export default async function SignUpPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await currentUser();
  if (user) redirect(routes.customer.dashboard());

  const params = await searchParams;
  return <AuthForm variant="sign-up" action={signUp} next={params?.next} />;
}
