"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { resetSchema } from "@/lib/validations/auth";
import { resetPasswordAction } from "@/lib/actions/auth";

export function ResetForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm<z.infer<typeof resetSchema>>({ resolver: zodResolver(resetSchema), defaultValues: { password: "", confirm: "" } });
  const { errors } = form.formState;
  return (
    <form
      noValidate
      className="mt-6 space-y-4 rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-6"
      onSubmit={form.handleSubmit((v) =>
        start(async () => {
          const res = await resetPasswordAction(v);
          if (res.ok) {
            toast.success(res.message);
            router.replace("/dashboard");
          } else toast.error(res.error);
        }),
      )}
    >
      <Field label="Password baru" htmlFor="password" error={errors.password?.message} required>
        <Input id="password" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.password)} {...form.register("password")} />
      </Field>
      <Field label="Ulangi password" htmlFor="confirm" error={errors.confirm?.message} required>
        <Input id="confirm" type="password" autoComplete="new-password" aria-invalid={Boolean(errors.confirm)} {...form.register("confirm")} />
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {!pending ? <KeyRound /> : null} Simpan password
      </Button>
    </form>
  );
}
