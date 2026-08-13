import { PencilLine } from "lucide-react";
import { feedbackUrl } from "@/lib/feedback";
import { logEvent } from "@/lib/analytics";

export function SuggestEdit({
  destinationId,
  destinationName,
}: {
  destinationId?: string;
  destinationName?: string;
}) {
  return (
    <div className="text-sm">
      <p className="text-muted-foreground">
        Spot something outdated or incorrect?{" "}
        <a
          href={feedbackUrl("edit", destinationName)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => logEvent("click_source", { context: "suggest_edit", destination: destinationId })}
          className="inline-flex items-center gap-1.5 font-semibold text-primary underline decoration-dotted underline-offset-4 transition hover:brightness-110"
        >
          <PencilLine className="h-3.5 w-3.5" /> Suggest an edit
        </a>
      </p>
      <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground">
        Local knowledge and corrections are welcome. Submissions are reviewed and verified before
        the dataset is updated.
      </p>
    </div>
  );
}
