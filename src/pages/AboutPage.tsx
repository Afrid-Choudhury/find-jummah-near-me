export function AboutPage() {
  return (
    <div className="space-y-4 px-4 pt-4">
      <h1 className="font-display text-2xl font-semibold text-night">About</h1>

      <div className="space-y-4 text-sm text-ink">
        <p>
          Find Jummah Near Me answers one question: where is the nearest masjid where
          you can still make Jummah today?
        </p>

        <p>
          New York has hundreds of masjids, and their Friday schedules live in a
          dozen scattered places — a website that hasn&apos;t been touched in two
          years, a Facebook post, a WhatsApp group, a sheet of paper taped to the
          door. If you&apos;re new to a neighborhood, working somewhere unfamiliar,
          or just running late, that&apos;s a hard thing to search at 12:40 on a
          Friday.
        </p>

        <p>
          This site lists masjids across Manhattan, Queens and Brooklyn with their
          locations and, as they&apos;re confirmed, their Jummah times. Share your
          location and it sorts by distance, works out which khutbah you can still
          reach on foot or by car, and gives you one tap to directions.
        </p>

        <div>
          <h2 className="font-display text-lg font-semibold text-night">About the times</h2>
          <p className="mt-1">
            Every time here is reviewed before it&apos;s published, and each listing
            shows when it was last verified. Schedules still change — especially
            when the clocks do — so if you&apos;re travelling any distance, call
            ahead. Phone numbers are on the masjid pages where we have them.
          </p>
          <p className="mt-3">
            If something looks wrong, the 👎 on any listing flags it for review. If
            you know a time that&apos;s missing, add it. That&apos;s how this fills
            in.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-night">Who&apos;s behind it</h2>
          <p className="mt-1">Built and maintained by Afrid, in Queens.</p>
        </div>
      </div>
    </div>
  );
}
