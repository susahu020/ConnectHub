// Minimal RFC 5545 (iCalendar) generator — just enough to produce valid
// VEVENT entries for meeting export/subscription. Deliberately not a full
// RRULE implementation: recurring meetings in this app are already
// materialized as individual Meeting rows (one per occurrence — see
// scheduleMeeting in meeting.controller.ts), so each occurrence is simply
// its own VEVENT rather than one VEVENT plus a recurrence rule. Simpler,
// and avoids subtle RRULE/timezone bugs for a feature this contained.

interface IcsEvent {
  uid: string;
  title: string;
  description?: string;
  start: Date;
  durationMins?: number | null;
  organizerEmail?: string;
  organizerName?: string;
  url?: string;
  cancelled?: boolean;
}

// Folds a line at 75 octets per RFC 5545 §3.1 — most calendar apps are
// lenient about this, but Outlook in particular can misrender long lines
// (e.g. a meeting title with a long name) without it.
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  let result = '';
  let rest = line;
  result += rest.slice(0, 75);
  rest = rest.slice(75);
  while (rest.length > 0) {
    result += '\r\n ' + rest.slice(0, 74);
    rest = rest.slice(74);
  }
  return result;
}

// Escapes text per RFC 5545 §3.3.11 — commas, semicolons, and backslashes
// are structural in ICS and must be escaped or they'll corrupt the file
// (e.g. a meeting titled "Q3 Planning, Part 2" would otherwise split the
// SUMMARY field at the comma).
function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function buildVEvent(event: IcsEvent): string {
  const end = new Date(event.start.getTime() + (event.durationMins || 30) * 60 * 1000);
  const lines = [
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(event.start)}`,
    `DTEND:${formatIcsDate(end)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
  ];
  if (event.description) lines.push(foldLine(`DESCRIPTION:${escapeIcsText(event.description)}`));
  if (event.url) lines.push(`URL:${event.url}`);
  if (event.organizerEmail) {
    lines.push(`ORGANIZER;CN=${escapeIcsText(event.organizerName || event.organizerEmail)}:mailto:${event.organizerEmail}`);
  }
  lines.push(`STATUS:${event.cancelled ? 'CANCELLED' : 'CONFIRMED'}`);
  lines.push('END:VEVENT');
  return lines.map(foldLine).join('\r\n');
}

// Wraps one or more VEVENTs in a full VCALENDAR document. `method` matters
// for calendar apps that support it: PUBLISH for a static single-meeting
// download, REQUEST isn't used here since this app handles invites/RSVPs
// itself rather than through email-based ICS REQUEST/REPLY.
export function buildIcsCalendar(events: IcsEvent[], calendarName?: string): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ConnectHub//Meetings//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  if (calendarName) {
    lines.push(foldLine(`X-WR-CALNAME:${escapeIcsText(calendarName)}`));
  }
  for (const event of events) {
    lines.push(buildVEvent(event));
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n') + '\r\n';
}
