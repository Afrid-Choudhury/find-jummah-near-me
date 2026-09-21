import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui";
import { masjidKeys } from "@/hooks/useMasjids";
import { getExistingVote, submitVote, type VoteKind } from "@/services/feedbackService";

interface ConfidenceVoteProps {
  masjidId: string;
}

/**
 * "Does this look right?" — the only way users influence data. Votes are
 * anonymous, append-only signals; official schedules stay admin-managed.
 */
export function ConfidenceVote({ masjidId }: ConfidenceVoteProps) {
  const queryClient = useQueryClient();
  const [voted, setVoted] = useState<VoteKind | null>(() => getExistingVote(masjidId));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const vote = async (kind: VoteKind) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await submitVote(masjidId, kind);
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
        {voted === "confirm"
          ? "Thanks — you confirmed this listing looks right."
          : "Thanks — this listing has been flagged for review."}
      </p>
    );
  }

  return (
    <div>
      <p className="text-sm text-ink-muted">Does this information look right?</p>
      <div className="mt-2 flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={isSubmitting}
          onClick={() => void vote("confirm")}
        >
          👍 Looks right
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={isSubmitting}
          onClick={() => void vote("report")}
        >
          👎 Report an issue
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
