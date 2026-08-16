import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabaseAdmin";

type KnowledgeRow = {
  category: string;
  title: string;
  content: string;
  priority: number;
};

export async function getActiveKnowledgeText(): Promise<string> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("ai_knowledge_entries")
    .select("category, title, content, priority")
    .eq("active", true)
    .order("priority", { ascending: true })
    .order("title", { ascending: true })
    .limit(80);

  if (error) {
    console.error("Erro ao carregar conhecimento da IA:", error);
    return "";
  }

  return ((data ?? []) as KnowledgeRow[])
    .map(
      (entry) =>
        `- [${entry.category}] ${entry.title}: ${entry.content}`
    )
    .join("\n");
}
