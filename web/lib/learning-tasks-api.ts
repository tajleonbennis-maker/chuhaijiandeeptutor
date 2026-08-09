import { apiFetch, apiUrl } from "@/lib/api";

export type LessonStepKind =
  | "warmup"
  | "read"
  | "vocabulary"
  | "practice"
  | "discussion"
  | "quiz"
  | "summary";

export interface LessonStep {
  id: string;
  title: string;
  description: string;
  content: string;
  kind: LessonStepKind;
  prompt: string;
}

export interface LearningTask {
  id: string;
  title: string;
  description: string;
  subject: string;
  grade: string;
  difficulty: string;
  duration_minutes: number;
  objectives: string[];
  knowledge_bases: string[];
  steps: LessonStep[];
  status: "draft" | "published";
  due_at: string | null;
  created_by: { user_id: string; username: string; role: string };
  created_at: string;
  updated_at: string;
  progress: {
    status: "not_started" | "in_progress" | "completed";
    completed_step_ids: string[];
    reflection: string;
  };
  progress_percent: number;
}

export async function listLearningTasks(): Promise<{
  tasks: LearningTask[];
  can_manage: boolean;
}> {
  const response = await apiFetch(apiUrl("/api/v1/learning-tasks"));
  if (!response.ok) throw new Error("Unable to load learning tasks");
  return response.json();
}

export async function getLearningTask(id: string): Promise<LearningTask> {
  const response = await apiFetch(
    apiUrl(`/api/v1/learning-tasks/${encodeURIComponent(id)}`),
  );
  if (!response.ok) throw new Error("Unable to load learning task");
  return response.json();
}

export async function createLearningTask(payload: Record<string, unknown>) {
  const response = await apiFetch(apiUrl("/api/v1/learning-tasks"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<LearningTask>;
}

export async function publishLearningTask(id: string) {
  const response = await apiFetch(
    apiUrl(`/api/v1/learning-tasks/${encodeURIComponent(id)}/publish`),
    { method: "POST" },
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<LearningTask>;
}

export async function replaceLearningTask(
  id: string,
  payload: Record<string, unknown>,
) {
  const response = await apiFetch(
    apiUrl(`/api/v1/learning-tasks/${encodeURIComponent(id)}`),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<LearningTask>;
}

export async function saveLearningTaskProgress(
  id: string,
  completedStepIds: string[],
  reflection = "",
) {
  const response = await apiFetch(
    apiUrl(`/api/v1/learning-tasks/${encodeURIComponent(id)}/progress`),
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        completed_step_ids: completedStepIds,
        status: completedStepIds.length ? "in_progress" : "not_started",
        reflection,
      }),
    },
  );
  if (!response.ok) throw new Error(await response.text());
  return response.json() as Promise<LearningTask>;
}
