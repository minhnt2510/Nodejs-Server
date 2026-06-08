function App() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <section className="glass-card animate-slide-up w-full max-w-2xl rounded-[2rem] p-8 text-center">
        <span className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-twitter-blue/15 text-4xl font-black text-twitter-blue">
          X
        </span>
        <p className="text-sm font-semibold uppercase tracking-[0.32em] text-twitter-blue">
          Twitter Social
        </p>
        <h1 className="mt-4 text-balance text-4xl font-black tracking-tight text-twitter-text md:text-6xl">
          React + Tailwind is ready.
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-twitter-muted">
          The frontend shell is now using Tailwind CSS and is ready for auth,
          feeds, profiles, search, and chat screens.
        </p>
      </section>
    </main>
  )
}

export default App
