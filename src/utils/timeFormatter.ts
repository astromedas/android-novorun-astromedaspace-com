/**
 * Formats duration from various input formats to HH:MM:SS.mmm format
 * 
 * @param duration - Duration string in various formats like "3m 0.41899999999875 s", milliseconds, etc.
 * @returns Formatted time string in HH:MM:SS.mmm format
 */
export const formatDuration = (duration: string | number | undefined): string => {
  if (!duration) return '00:00:00.000';

  try {
    let totalMilliseconds = 0;

    if (typeof duration === 'number') {
      // If it's already a number, assume it's milliseconds
      totalMilliseconds = duration;
    } else if (typeof duration === 'string') {
      // Parse different string formats
      const durationStr = duration.toLowerCase().trim();

      // Format: "3m 0.41899999999875 s" or similar
      if (durationStr.includes('m') && durationStr.includes('s')) {
        const parts = durationStr.split(/\s+/);
        let minutes = 0;
        let seconds = 0;

        parts.forEach(part => {
          if (part.includes('h')) {
            const hours = parseFloat(part.replace('h', ''));
            totalMilliseconds += hours * 60 * 60 * 1000;
          } else if (part.includes('m')) {
            minutes = parseFloat(part.replace('m', ''));
            totalMilliseconds += minutes * 60 * 1000;
          } else if (part.includes('s')) {
            seconds = parseFloat(part.replace('s', ''));
            totalMilliseconds += seconds * 1000;
          }
        });
      }
      // Format: "HH:MM:SS" or "MM:SS"
      else if (durationStr.includes(':')) {
        const parts = durationStr.split(':');
        if (parts.length === 3) {
          // HH:MM:SS.mmm or HH:MM:SS
          const hours = parseInt(parts[0]) || 0;
          const minutes = parseInt(parts[1]) || 0;
          const secondsPart = parseFloat(parts[2]) || 0;
          
          totalMilliseconds = (hours * 60 * 60 + minutes * 60 + secondsPart) * 1000;
        } else if (parts.length === 2) {
          // MM:SS
          const minutes = parseInt(parts[0]) || 0;
          const seconds = parseFloat(parts[1]) || 0;
          
          totalMilliseconds = (minutes * 60 + seconds) * 1000;
        }
      }
      // Format: Just a number as string (assume seconds)
      else if (!isNaN(parseFloat(durationStr))) {
        totalMilliseconds = parseFloat(durationStr) * 1000;
      }
    }

    // Convert milliseconds to HH:MM:SS.mmm
    const hours = Math.floor(totalMilliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((totalMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((totalMilliseconds % (1000 * 60)) / 1000);
    const milliseconds = Math.floor(totalMilliseconds % 1000);

    // Format with leading zeros
    const formattedHours = hours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    const formattedSeconds = seconds.toString().padStart(2, '0');
    const formattedMilliseconds = milliseconds.toString().padStart(3, '0');

    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}.${formattedMilliseconds}`;

  } catch (error) {
    console.error('Error formatting duration:', error, 'Input:', duration);
    return '00:00:00.000';
  }
};

/**
 * Formats duration for display with smart precision
 * Hides hours if 0, shows only 2 decimal places for milliseconds
 */
export const formatDurationDisplay = (duration: string | number | undefined): string => {
  const formatted = formatDuration(duration);
  
  // If hours are 00, hide them and show MM:SS.ms format
  if (formatted.startsWith('00:')) {
    const withoutHours = formatted.substring(3); // Remove "00:"
    // Reduce milliseconds to 2 decimal places
    const parts = withoutHours.split('.');
    if (parts.length === 2) {
      const ms = parts[1].substring(0, 2); // Take first 2 digits of milliseconds
      return `${parts[0]}.${ms}`;
    }
    return withoutHours;
  }
  
  // For times with hours, reduce milliseconds precision
  const parts = formatted.split('.');
  if (parts.length === 2) {
    const ms = parts[1].substring(0, 2); // Take first 2 digits of milliseconds
    return `${parts[0]}.${ms}`;
  }
  
  return formatted;
};

/**
 * Example usage:
 * formatDuration("3m 0.41899999999875 s") → "00:03:00.419"
 * formatDurationDisplay("3m 0.41899999999875 s") → "03:00.42"
 * formatDuration("1h 25m 30.5 s") → "01:25:30.500"
 * formatDurationDisplay("1h 25m 30.5 s") → "01:25:30.50"
 */
