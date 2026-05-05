import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { BrandHeader } from "@/components/customer/brand-header";
import { BrandSidebar } from "@/components/customer/brand-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { Toaster } from "@/components/ui/sonner";
import { signOut } from "@/lib/auth/actions";
import { currentUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  if (!user) {
    // Token cookie was present (middleware passed) but the session is invalid
    // or expired. Bounce to sign-in, preserving the original path.
    const h = await headers();
    const path =
      h.get("x-pathname") ?? h.get("x-invoke-path") ?? routes.customer.dashboard();
    redirect(routes.signIn({ next: path }));
  }

  return (
    <SidebarProvider>
      <BrandHeader userEmail={user.email} signOutAction={signOut} />
      <BrandSidebar />
      <main className="mt-16 flex w-full justify-center">
        <div className="container px-4 py-8 md:px-6 md:py-12">{children}</div>
      </main>
      <Toaster />
    </SidebarProvider>
  );
}
