import React from 'react';
import {View, Text, StyleSheet, Dimensions} from 'react-native';
import {BarChart} from 'react-native-chart-kit';

interface WeeklyData {
  [date: string]: {
    totalDistance: number;
  };
}

interface Summary {
  totalDistanceWeek: number;
  averageDistancePerDay: number;
  daysWithActivity: number;
}

interface WeeklySummaryProps {
  data: {
    data: WeeklyData;
    summary: Summary;
  };
}

const WeeklySummary: React.FC<WeeklySummaryProps> = ({data}) => {
  if (!data || !data.data || !data.summary) {
    return (
      <View style={styles.container}>
        <Text>No data available for this week.</Text>
      </View>
    );
  }

  const chartData = {
    labels: Object.keys(data.data).map(date => {
      const d = new Date(date);
      return `${d.getDate()}/${d.toLocaleString('en-US', {month: 'short'})}`;
    }),
    datasets: [
      {
        data: Object.values(data.data).map(d => d.totalDistance),
      },
    ],
  };

  const totalDistanceWeek = Object.values(data.data).reduce(
    (sum, day) => sum + day.totalDistance,
    0,
  );
  const activeDays = Object.values(data.data).filter(
    day => day.totalDistance > 0,
  ).length;
  const averageDistancePerDay =
    activeDays > 0 ? totalDistanceWeek / activeDays : 0;
  const activeDaysPercentage = (activeDays / 7) * 100;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Weekly Summary</Text>
      <BarChart
        data={chartData}
        width={Dimensions.get('window').width - 40}
        height={220}
        yAxisLabel=""
        yAxisSuffix=" km"
        chartConfig={{
          backgroundColor: '#ffffff',
          backgroundGradientFrom: '#ffffff',
          backgroundGradientTo: '#ffffff',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(0, 35, 102, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16,
          },
          barPercentage: 0.7,
          propsForLabels: {
            fontSize: 10,
          },
        }}
        style={styles.chart}
        showValuesOnTopOfBars={false}
        fromZero={true}
      />
      <View style={styles.weekSummary}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>Total Distance</Text>
            <Text style={styles.summaryCardValue}>
              {totalDistanceWeek.toFixed(2)}
            </Text>
            <Text style={styles.summaryCardUnit}>kilometers</Text>
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryCardTitle}>Daily Average</Text>
            <Text style={styles.summaryCardValue}>
              {averageDistancePerDay.toFixed(2)}
            </Text>
            <Text style={styles.summaryCardUnit}>km/day</Text>
          </View>
        </View>

        <View style={styles.summaryTextContainer}>
          <Text>Active Days</Text>
          <Text style={styles.summaryValue}>
            {activeDays} of 7<Text style={styles.summaryMetric}> days</Text>
          </Text>
        </View>

        <View style={styles.progressContainer}>
          <View
            style={[styles.progressBar, {width: `${activeDaysPercentage}%`}]}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  weekSummary: {
    backgroundColor: '#f0f4fa',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#e0e6f2',
    width: '100%',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    margin: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryCardTitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  summaryCardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#002366',
  },
  summaryCardUnit: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  summaryTextContainer: {
    fontSize: 15,
    color: '#333',
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#002366',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryValue: {
    fontWeight: 'bold',
    color: '#002366',
  },
  summaryMetric: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  progressContainer: {
    height: 8,
    backgroundColor: '#e6eaf0',
    borderRadius: 4,
    marginTop: 8,
    width: '100%',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#4287f5',
  },
});

export default WeeklySummary;
