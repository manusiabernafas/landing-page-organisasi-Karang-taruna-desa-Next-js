"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, FlaskConical, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/form";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";
import { loginAction } from "@/lib/actions/auth";

interface DemoInfo {
  password: string;
  accounts: { email: string; role: string; name: string; note: string }[];
}

export function LoginForm({ next, demo }: { next?: string; demo?: DemoInfo }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "", remember: true },
  });
  const { errors } = form.formState;

  function loginAsDemo(email: string) {
    if (!demo) return;
    form.setValue("email", email, { shouldValidate: true });
    form.setValue("password", demo.password, { shouldValidate: true });
    void onSubmit();
  }

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    start(async () => {
      const res = await loginAction({ ...values, next });
      if (res && !res.ok) setError(res.error);
    });
  });

  return (
    <>
    <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4 rounded-3xl border border-border bg-surface p-5 shadow-soft sm:p-6">
      {error ? (
        <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
      <Field label="Email" htmlFor="email" error={errors.email?.message} required>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="nama@email.com"
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? "email-error" : undefined}
          {...form.register("email")}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={errors.password?.message} required>
        <div className="relative">
          <Input
            id="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            className="pr-12"
            aria-invalid={Boolean(errors.password)}
            aria-describedby={errors.password ? "password-error" : undefined}
            {...form.register("password")}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute top-1/2 right-1.5 inline-flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-bg-soft"
            aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>
      <div className="flex items-center justify-between gap-3">
        <Checkbox label="Ingat sesi saya" {...form.register("remember")} />
        <Link href="/lupa-password" className="text-sm font-semibold text-grass-600 hover:underline">
          Lupa password?
        </Link>
      </div>
      <Button type="submit" size="lg" className="w-full" loading={pending}>
        {!pending ? <LogIn /> : null} Masuk Basecamp
      </Button>
    </form>
    {demo ? (
      <section aria-labelledby="demo-title" className="mt-5 rounded-3xl border-2 border-dashed border-gold/60 bg-gold-100 p-4 sm:p-5">
        <h2 id="demo-title" className="flex items-center gap-2 text-sm font-extrabold text-text">
          <FlaskConical className="size-4 text-gold-600" aria-hidden /> Mode demo · data masih contoh
        </h2>
        <p className="mt-1 text-xs text-muted">
          Pencet salah satu akun untuk langsung masuk. Password semua akun:{" "}
          <code className="rounded bg-surface px-1.5 py-0.5 font-mono font-bold text-text">{demo.password}</code>
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {demo.accounts.map((a) => (
            <li key={a.email}>
              <button
                type="button"
                disabled={pending}
                onClick={() => loginAsDemo(a.email)}
                className="flex w-full flex-col items-start rounded-2xl border border-border bg-surface px-3.5 py-2.5 text-left transition-colors hover:border-grass disabled:opacity-60"
              >
                <span className="text-sm font-bold text-text">{a.role}</span>
                <span className="text-xs text-muted">
                  {a.name} · {a.note}
                </span>
                <span className="mt-0.5 font-mono text-[11px] break-all text-subtle">{a.email}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    ) : null}
    </>
  );
}
