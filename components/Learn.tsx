"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LESSONS, lessonById } from "@/lib/lessons/lessons";

/** Renders `inline code` spans. */
function Rich({ text }: { text: string }) {
  return <>{text.split("`").map((part, i) => (i % 2 ? <code key={i} className="rounded bg-black/50 px-1 text-indigo-200">{part}</code> : part))}</>;
}

/** Lesson reader: the list at /learn, one lesson at /learn#<id> (static export friendly). */
export default function Learn() {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const read = () => setId(window.location.hash.slice(1) || null);
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);
  const lesson = id ? lessonById(id) : undefined;

  return (
    <main className="mx-auto grid max-w-2xl gap-4 px-4 py-6">
      <nav className="flex items-center justify-between text-sm">
        <Link href="/" className="underline">Title</Link>
        {lesson ? <a href="#" className="underline" onClick={() => setId(null)}>All lessons</a> : <Link href="/battle" className="underline">Card battle</Link>}
      </nav>
      {lesson ? (
        <article className="grid gap-4" aria-label={lesson.title}>
          <h1 className="font-display text-2xl text-[var(--accent)]">{lesson.title}</h1>
          <p className="text-slate-200">{lesson.intro}</p>
          {lesson.sections.map((s) => (
            <section key={s.heading} className="grid gap-2">
              <h2 className="font-display text-lg">{s.heading}</h2>
              <p className="text-sm leading-relaxed text-slate-300"><Rich text={s.text} /></p>
              {s.code && (
                <div className="grid gap-1">
                  <pre className="overflow-x-auto rounded border border-indigo-300/30 bg-black/60 p-3 text-xs leading-snug"><code>{s.code.join("\n")}</code></pre>
                  <pre className="overflow-x-auto rounded border border-emerald-300/30 bg-emerald-950/40 p-3 text-xs leading-snug" aria-label="Output"><code>{s.output || "(no output)"}</code></pre>
                </div>
              )}
            </section>
          ))}
          <section className="rounded border-2 border-indigo-300/40 bg-slate-900/60 p-3">
            <h2 className="font-display text-base">Remember</h2>
            <ul className="mt-1 list-disc pl-5 text-sm text-slate-200">{lesson.takeaways.map((t) => <li key={t}><Rich text={t} /></li>)}</ul>
          </section>
          <section className="rounded border-2 border-rose-300/40 bg-rose-950/30 p-3">
            <h2 className="font-display text-base">Common trap</h2>
            <p className="text-sm text-slate-200"><Rich text={lesson.trap} /></p>
          </section>
          <Link href="/battle" className="px-btn px-btn-primary px-4 py-3 text-center">Practise in a card battle</Link>
        </article>
      ) : (
        <>
          <h1 className="font-display text-2xl text-[var(--accent)]">Python Port lessons</h1>
          <p className="text-sm text-slate-300">Short lessons for every topic in the Python deck. Every example output was produced by running the code.</p>
          <ul className="grid gap-2">
            {LESSONS.map((l) => (
              <li key={l.id}>
                <a href={`#${l.id}`} className="block min-h-11 rounded border-2 border-indigo-300/40 bg-slate-900/60 p-3 hover:border-indigo-300">
                  <span className="font-display">{l.title}</span>
                  <span className="block text-xs text-slate-400">{l.sections.length} parts · {l.topics.length} card topic{l.topics.length > 1 ? "s" : ""}</span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
    </main>
  );
}
