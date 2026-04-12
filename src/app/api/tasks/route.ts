import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";
import type { TaskList, TaskItem } from "@/types/dashboard";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });

  const tasks = google.tasks({ version: "v1", auth: oauth2Client });

  try {
    const listRes = await tasks.tasklists.list({ maxResults: 10 });
    const taskLists: TaskList[] = [];

    for (const list of listRes.data.items || []) {
      const tasksRes = await tasks.tasks.list({
        tasklist: list.id!,
        maxResults: 20,
        showCompleted: false,
        showHidden: false,
      });

      const items: TaskItem[] = (tasksRes.data.items || []).map((task) => ({
        id: task.id || "",
        title: task.title || "(No title)",
        status: (task.status as TaskItem["status"]) || "needsAction",
        due: task.due || undefined,
        notes: task.notes || undefined,
      }));

      if (items.length > 0) {
        taskLists.push({
          id: list.id || "",
          title: list.title || "(Untitled)",
          tasks: items,
        });
      }
    }

    return NextResponse.json(taskLists);
  } catch (err) {
    console.error("Tasks API error:", err);
    return NextResponse.json({ error: "Tasks API error" }, { status: 502 });
  }
}
