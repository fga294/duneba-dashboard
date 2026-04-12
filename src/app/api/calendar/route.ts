import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { google } from "googleapis";
import type { CalendarEvent } from "@/types/dashboard";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({ access_token: session.accessToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  const targetName = process.env.CALENDAR_NAME || "Family";

  try {
    // Resolve calendar ID by name (falls back to primary if not found)
    const calList = await calendar.calendarList.list();
    const match = calList.data.items?.find(
      (c) => c.summary === targetName || c.summaryOverride === targetName
    );
    const calendarId = match?.id || "primary";

    const res = await calendar.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: endOfWeek.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 20,
    });

    const events: CalendarEvent[] = (res.data.items || []).map((event) => ({
      id: event.id || "",
      summary: event.summary || "(No title)",
      start: event.start?.dateTime || event.start?.date || "",
      end: event.end?.dateTime || event.end?.date || "",
      allDay: !event.start?.dateTime,
      color: event.colorId || "default",
      location: event.location || undefined,
    }));

    return NextResponse.json(events);
  } catch (err) {
    console.error("Calendar API error:", err);
    return NextResponse.json({ error: "Calendar API error" }, { status: 502 });
  }
}
