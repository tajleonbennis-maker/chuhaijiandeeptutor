"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Loader2,
  Plus,
  Send,
  Users,
  X,
} from "lucide-react";
import {
  createLearningTask,
  listLearningTasks,
  publishLearningTask,
  type LearningTask,
} from "@/lib/learning-tasks-api";

const NYT_STEPS = [
  ["warmup", "标题预测", "阅读标题，在查看摘要前预测新闻内容。"],
  ["vocabulary", "重点词汇", "学习新闻中最有用的词汇和固定搭配。"],
  ["read", "分级阅读", "阅读适合初中水平的简化材料。"],
  ["quiz", "阅读理解", "完成理解题，并查看逐题解释。"],
  ["discussion", "英语对话", "用英语表达观点，由 AI 追问和纠错。"],
  ["summary", "学习总结", "复述新闻并整理今日生词。"],
];

export default function LearningTasksPage() {
  const [tasks, setTasks] = useState<LearningTask[]>([]);
  const [canManage, setCanManage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await listLearningTasks();
      setTasks(result.tasks);
      setCanManage(result.can_manage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => void load(), [load]);

  return (
    <div className="mx-auto max-w-5xl px-5 py-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookOpenCheck className="h-5 w-5 text-teal-600" />
            <h1 className="font-serif text-2xl font-semibold text-[var(--foreground)]">
              教学任务
            </h1>
          </div>
          <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
            按教师教案一步步学习，完成阅读、练习、讨论和总结。
          </p>
        </div>
        {canManage ? (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3.5 py-2 text-sm font-medium text-[var(--primary-foreground)]"
          >
            <Plus size={15} /> 新建教案
          </button>
        ) : null}
      </header>

      {loading ? (
        <div className="grid h-64 place-items-center text-[var(--muted-foreground)]">
          <Loader2 className="animate-spin" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-[var(--border)] p-12 text-center">
          <BookOpenCheck className="mx-auto h-10 w-10 text-[var(--muted-foreground)]/40" />
          <h2 className="mt-4 font-medium">暂时没有学习任务</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            {canManage ? "创建第一份教案并下发给学生。" : "教师下发任务后会显示在这里。"}
          </p>
        </div>
      ) : (
        <div className="mt-7 grid gap-4 md:grid-cols-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              canManage={canManage}
              onPublish={async () => {
                await publishLearningTask(task.id);
                await load();
              }}
            />
          ))}
        </div>
      )}

      {showCreate ? (
        <CreateLessonModal
          onClose={() => setShowCreate(false)}
          onCreated={async () => {
            setShowCreate(false);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function TaskCard({
  task,
  canManage,
  onPublish,
}: {
  task: LearningTask;
  canManage: boolean;
  onPublish: () => Promise<void>;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            <span className="rounded-full bg-teal-500/10 px-2 py-1 text-teal-700 dark:text-teal-300">
              {task.subject}
            </span>
            <span className="rounded-full bg-[var(--muted)] px-2 py-1 text-[var(--muted-foreground)]">
              {task.grade}
            </span>
          </div>
          <h2 className="mt-3 text-lg font-semibold">{task.title}</h2>
        </div>
        <span className={`text-xs ${task.status === "published" ? "text-emerald-600" : "text-amber-600"}`}>
          {task.status === "published" ? "已发布" : "草稿"}
        </span>
      </div>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--muted-foreground)]">
        {task.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-[var(--muted-foreground)]">
        <span className="flex items-center gap-1"><Clock3 size={13} />{task.duration_minutes} 分钟</span>
        <span className="flex items-center gap-1"><CheckCircle2 size={13} />{task.steps.length} 个步骤</span>
        <span className="flex items-center gap-1"><Users size={13} />{task.progress_percent}%</span>
      </div>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--muted)]">
        <div className="h-full rounded-full bg-teal-500" style={{ width: `${task.progress_percent}%` }} />
      </div>
      <div className="mt-5 flex gap-2">
        <Link
          href={`/space/tasks/${encodeURIComponent(task.id)}`}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-medium text-[var(--primary-foreground)]"
        >
          {task.progress_percent ? "继续学习" : "开始学习"}<ArrowRight size={14} />
        </Link>
        {canManage && task.status === "draft" ? (
          <button onClick={() => void onPublish()} className="flex items-center gap-1 rounded-lg border border-[var(--border)] px-3 py-2 text-sm">
            <Send size={14} /> 发布
          </button>
        ) : null}
      </div>
    </article>
  );
}

function CreateLessonModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("今日纽约时报英语");
  const [description, setDescription] = useState("通过纽约时报今日新闻学习词汇、阅读、表达与批判性思考。");
  const [grade, setGrade] = useState("初二—初三");
  const [duration, setDuration] = useState(20);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      await createLearningTask({
        title,
        description,
        subject: "英语",
        grade,
        difficulty: "适中",
        duration_minutes: duration,
        objectives: ["理解新闻标题", "掌握新闻英语词汇", "用英语表达观点"],
        knowledge_bases: ["nyt-english-daily"],
        audience: { type: "all", user_ids: [] },
        publish: true,
        steps: NYT_STEPS.map(([kind, stepTitle, stepDescription], index) => ({
          id: `step_${index + 1}`,
          kind,
          title: stepTitle,
          description: stepDescription,
          content: "",
          prompt: `基于 nyt-english-daily 知识库，引导学生完成“${stepTitle}”。使用适合${grade}学生的中文说明和英文练习。`,
        })),
      });
      onCreated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "创建失败");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-[var(--card)] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <div><h2 className="text-lg font-semibold">新建教案</h2><p className="text-xs text-[var(--muted-foreground)]">已预填“纽约时报英语”示范模板</p></div>
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-[var(--muted)]"><X size={17} /></button>
        </div>
        <div className="mt-5 space-y-4">
          <label className="block text-sm">教案标题<input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2" /></label>
          <label className="block text-sm">简介<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="mt-1.5 w-full resize-none rounded-lg border border-[var(--border)] bg-transparent px-3 py-2" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">适用年级<input value={grade} onChange={(e) => setGrade(e.target.value)} className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2" /></label>
            <label className="text-sm">预计分钟<input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 py-2" /></label>
          </div>
          <div className="rounded-xl bg-[var(--muted)]/50 p-3 text-xs text-[var(--muted-foreground)]">
            <CalendarClock className="mr-1 inline h-3.5 w-3.5" /> 将按“标题预测 → 词汇 → 阅读 → 测验 → 对话 → 总结”发布给全体学生。
          </div>
          {error ? <p className="text-xs text-red-500">{error}</p> : null}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm">取消</button>
          <button disabled={saving || !title.trim()} onClick={() => void submit()} className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-[var(--primary-foreground)] disabled:opacity-50">
            {saving ? "创建中…" : "创建并发布"}
          </button>
        </div>
      </div>
    </div>
  );
}
