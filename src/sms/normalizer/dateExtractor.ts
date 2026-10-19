/**
 * Robust date & time extractor from Bangladeshi MFS SMS content
 * Extracts exact transaction time stated inside the message body.
 * Delays caused by lack of internet or offline buffering do NOT distort the time.
 */
export function extractSmsDateTime(content: string, fallbackDate?: Date): Date {
  if (!content) return fallbackDate || new Date();
  const normalized = content.replace(/,/g, " ");

  // 1. DD/MM/YYYY HH:mm(:ss)? (AM/PM)?
  // e.g. "at 19/10/2026 14:30", "Date: 19-10-2026 02:30pm", "Time: 19.10.2026 14:30:15"
  const dmyMatch = normalized.match(
    /(?:at|Time|Date|on)?\s*:?\s*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i
  );
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);
    if (year < 100) year += 2000;

    let hour = parseInt(dmyMatch[4], 10);
    const min = parseInt(dmyMatch[5], 10);
    const sec = dmyMatch[6] ? parseInt(dmyMatch[6], 10) : 0;
    const ampm = dmyMatch[7]?.toLowerCase();

    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;

    // Validate ranges
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && hour >= 0 && hour <= 23 && min >= 0 && min <= 59) {
      const dayStr = String(day).padStart(2, "0");
      const monthStr = String(month).padStart(2, "0");
      const hourStr = String(hour).padStart(2, "0");
      const minStr = String(min).padStart(2, "0");
      const secStr = String(sec).padStart(2, "0");

      const parsed = new Date(`${year}-${monthStr}-${dayStr}T${hourStr}:${minStr}:${secStr}+06:00`);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  // 2. YYYY-MM-DD HH:mm(:ss)? (AM/PM)?
  const ymdMatch = normalized.match(
    /(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i
  );
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    let hour = parseInt(ymdMatch[4], 10);
    const min = parseInt(ymdMatch[5], 10);
    const sec = ymdMatch[6] ? parseInt(ymdMatch[6], 10) : 0;
    const ampm = ymdMatch[7]?.toLowerCase();

    if (ampm === "pm" && hour < 12) hour += 12;
    if (ampm === "am" && hour === 12) hour = 0;

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && hour >= 0 && hour <= 23 && min >= 0 && min <= 59) {
      const dayStr = String(day).padStart(2, "0");
      const monthStr = String(month).padStart(2, "0");
      const hourStr = String(hour).padStart(2, "0");
      const minStr = String(min).padStart(2, "0");
      const secStr = String(sec).padStart(2, "0");

      const parsed = new Date(`${year}-${monthStr}-${dayStr}T${hourStr}:${minStr}:${secStr}+06:00`);
      if (!isNaN(parsed.getTime())) {
        return parsed;
      }
    }
  }

  // 3. Fallback to provided device timestamp or current date
  if (fallbackDate && !isNaN(fallbackDate.getTime())) {
    return fallbackDate;
  }
  return new Date();
}
