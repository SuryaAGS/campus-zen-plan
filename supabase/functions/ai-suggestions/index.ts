import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's tasks
    const { data: tasks } = await supabase
      .from("tasks")
      .select("title, date, time, priority, category, completed")
      .eq("user_id", user.id)
      .order("date", { ascending: true })
      .limit(50);

    const today = new Date().toISOString().split("T")[0];
    const pending = (tasks || []).filter((t) => !t.completed);
    const completedToday = (tasks || []).filter((t) => t.completed && t.date === today);
    const dueToday = pending.filter((t) => t.date === today);
    const high = pending.filter((t) => t.priority === "High");

    const taskSummary = `
Today: ${today}
Pending tasks: ${pending.length} (${high.length} high priority)
Due today: ${dueToday.length}
Completed today: ${completedToday.length}
Upcoming tasks: ${pending.slice(0, 10).map((t) => `- "${t.title}" (${t.priority}, ${t.category}, due ${t.date}${t.time ? ` at ${t.time}` : ""})`).join("\n")}
    `.trim();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ suggestion: getFallbackSuggestion(pending, high, dueToday) }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a smart productivity coach. Given the user's task data, provide ONE short, actionable tip (max 2 sentences). Use an emoji at the start. Be specific about which task to focus on. Consider time of day, priority, and workload. Don't be generic.`,
          },
          { role: "user", content: taskSummary },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(JSON.stringify({ suggestion: getFallbackSuggestion(pending, high, dueToday) }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const suggestion = data.choices?.[0]?.message?.content || getFallbackSuggestion(pending, high, dueToday);

    return new Response(JSON.stringify({ suggestion }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("AI suggestion error:", error);
    return new Response(JSON.stringify({ suggestion: "✨ Focus on completing one task at a time for maximum productivity." }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getFallbackSuggestion(
  pending: Array<{ title: string; priority: string }>,
  high: Array<{ title: string }>,
  dueToday: Array<{ title: string }>
): string {
  if (pending.length === 0) return "🎉 Amazing! You've completed all your tasks. Time to relax or plan ahead!";
  if (high.length > 3) return "🔴 You have several high-priority tasks. Focus on the most urgent one first — don't multitask!";
  if (dueToday.length > 3) return `📋 ${dueToday.length} tasks due today! Start with the hardest one while your energy is highest.`;
  if (high.length > 0) return `⚡ Start with "${high[0].title}" — it's high priority. Break it into smaller steps if needed.`;
  return "✨ You're on track! Focus on completing one task at a time for maximum productivity.";
}
