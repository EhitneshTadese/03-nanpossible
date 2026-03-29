import type { EventRecord } from "@/lib/types";

export function UpcomingEvents({ events }: { events: EventRecord[] }) {
  return (
    <section className="site-panel rounded-[2rem] p-6 md:p-8">
      <p className="eyebrow">Upcoming events</p>
      <h2 className="mt-3 font-display text-3xl text-teal-deep">Chapter events</h2>

      <div className="mt-6 grid gap-3">
        {events.length ? (
          events.map((event) => (
            <article className="feature-card rounded-[1.35rem]" key={event.id}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent">
                {new Date(event.startAt).toLocaleDateString()}
              </p>
              <h3 className="mt-3 text-xl font-semibold text-teal-deep">{event.title}</h3>
              {event.location ? (
                <p className="mt-2 text-sm font-semibold text-foreground/58">{event.location}</p>
              ) : null}
              {event.description ? (
                <p className="mt-3 text-sm leading-7 text-foreground/72">
                  {event.description}
                </p>
              ) : null}
            </article>
          ))
        ) : (
          <article className="feature-card rounded-[1.35rem]">
            <p className="text-base leading-7 text-foreground/72">
              Upcoming chapter events will appear here once they are published.
            </p>
          </article>
        )}
      </div>
    </section>
  );
}
