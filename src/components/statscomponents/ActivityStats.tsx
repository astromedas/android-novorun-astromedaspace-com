import React from 'react';
import {StyleSheet, View, Text, Image} from 'react-native';

interface ActivityStatsProps {
  duration: number;
  distanceCovered: number;
  caloriesBurned: number;
  avgPace: number;
  compact?: boolean;
}

const ActivityStats = ({
  duration,
  distanceCovered,
  caloriesBurned,
  avgPace,
  compact = false,
}: ActivityStatsProps) => {
  const formatDuration = (seconds: number) => {
    const totalSeconds = Math.floor(seconds);
    const minutes = Math.floor(totalSeconds / 60);
    const remainingSeconds = totalSeconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactRow}>
          <View style={styles.compactStat}>
            <Text style={styles.compactValue}>
              {distanceCovered.toFixed(2)}
            </Text>
            <Text style={styles.compactLabel}>Distance (km)</Text>
          </View>
          <View style={styles.compactStat}>
            <Text style={styles.compactValue}>{formatDuration(duration)}</Text>
            <Text style={styles.compactLabel}>Duration</Text>
          </View>
        </View>
        <View style={styles.compactRow}>
          <View style={styles.compactStat}>
            <Text style={styles.compactValue}>{caloriesBurned.toFixed(2)}</Text>
            <Text style={styles.compactLabel}>Calories (cal)</Text>
          </View>
          <View style={styles.compactStat}>
            <Text style={styles.compactValue}>{avgPace.toFixed(2)}</Text>
            <Text style={styles.compactLabel}>Avg. Pace (min/km)</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/novoRUN_circular.png')}
        style={styles.logo}
      />
      <Text style={styles.timer}>{formatDuration(duration)}</Text>
      <Text style={styles.label}>Duration (MM:SS)</Text>
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{distanceCovered.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Distance (km)</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{caloriesBurned.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Calories (cal)</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{avgPace.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Avg. Pace (min/km)</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 20,
    width: '100%',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 15,
  },
  timer: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#002366',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginVertical: 10,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#002366',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  compactContainer: {
    width: '100%',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    marginVertical: 10,
  },
  compactRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  compactStat: {
    flex: 1,
    alignItems: 'center',
  },
  compactValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#002366',
  },
  compactLabel: {
    fontSize: 12,
    color: '#666',
  },
});

export default ActivityStats;
