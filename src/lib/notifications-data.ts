import { createClient } from "@/lib/supabase/client";

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  eventId: string | null;
};

export async function markAllNotificationsRead(): Promise<void> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data: unread } = await supabase
    .from("notifications")
    .select("id")
    .is("read_at", null);

  if (!unread?.length) return;

  await supabase
    .from("notifications")
    .update({ read_at: now })
    .is("read_at", null);
}
