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
          <h2 className="font-display text-lg font-semibold text-night">This only works with help</h2>
          <p className="mt-1">
            No one person can keep hundreds of Friday schedules accurate. Times shift
            with the seasons, masjids add a second khutbah as they outgrow the first,
            a musalla opens in a basement that nobody has listed yet. The only version
            of this that stays true is one maintained by the people who actually pray
            at these masjids.
          </p>
          <p className="mt-3">
            So it&apos;s open. If you know a time that&apos;s missing, add it — you
            don&apos;t need an account. If you prayed somewhere last Friday and the
            time here was right, tap 👍; if it was wrong, tap 👎. If a masjid isn&apos;t
            listed at all, send it. Each of those takes a few seconds, and together
            they do something no amount of work by one person could.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-night">About the times</h2>
          <p className="mt-1">
            You&apos;ll see two kinds of time here, and the difference is deliberate.
          </p>
          <p className="mt-3">
            <strong className="font-semibold text-night">Verified</strong> times have
            been confirmed directly with the masjid. Each one shows the date it was
            last checked.
          </p>
          <p className="mt-3">
            <strong className="font-semibold text-night">Community times</strong> are
            sent in by someone in the community and haven&apos;t been checked by us.
            They&apos;re published anyway — a time you can check beats a blank space
            — and labelled &ldquo;not yet confirmed&rdquo; until people who&apos;ve
            prayed there tap 👍. Then they show how many have, as in &ldquo;confirmed
            by 3 people.&rdquo; That means other worshippers agree, not that
            we&apos;ve checked it; only verified times carry a date.
          </p>
          <p className="mt-3">
            Every 👎 counts too. A community time that enough people dispute comes
            back down.
          </p>
          <p className="mt-3">
            Either way, schedules change, especially when the clocks do. If
            you&apos;re travelling any distance, call ahead. Phone numbers are on the
            masjid pages where we have them.
          </p>
        </div>

        <div>
          <h2 className="font-display text-lg font-semibold text-night">Who&apos;s behind it</h2>
          <p className="mt-1">
            Built and maintained by Afrid, in Queens — with times and corrections sent
            in by people who pray at these masjids.
          </p>
        </div>
      </div>
    </div>
  );
}
