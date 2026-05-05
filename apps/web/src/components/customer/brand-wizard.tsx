"use client";

import { ArrowLeft, ArrowRight, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { FONT_OPTIONS } from "@/collections/Brands";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { createBrand, setBrandLogo } from "@/lib/brands/actions";
import { type CreateBrandInputType } from "@/lib/brands/schemas";
import { routes } from "@/lib/routes";

type FormState = CreateBrandInputType;

const INITIAL: FormState = {
  name: "",
  niche: "",
  audience: "",
  tone: "",
  dos: [],
  donts: [],
  vocabulary: [],
  palette: {
    primary: "#0F1419",
    secondary: "#7A8A9A",
    accent: "#C0392B",
    background: "#F4F4F4",
    text: "#0F1419",
  },
  font: "Inter",
};

const STEPS = [
  { key: "identity", title: "Identity" },
  { key: "voice", title: "Voice" },
  { key: "look", title: "Look" },
  { key: "review", title: "Review" },
] as const;
type StepKey = (typeof STEPS)[number]["key"];

export function BrandWizard() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const step: StepKey = STEPS[stepIdx].key;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function updatePalette(
    key: keyof NonNullable<FormState["palette"]>,
    value: string,
  ) {
    setForm((f) => ({ ...f, palette: { ...(f.palette ?? {}), [key]: value } }));
  }

  function canAdvance(): boolean {
    if (step === "identity") return form.name.trim().length > 0;
    return true;
  }

  function next() {
    if (stepIdx < STEPS.length - 1) setStepIdx(stepIdx + 1);
  }
  function back() {
    if (stepIdx > 0) setStepIdx(stepIdx - 1);
  }

  function submit() {
    setError(null);
    start(async () => {
      const res = await createBrand(form);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Upload logo after the brand exists. A logo failure leaves the brand
      // intact — surface the error but still navigate to the detail page so
      // the user can retry from there in a later slice.
      if (logoFile) {
        const fd = new FormData();
        fd.set("brandId", String(res.brandId));
        fd.set("file", logoFile);
        const up = await setBrandLogo(fd);
        if (!up.ok) {
          setError(`Brand created, but logo upload failed: ${up.error}`);
          // Still navigate after a beat so the brand isn't orphaned in UI.
        }
      }
      router.push(routes.customer.brands.detail(res.brandId));
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Create a brand</h1>
        <p className="mt-1 text-muted-foreground">
          Step {stepIdx + 1} of {STEPS.length} — {STEPS[stepIdx].title}
        </p>
      </div>

      <StepRail current={stepIdx} />

      <Card>
        {step === "identity" ? (
          <IdentityStep form={form} update={update} />
        ) : step === "voice" ? (
          <VoiceStep form={form} update={update} />
        ) : step === "look" ? (
          <LookStep
            form={form}
            updatePalette={updatePalette}
            update={update}
            logoFile={logoFile}
            setLogoFile={setLogoFile}
          />
        ) : (
          <ReviewStep form={form} logoFile={logoFile} />
        )}

        {error && (
          <CardContent>
            <Alert variant="destructive">
              <AlertTitle>Could not create brand</AlertTitle>
              <AlertDescription className="break-words whitespace-pre-wrap">
                {error}
              </AlertDescription>
            </Alert>
          </CardContent>
        )}

        <CardFooter className="justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={back}
            disabled={stepIdx === 0 || pending}
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
          {step === "review" ? (
            <Button type="button" onClick={submit} disabled={pending}>
              {pending ? "Creating…" : "Create brand"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={next}
              disabled={!canAdvance() || pending}
            >
              Next
              <ArrowRight className="size-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

function StepRail({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm">
      {STEPS.map((s, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <li
            key={s.key}
            className={
              "flex items-center gap-2 " +
              (state === "active"
                ? "text-foreground"
                : state === "done"
                  ? "text-muted-foreground"
                  : "text-muted-foreground/60")
            }
          >
            <span
              className={
                "flex size-6 items-center justify-center rounded-full border text-xs " +
                (state === "active"
                  ? "border-primary bg-primary text-primary-foreground"
                  : state === "done"
                    ? "border-muted-foreground/40 bg-muted"
                    : "border-muted-foreground/20")
              }
            >
              {i + 1}
            </span>
            <span className="hidden sm:inline">{s.title}</span>
            {i < STEPS.length - 1 && (
              <span className="hidden h-px w-6 bg-border sm:block" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function IdentityStep({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <>
      <CardHeader>
        <CardTitle>Identity</CardTitle>
        <CardDescription>What this brand is and who it talks to.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. Mercedes-Benz"
            autoFocus
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="niche">Niche</Label>
          <Input
            id="niche"
            value={form.niche ?? ""}
            onChange={(e) => update("niche", e.target.value)}
            placeholder="What is this brand about — one line"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audience">Audience</Label>
          <Textarea
            id="audience"
            value={form.audience ?? ""}
            onChange={(e) => update("audience", e.target.value)}
            placeholder="Who is this brand for?"
            rows={3}
          />
        </div>
      </CardContent>
    </>
  );
}

function VoiceStep({
  form,
  update,
}: {
  form: FormState;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
}) {
  return (
    <>
      <CardHeader>
        <CardTitle>Voice</CardTitle>
        <CardDescription>How the brand sounds in writing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tone">Tone</Label>
          <Textarea
            id="tone"
            value={form.tone ?? ""}
            onChange={(e) => update("tone", e.target.value)}
            placeholder="Refined, confident, understated; quality and detail over hype"
            rows={3}
          />
        </div>
        <RowList
          label="Do"
          placeholder="Lead with a specific design or engineering detail"
          items={form.dos}
          onChange={(items) => update("dos", items)}
        />
        <RowList
          label="Don't"
          placeholder="No tired luxury clichés"
          items={form.donts}
          onChange={(items) => update("donts", items)}
        />
        <RowList
          label="Vocabulary"
          placeholder="craftsmanship"
          items={form.vocabulary}
          onChange={(items) => update("vocabulary", items)}
          help="Recurring words or phrases this brand uses."
        />
      </CardContent>
    </>
  );
}

function LookStep({
  form,
  updatePalette,
  update,
  logoFile,
  setLogoFile,
}: {
  form: FormState;
  updatePalette: (
    key: keyof NonNullable<FormState["palette"]>,
    value: string,
  ) => void;
  update: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  logoFile: File | null;
  setLogoFile: (f: File | null) => void;
}) {
  const palette = form.palette ?? {};
  const swatches: { key: keyof NonNullable<FormState["palette"]>; label: string }[] =
    [
      { key: "primary", label: "Primary" },
      { key: "secondary", label: "Secondary" },
      { key: "accent", label: "Accent" },
      { key: "background", label: "Background" },
      { key: "text", label: "Text" },
    ];
  return (
    <>
      <CardHeader>
        <CardTitle>Look</CardTitle>
        <CardDescription>
          Palette, font, and logo. Logo will appear on slides that include it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label>Palette</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {swatches.map(({ key, label }) => (
              <ColorPicker
                key={key}
                label={label}
                value={palette[key] ?? ""}
                onChange={(v) => updatePalette(key, v)}
              />
            ))}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="font">Font</Label>
          <Select
            value={form.font}
            onValueChange={(v) => update("font", v as FormState["font"])}
          >
            <SelectTrigger id="font">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_OPTIONS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        <LogoPicker logoFile={logoFile} setLogoFile={setLogoFile} />
      </CardContent>
    </>
  );
}

function LogoPicker({
  logoFile,
  setLogoFile,
}: {
  logoFile: File | null;
  setLogoFile: (f: File | null) => void;
}) {
  const previewUrl = logoFile ? URL.createObjectURL(logoFile) : null;
  return (
    <div className="space-y-2">
      <Label htmlFor="logo">Logo (optional)</Label>
      <div className="flex items-center gap-3">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt="Logo preview"
            className="size-16 rounded-md border bg-muted object-contain"
          />
        ) : (
          <div className="size-16 rounded-md border bg-muted" aria-hidden />
        )}
        <input
          id="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setLogoFile(f);
          }}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-primary-foreground hover:file:bg-primary/90"
        />
        {logoFile && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => setLogoFile(null)}
            aria-label="Remove logo"
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        PNG, JPG, WEBP, or SVG. Square works best.
      </p>
    </div>
  );
}

function ReviewStep({
  form,
  logoFile,
}: {
  form: FormState;
  logoFile: File | null;
}) {
  const palette = form.palette ?? {};
  const logoPreview = logoFile ? URL.createObjectURL(logoFile) : null;
  return (
    <>
      <CardHeader>
        <CardTitle>Review</CardTitle>
        <CardDescription>Confirm and create.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Field label="Name" value={form.name} />
        <Field label="Niche" value={form.niche || "—"} />
        <Field label="Audience" value={form.audience || "—"} />
        <Field label="Tone" value={form.tone || "—"} />
        <Field
          label="Do"
          value={form.dos.length ? form.dos.map((d) => `• ${d}`).join("\n") : "—"}
          mono
        />
        <Field
          label="Don't"
          value={form.donts.length ? form.donts.map((d) => `• ${d}`).join("\n") : "—"}
          mono
        />
        <Field
          label="Vocabulary"
          value={form.vocabulary.length ? form.vocabulary.join(", ") : "—"}
        />
        <div className="space-y-1">
          <p className="text-muted-foreground">Palette</p>
          <div className="flex gap-2">
            {(["primary", "secondary", "accent", "background", "text"] as const).map(
              (k) => {
                const c = palette[k];
                return (
                  <div key={k} className="flex flex-col items-center gap-1">
                    <div
                      className="size-8 rounded-md border"
                      style={{ background: c || "transparent" }}
                    />
                    <span className="text-xs text-muted-foreground">{k}</span>
                  </div>
                );
              },
            )}
          </div>
        </div>
        <Field label="Font" value={form.font} />
        <div className="space-y-1">
          <p className="text-muted-foreground">Logo</p>
          {logoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoPreview}
              alt="Logo preview"
              className="size-16 rounded-md border bg-muted object-contain"
            />
          ) : (
            <p>—</p>
          )}
        </div>
      </CardContent>
    </>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <p className="text-muted-foreground">{label}</p>
      <p
        className={
          "whitespace-pre-wrap " + (mono ? "font-mono text-xs" : "")
        }
      >
        {value}
      </p>
    </div>
  );
}

function ColorPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  // Native color input always emits 6-digit hex, no empty string. Keep a
  // companion text input so the user can clear or paste hex codes.
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 cursor-pointer rounded-md border bg-transparent p-0"
          aria-label={`${label} color picker`}
        />
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#1A2B3C"
          className="font-mono text-xs"
        />
      </div>
    </div>
  );
}

function RowList({
  label,
  placeholder,
  items,
  onChange,
  help,
}: {
  label: string;
  placeholder: string;
  items: string[];
  onChange: (items: string[]) => void;
  help?: string;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {help && <p className="text-xs text-muted-foreground">{help}</p>}
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => {
                const next = items.slice();
                next[i] = e.target.value;
                onChange(next);
              }}
              placeholder={placeholder}
            />
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label={`Remove ${label.toLowerCase()} ${i + 1}`}
            >
              <X className="size-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onChange([...items, ""])}
        >
          <Plus className="size-4" />
          Add {label.toLowerCase()}
        </Button>
      </div>
    </div>
  );
}
