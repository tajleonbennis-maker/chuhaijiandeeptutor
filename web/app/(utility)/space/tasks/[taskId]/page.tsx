"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Clipboard,
  Loader2,
  MessageCircle,
} from "lucide-react";
import {
  getLearningTask,
  saveLearningTaskProgress,
  type LearningTask,
} from "@/lib/learning-tasks-api";

export default function LearningTaskDetail({
  params,
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = use(params);
  const [task, setTask] = useState<LearningTask | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [reflection, setReflection] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    getLearningTask(taskId)
      .then((value) => {
        setTask(value);
        setDone(value.progress.completed_step_ids);
        setReflection(value.progress.reflection || "");
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : "加载失败"));
  }, [taskId]);

  const percent = useMemo(
    () => (task?.steps.length ? Math.round((done.length / task.steps.length) * 100) : 0),
    [done.length, task?.steps.length],
  );

  async function persist(nextDone = done, nextReflection = reflection) {
    setSaving(true);
    setError("");
    try {
      const next = await saveLearningTaskProgress(taskId, nextDone, nextReflection);
      setTask(next);
      setDone(next.progress.completed_step_ids);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "保存失败");
    } finally {
      setSaving(false);
    }
  }

  if (!task && !error) {
    return <div className="grid h-72 place-items-center"><Loader2 className="animate-spin text-[var(--muted-foreground)]" /></div>;
  }
  if (!task) {
    return <div className="p-8 text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="mx-auto max-w-4xl px-5 py-6">
      <Link href="/space/tasks" className="inline-flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft size={15} /> 返回教学任务
      </Link>
      <header className="mt-5 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
        <div className="text-xs font-medium text-teal-600">{task.subject} · {task.grade} · {task.duration_minutes} 分钟</div>
        <h1 className="mt-2 font-serif text-2xl font-semibold">{task.title}</h1>
        <p className="mt-2 text-sm leading-relaxed text-[var(--muted-foreground)]">{task.description}</p>
        {task.objectives.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {task.objectives.map((item) => <span key={item} className="rounded-full bg-[var(--muted)] px-2.5 py-1 text-xs">{item}</span>)}
          </div>
        ) : null}
        <div className="mt-5 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--muted)]"><div className="h-full bg-teal-500 transition-all" style={{ width: `${percent}%` }} /></div>
          <span className="text-sm font-medium">{percent}%</span>
        </div>
      </header>

      <div className="mt-6 space-y-4">
        {task.steps.map((step, index) => {
          const complete = done.includes(step.id);
          return (
            <section key={step.id} className={`rounded-2xl border p-5 ${complete ? "border-emerald-500/30 bg-emerald-500/5" : "border-[var(--border)] bg-[var(--card)]"}`}>
              <div className="flex items-start gap-3">
                <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${complete ? "bg-emerald-500 text-white" : "bg-[var(--muted)]"}`}>
                  {complete ? <Check size={16} /> : index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] uppercase tracking-wide text-[var(--muted-foreground)]">{step.kind}</div>
                  <h2 className="mt-0.5 font-semibold">{step.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-[var(--muted-foreground)]">{step.description}</p>
                  {step.content ? (
                    <div className="mt-4 whitespace-pre-wrap rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 text-sm leading-7">
                      {step.content}
                    </div>
                  ) : null}
                  {step.prompt ? (
                    <div className="mt-4 rounded-xl bg-[var(--muted)]/60 p-3 text-sm leading-relaxed">
                      <div className="mb-1 text-xs font-medium text-[var(--muted-foreground)]">给 AI 导师的学习指令</div>
                      {step.prompt}
                    </div>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {step.prompt ? <button onClick={async () => { await navigator.clipboard.writeText(step.prompt); setCopied(step.id); window.setTimeout(() => setCopied(""), 1500); }} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"><Clipboard size={14} />{copied === step.id ? "已复制" : "复制学习指令"}</button> : null}
                    <Link href="/home" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"><MessageCircle size={14} />打开 AI 导师</Link>
                    <button disabled={saving} onClick={() => { const next = complete ? done.filter((id) => id !== step.id) : [...done, step.id]; setDone(next); void persist(next); }} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${complete ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-[var(--primary)] text-[var(--primary-foreground)]"}`}>
                      <CheckCircle2 size={14} />{complete ? "已完成" : "完成本步骤"}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <section className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="font-semibold">我的学习总结</h2>
        <p className="mt-1 text-xs text-[var(--muted-foreground)]">写下今天学到的内容、生词或仍有疑问的地方。</p>
        <textarea value={reflection} onChange={(event) => setReflection(event.target.value)} rows={5} className="mt-3 w-full resize-y rounded-xl border border-[var(--border)] bg-transparent p-3 text-sm" placeholder="例如：今天我学会了……" />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-red-500">{error}</span>
          <button disabled={saving} onClick={() => void persist()} className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-50">{saving ? "保存中…" : "保存总结"}</button>
        </div>
      </section>
    </div>
  );
}
