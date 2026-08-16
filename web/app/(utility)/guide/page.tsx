"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Database,
  FlaskConical,
  LogIn,
  MessageSquareText,
  Search,
  ShieldCheck,
  UserPlus,
} from "lucide-react";
import { useTranslation } from "react-i18next";

const FEATURES = [
  {
    icon: MessageSquareText,
    zh: "智能对话",
    en: "AI chat",
    zhText: "从首页提出问题，继续追问，并在同一个会话中逐步深入。",
    enText: "Ask from Home, follow up, and develop an idea inside one conversation.",
  },
  {
    icon: FlaskConical,
    zh: "深度研究",
    en: "Deep research",
    zhText: "使用研究能力拆解问题、检索资料，并生成结构化研究结果。",
    enText: "Break down questions, search sources, and produce structured research results.",
  },
  {
    icon: Database,
    zh: "知识库",
    en: "Knowledge base",
    zhText: "登录后管理自己的资料，让回答基于你的文档和长期数据。",
    enText: "After signing in, manage personal sources and ground answers in your documents.",
  },
  {
    icon: BookOpen,
    zh: "学习成果",
    en: "Learning outputs",
    zhText: "把重要内容保存到笔记本，并查看生成的报告、文件和学习记录。",
    enText: "Save useful content to Notebook and revisit reports, files, and learning history.",
  },
];

export default function GuidePage() {
  const { i18n } = useTranslation();
  const zh = i18n.language?.toLowerCase().startsWith("zh");

  return (
    <div className="h-full overflow-y-auto px-5 py-10 [scrollbar-gutter:stable]">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] px-6 py-10 shadow-sm sm:px-10">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
            {zh ? "平台使用指南" : "Platform guide"}
          </p>
          <h1 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-tight text-[var(--foreground)] sm:text-4xl">
            {zh ? "欢迎使用 chuhaijiandeeptutor" : "Welcome to chuhaijiandeeptutor"}
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
            {zh
              ? "你可以免登录直接体验，也可以创建账户长期保存聊天、研究、知识库和生成文件。"
              : "Start immediately as a guest, or create an account to retain chats, research, knowledge bases, and generated files."}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/home"
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
            >
              {zh ? "立即体验" : "Start now"}
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
            >
              <UserPlus size={15} />
              {zh ? "创建账户" : "Create account"}
            </Link>
          </div>
        </div>

        <section className="mt-8">
          <h2 className="font-serif text-2xl font-semibold text-[var(--foreground)]">
            {zh ? "三步开始" : "Get started in three steps"}
          </h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: LogIn,
                step: "01",
                zh: "选择身份",
                en: "Choose how to enter",
                zhText: "游客可直接体验；需要长期保存数据时，请注册并登录。",
                enText: "Continue as a guest, or register and sign in when you want lasting data.",
              },
              {
                icon: Search,
                step: "02",
                zh: "选择工作方式",
                en: "Choose a workflow",
                zhText: "日常问答使用 Chat；复杂课题使用研究、解题或写作能力。",
                enText: "Use Chat for everyday questions, or research, solving, and writing for larger tasks.",
              },
              {
                icon: Bot,
                step: "03",
                zh: "持续迭代",
                en: "Iterate with the tutor",
                zhText: "补充上下文、上传资料、继续追问，并保存重要成果。",
                enText: "Add context, upload sources, ask follow-ups, and save useful results.",
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.step} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
                  <div className="flex items-center justify-between">
                    <Icon size={19} className="text-[var(--primary)]" />
                    <span className="text-xs font-semibold text-[var(--muted-foreground)]/60">{item.step}</span>
                  </div>
                  <h3 className="mt-5 font-medium text-[var(--foreground)]">{zh ? item.zh : item.en}</h3>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">{zh ? item.zhText : item.enText}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-9">
          <h2 className="font-serif text-2xl font-semibold text-[var(--foreground)]">
            {zh ? "你可以做什么" : "What you can do"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.en} className="flex gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h3 className="font-medium text-[var(--foreground)]">{zh ? feature.zh : feature.en}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-[var(--muted-foreground)]">{zh ? feature.zhText : feature.enText}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="my-9 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5 sm:p-6">
          <div className="flex gap-4">
            <ShieldCheck size={21} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <h2 className="font-medium text-[var(--foreground)]">
                {zh ? "账户、数据与权限" : "Accounts, data, and permissions"}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted-foreground)]">
                {zh
                  ? "游客之间的数据相互隔离；注册用户拥有独立的长期空间。模型密钥、服务地址和系统运行参数仅管理员可见和配置。管理员可在用户管理页面查看平台内保存的用户会话和生成文件。"
                  : "Guest data is isolated between visitors, and registered users receive a private persistent workspace. Model credentials, service addresses, and runtime settings are visible only to administrators. Administrators can review retained user sessions and generated files from User Management."}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
