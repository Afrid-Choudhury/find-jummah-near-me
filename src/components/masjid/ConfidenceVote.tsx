import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui";
import { masjidKeys } from "@/hooks/useMasjids";
import { getExistingVote, submitVote, type VoteKind } from "@/services/feedbackService";

interface ConfidenceVoteProps {
  masjidId: string;
  /**
   * Scopes the vote to one schedule instead of the whole listing. This is
   * what can retract a community time, so it's tracked separately — the
   * localStorage guard is per-schedule too.
   */
  jummahTimeId?: string;
}

const COPY = {
  masjid: {
    prompt: "Does this information look right?",
    confirm: "👍 Looks right",
    report: "👎 Report an issue",
    confirmed: "Thanks — you confirmed this listing looks right.",
    reported: "Thanks — this listing has been flagged for review.",
  },
  time: {
    prompt: "Have you prayed here? Help confirm this time.",
    confirm: "👍 This is right",
    report: "👎 This is wrong",
    confirmed: "Thanks — you confirmed this time.",
    reported: "Thanks — enough reports and this time comes down.",
  },
} as const;

/**
 * "Does this look right?" — the only way users influence data. Votes are
 * anonymous, append-only signals; nobody edits a schedule directly.
 */
export function ConfidenceVote({ masjidId, jummahTimeId }: ConfidenceVoteProps) {
  const queryClient = useQueryClient();
  const [voted, setVoted] = useState<VoteKind | null>(() =>
    getExistingVote(masjidId, jummahTimeId),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const copy = jummahTimeId ? COPY.time : COPY.masjid;

  const vote = async (kind: VoteKind) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await submitVote(masjidId, kind, jummahTimeId);
      setVoted(kind);
      await queryClient.invalidateQueries({ queryKey: masjidKeys.all });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (voted) {
    return (
      <p className="text-sm text-ink-muted">
        {voted === "confirm" ? copy.confirmed : copy.reported}
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-ink-muted">{copy.prompt}</p>
      <div className="mt-2 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={isSubmitting}
          onClick={() => void vote("confirm")}
        >
          {copy.confirm}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={isSubmitting}
          onClick={() => void vote("report")}
        >
          {copy.report}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
