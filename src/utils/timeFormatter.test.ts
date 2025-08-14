// Test file for timeFormatter - you can run these tests to verify formatting works correctly

import { formatDuration, formatDurationDisplay } from './timeFormatter';

// Test cases to verify the formatter works correctly
console.log('Testing formatDuration and formatDurationDisplay:');

// Test case 1: "3m 0.41899999999875 s" format
console.log('Input: "3m 0.41899999999875 s"');
console.log('formatDuration:', formatDuration("3m 0.41899999999875 s"));
console.log('formatDurationDisplay:', formatDurationDisplay("3m 0.41899999999875 s"));
console.log('');

// Test case 2: "1h 25m 30.5 s" format
console.log('Input: "1h 25m 30.5 s"');
console.log('formatDuration:', formatDuration("1h 25m 30.5 s"));
console.log('formatDurationDisplay:', formatDurationDisplay("1h 25m 30.5 s"));
console.log('');

// Test case 3: Already formatted time
console.log('Input: "00:05:30.250"');
console.log('formatDuration:', formatDuration("00:05:30.250"));
console.log('formatDurationDisplay:', formatDurationDisplay("00:05:30.250"));
console.log('');

// Test case 4: Number input (seconds)
console.log('Input: 180.5 (number)');
console.log('formatDuration:', formatDuration(180.5));
console.log('formatDurationDisplay:', formatDurationDisplay(180.5));
console.log('');

// Test case 5: Edge cases
console.log('Input: undefined');
console.log('formatDuration:', formatDuration(undefined));
console.log('formatDurationDisplay:', formatDurationDisplay(undefined));

/*
Expected outputs:
Input: "3m 0.41899999999875 s"
formatDuration: 00:03:00.419
formatDurationDisplay: 03:00.42

Input: "1h 25m 30.5 s"  
formatDuration: 01:25:30.500
formatDurationDisplay: 01:25:30.50

Input: "00:05:30.250"
formatDuration: 00:05:30.250
formatDurationDisplay: 05:30.25

Input: 180.5 (number)
formatDuration: 00:03:00.500
formatDurationDisplay: 03:00.50

Input: undefined
formatDuration: 00:00:00.000
formatDurationDisplay: 00:00.00
*/
