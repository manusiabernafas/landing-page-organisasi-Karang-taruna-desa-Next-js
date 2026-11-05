import { requireSession } from "@/lib/auth";

export default async function EventsLayout({ children }: LayoutProps<"/dashboard/events">) {
  await requireSession();
  return <>{children}</>;
}
