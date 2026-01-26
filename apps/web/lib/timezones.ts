import moment from 'moment-timezone';

// Get all timezones from moment-timezone
export const TIMEZONES = moment.tz.names();

// Convert 24-hour to 12-hour format
export function formatTime12Hour(hour: number): string {
  if (hour === 0) return "12 AM";
  if (hour === 12) return "12 PM";
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

// Convert 12-hour format to 24-hour
export function parse12HourTime(time: string): number {
  const match = time.match(/(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  
  let hour = parseInt(match[1]);
  const period = match[2].toUpperCase();
  
  if (period === "AM" && hour === 12) hour = 0;
  if (period === "PM" && hour !== 12) hour += 12;
  
  return hour;
}

// Generate 12-hour time options
export function get12HourOptions(): Array<{ value: number; label: string }> {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    options.push({
      value: hour,
      label: formatTime12Hour(hour),
    });
  }
  return options;
}

// Get timezone display name with offset
export function getTimezoneDisplay(tz: string): string {
  const offset = moment.tz(tz).format('Z');
  return `${tz} (UTC${offset})`;
}

// Group timezones by region
export function getGroupedTimezones(): Record<string, string[]> {
  const grouped: Record<string, string[]> = {
    'Popular': [
      'UTC',
      'America/New_York',
      'America/Los_Angeles',
      'America/Chicago',
      'Europe/London',
      'Europe/Paris',
      'Asia/Tokyo',
      'Asia/Shanghai',
      'Australia/Sydney',
    ],
    'Americas': [],
    'Europe': [],
    'Asia': [],
    'Africa': [],
    'Pacific': [],
    'Other': [],
  };

  TIMEZONES.forEach(tz => {
    if (grouped.Popular.includes(tz)) return;
    
    if (tz.startsWith('America/')) grouped.Americas.push(tz);
    else if (tz.startsWith('Europe/')) grouped.Europe.push(tz);
    else if (tz.startsWith('Asia/')) grouped.Asia.push(tz);
    else if (tz.startsWith('Africa/')) grouped.Africa.push(tz);
    else if (tz.startsWith('Pacific/') || tz.startsWith('Australia/')) grouped.Pacific.push(tz);
    else grouped.Other.push(tz);
  });

  // Remove empty groups
  Object.keys(grouped).forEach(key => {
    if (grouped[key].length === 0) delete grouped[key];
  });

  return grouped;
}
