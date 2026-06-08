interface PlaceholderPageProps {
  title: string
  description: string
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <section className="animate-fade-in">
      <header className="sticky top-0 z-20 border-b border-twitter-border bg-twitter-bg/80 px-5 py-4 backdrop-blur-xl">
        <h1 className="text-xl font-black">{title}</h1>
      </header>
      <div className="p-5">
        <div className="rounded-[2rem] border border-dashed border-twitter-border bg-twitter-surface/45 p-8 text-center">
          <p className="text-lg font-black text-twitter-text">{title}</p>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-twitter-muted">{description}</p>
        </div>
      </div>
    </section>
  )
}
