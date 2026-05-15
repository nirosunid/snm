"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteMyAccount } from "@/lib/account/actions";
import { routes } from "@/lib/routes";

type Props = { email: string };

export function DeleteAccountCard({ email }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const matches = confirm.trim().toLowerCase() === email.trim().toLowerCase();

  function onDelete() {
    setError(null);
    start(async () => {
      const result = await deleteMyAccount({ confirmEmail: confirm });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      // Server action cleared the auth cookie; bounce to sign-in with a flag.
      router.push(`${routes.signIn()}?deleted=1`);
    });
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="text-destructive">Danger zone</CardTitle>
        <CardDescription>
          Delete your account and every brand, voice sample, asset, content
          job, connected account, and subscription you own. Backups are pruned
          on the same retention schedule.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={pending}>
              Delete my account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This is permanent. To confirm, type your account email below:
                <br />
                <code className="font-mono text-xs">{email}</code>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="confirm-email" className="text-xs">
                Type your email exactly
              </Label>
              <Input
                id="confirm-email"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={email}
                autoComplete="off"
              />
              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Couldn&apos;t delete</AlertTitle>
                  <AlertDescription className="break-words whitespace-pre-wrap">
                    {error}
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirm("")}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                disabled={!matches || pending}
              >
                {pending ? "Deleting…" : "Delete forever"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
