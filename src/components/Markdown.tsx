/** Tiny Markdown renderer for owner-written legal text: headings, paragraphs, bullet lists, bold, links. */
export function Markdown({ text }: { text: string }) {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const inline = (s: string) =>
    s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a class="text-blue underline" href="$2" rel="noreferrer">$1</a>');
  return (
    <div className="prose-sm max-w-none text-sm leading-relaxed">
      {blocks.map((b, i) => {
        const t = b.trim();
        if (!t) return null;
        if (t.startsWith("# ")) return <h1 key={i} className="mb-3 text-2xl font-extrabold tracking-tight">{t.slice(2)}</h1>;
        if (t.startsWith("## ")) return <h2 key={i} className="mb-1 mt-5 text-lg font-bold">{t.slice(3)}</h2>;
        if (t.split("\n").every((l) => /^[-*] /.test(l))) {
          return (
            <ul key={i} className="mb-3 list-disc pl-5">
              {t.split("\n").map((l, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: inline(l.slice(2)) }} />
              ))}
            </ul>
          );
        }
        return <p key={i} className="mb-3" dangerouslySetInnerHTML={{ __html: inline(t).replace(/\n/g, "<br/>") }} />;
      })}
    </div>
  );
}
