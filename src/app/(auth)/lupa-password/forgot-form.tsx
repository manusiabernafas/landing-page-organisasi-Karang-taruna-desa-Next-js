"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MailCheck, Send } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { forgotSchema } from "@/lib/validations/auth";
import { forgotPasswordAction } from "@/lib/actions/auth";

export function ForgotForm() {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState<string | null>(null);
  const form = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), defaultValues: { email: "" } });
  const err = form.formState.errors.email?.message;

  if (sent) {
    return (
      <div role="status" className="mt-6 flex gap-3 rounded-3xl border border-border bg-surface p-5">
        <MailCheck className="size-6 shrink-0 text-grass" aria-hidden />
        <p className="text-sm">{sent}</p>
      </div>
    );
  }
  return (
    <form
      noValidate
      className="mt-6 space-y-4 rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-6"
      onSubmit={form.handleSubmit((v) =>
        start(async () => {
          const res = await forgotPasswordAction(v);
          if (res.ok) setSent(res.message ?? "Tautan sudah dikirim.");
          else form.setError("email", { message: res.error });
        }),
      )}
    >
      <Field label="Email" htmlFor="email" error={err} required>
        <Input id="email" type="email" autoComplete="email" aria-invalid={Boolean(err)} {...form.register("email")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {!pending ? <Send /> : null} Kirim tautan
      </Button>
    </form>
  );
}
