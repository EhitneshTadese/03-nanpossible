type ChapterHtmlPageProps = {
  chapterName: string;
  embedded?: boolean;
  html: string;
  title: string;
};

export function ChapterHtmlPage({
  chapterName,
  embedded = false,
  html,
  title,
}: ChapterHtmlPageProps) {
  const content = (
    <section className="site-panel rounded-[2rem] p-7 md:p-10">
      <span className="eyebrow">{chapterName}</span>
      <h1 className="mt-5 font-display text-4xl tracking-[-0.05em] text-teal-deep md:text-6xl">
        {title}
      </h1>
      <div
        className="chapter-html prose mt-8 max-w-none"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );

  if (embedded) {
    return <div className="site-shell py-5">{content}</div>;
  }

  return (
    <div className="page-frame">
      <div className="site-shell">{content}</div>
    </div>
  );
}
