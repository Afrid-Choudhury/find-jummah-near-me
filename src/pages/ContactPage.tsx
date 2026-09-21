const CONTACT_EMAIL = "hello@findjummahnearme.com";

export function ContactPage() {
  return (
    <div className="space-y-4 px-4 pt-4">
      <h1 className="font-display text-2xl font-semibold text-night">Get in touch</h1>

      <div className="space-y-4 text-sm text-ink">
        <p>
          <strong className="font-medium text-night">Something wrong with a listing?</strong>{" "}
          The fastest fix is on the masjid&apos;s own page — flag it with 👎, or add the
          correct time directly. Both come straight to the review queue.
        </p>

        <p>
          <strong className="font-medium text-night">Is this your masjid?</strong> If
          you&apos;re an imam, a board member or a volunteer and you&apos;d rather keep
          your own listing accurate, get in touch. Times are better coming from you
          than from us.
        </p>

        <p>
          <strong className="font-medium text-night">A masjid that&apos;s missing?</strong>{" "}
          Send the name and address and it&apos;ll be added.
        </p>

        <p>
          <strong className="font-medium text-night">Anything else</strong> —
          corrections, feedback, or if you want to help:{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-night underline">
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </div>
  );
}
