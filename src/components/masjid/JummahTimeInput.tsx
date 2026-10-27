import { useId, type ReactNode } from "react";
import { jummahTimeWarning } from "@/lib/timeEntry";
import { formatTime } from "@/lib/utils";

interface JummahTimeInputProps {
  label: ReactNode;
  labelClassName?: string;
  inputClassName?: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

/**
 * A time field that says back what it will save. Time inputs render in the
 * device's locale — "13:15" on one, "1:15" with a small AM/PM toggle on
 * another — so the line underneath spells the value out, and warns when it
 * falls outside Jummah hours (jummahTimeWarning), with a one-tap PM fix.
 * The line sits outside the <label> so it isn't read as the field's name.
 */
export function JummahTimeInput({
  label,
  labelClassName,
  inputClassName,
  value,
  onChange,
  required = false,
}: JummahTimeInputProps) {
  const hintId = useId();
  const warning = value ? jummahTimeWarning(value) : null;

  return (
    <div>
      <label className={labelClassName}>
        {label}
        <input
          type="time"
          required={required}
          className={inputClassName}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-describedby={hintId}
        />
      </label>
      <p id={hintId} aria-live="polite" className="mt-1 text-xs">
        {warning ? (
          <span className="text-red-700">
            {warning.message}
            {warning.suggestion && (
              <>
                {" "}
                <button
                  type="button"
                  className="font-medium underline"
                  onClick={() => warning.suggestion && onChange(warning.suggestion)}
                >
                  Change to {formatTime(warning.suggestion)}
                </button>
              </>
            )}
          </span>
        ) : (
          value && <span className="text-ink-faint">Saves as {formatTime(value)}</span>
        )}
      </p>
    </div>
  );
}

/**
 * Last check before a time is written: asks to confirm anything outside
 * Jummah hours. True when there's nothing to confirm or the person confirmed.
 */
export function confirmJummahTimes(...values: string[]): boolean {
  const warnings = values.map((v) => (v ? jummahTimeWarning(v) : null)).filter((w) => w !== null);
  if (warnings.length === 0) return true;
  return window.confirm(`${warnings.map((w) => w.message).join("\n")}\n\nSave anyway?`);
}
