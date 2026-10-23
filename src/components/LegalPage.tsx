import Image from "next/image";
import Link from "next/link";
import { Wordmark } from "./AppNav";
import { Markdown } from "./Markdown";

export function LegalPage({ text, updatedAt }: { text: string; updatedAt: string }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/brand/mark.png" alt="" width={36} height={43} className="h-10 w-auto" />
            <Wordmark className="text-xl" />
          </Link>
          <nav className="ml-auto flex gap-4 text-sm text-muted">
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <Markdown text={text} />
        <p className="mt-6 text-xs text-muted">Last updated {updatedAt}</p>
      </main>
    </div>
  );
}
