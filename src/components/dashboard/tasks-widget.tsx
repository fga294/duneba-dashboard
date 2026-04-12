"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Circle, Calendar } from "lucide-react";
import { format, parseISO, isPast } from "date-fns";
import type { TaskList } from "@/types/dashboard";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error(`API error ${r.status}`);
    return r.json();
  });

export function TasksWidget() {
  const { data, isLoading, error } = useSWR<TaskList[]>(
    "/api/tasks",
    fetcher,
    { refreshInterval: 5 * 60 * 1000 }
  );

  if (isLoading) {
    return (
      <Card className="col-span-1 md:col-span-2 lg:col-span-2">
        <CardContent className="p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="col-span-1 md:col-span-2 lg:col-span-2">
        <CardContent className="flex items-center justify-center p-6 text-muted-foreground">
          Tasks unavailable
        </CardContent>
      </Card>
    );
  }

  const taskLists = data || [];
  const totalTasks = taskLists.reduce(
    (sum, list) => sum + list.tasks.length,
    0
  );

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium text-muted-foreground">
          <span className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Tasks
          </span>
          <Badge variant="secondary" className="text-xs">
            {totalTasks}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[320px] pr-3">
          {taskLists.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
              No pending tasks
            </div>
          ) : (
            taskLists.map((list, listIndex) => (
              <div key={list.id}>
                {listIndex > 0 && <Separator className="my-3" />}
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {list.title}
                </div>
                <div className="space-y-1">
                  {list.tasks.map((task) => {
                    const isOverdue = task.due && isPast(parseISO(task.due));
                    return (
                      <div
                        key={task.id}
                        className="flex items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-secondary/50"
                      >
                        <Circle className="mt-0.5 h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm truncate">{task.title}</div>
                          {task.due && (
                            <div
                              className={`flex items-center gap-1 text-xs mt-0.5 ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}
                            >
                              <Calendar className="h-2.5 w-2.5" />
                              {format(parseISO(task.due), "MMM d")}
                              {isOverdue && " — overdue"}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
