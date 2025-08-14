import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';

interface WeekRange {
  startDate: string;
  endDate: string;
}

interface WeekSelectorProps {
  weekRanges: WeekRange[];
  availableWeeks: number[];
  selectedWeek: number | null;
  selectedMonth: number;
  selectedYear: number;
  months: string[];
  onWeekSelect: (week: number) => void;
  onMonthSelect: () => void;
  onBack: () => void;
}

const WeekSelector = ({
  weekRanges,
  availableWeeks,
  selectedWeek,
  selectedMonth,
  selectedYear,
  months,
  onWeekSelect,
  onMonthSelect,
  onBack,
}: WeekSelectorProps) => {
  // Helper function to get day suffix (1st, 2nd, 3rd, etc.)
  const getDaySuffix = (day: number): string => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1:
        return 'st';
      case 2:
        return 'nd';
      case 3:
        return 'rd';
      default:
        return 'th';
    }
  };

  // Find which week contains today's date
  const findCurrentWeek = () => {
    const today = new Date();
    if (
      selectedMonth === today.getMonth() &&
      selectedYear === today.getFullYear()
    ) {
      const todayDate = today.getDate();
      for (let i = 0; i < weekRanges.length; i++) {
        const startDate = new Date(weekRanges[i].startDate);
        const endDate = new Date(weekRanges[i].endDate);
        if (
          todayDate >= startDate.getDate() &&
          todayDate <= endDate.getDate()
        ) {
          return i + 1; // Week number (1-based)
        }
      }
    }
    return null;
  };

  const currentWeek = findCurrentWeek();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Week</Text>
        <TouchableOpacity style={styles.monthButton} onPress={onMonthSelect}>
          <Text style={styles.monthButtonText}>
            {months[selectedMonth]} {selectedYear}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.scrollView}>
        <View style={styles.weeksContainer}>
          {weekRanges.map((weekRange, index) => {
            const weekNum = index + 1;
            const startDate = new Date(weekRange.startDate);
            const endDate = new Date(weekRange.endDate);
            const startDay = startDate.getDate();
            const endDay = endDate.getDate();
            let weekLabel = '';
            if (startDate.getMonth() !== endDate.getMonth()) {
              weekLabel = `${startDay}${getDaySuffix(startDay)} ${months[
                startDate.getMonth()
              ].substring(0, 3)} - ${endDay}${getDaySuffix(endDay)} ${months[
                endDate.getMonth()
              ].substring(0, 3)}`;
            } else if (startDay === endDay) {
              weekLabel = `${startDay}${getDaySuffix(startDay)}`;
            } else {
              weekLabel = `${startDay}${getDaySuffix(
                startDay,
              )} - ${endDay}${getDaySuffix(endDay)}`;
            }

            // Check if this is the current week
            const isCurrentWeek = weekNum === currentWeek;

            return (
              <TouchableOpacity
                key={weekNum}
                style={[
                  styles.weekButton,
                  !availableWeeks.includes(weekNum) &&
                    styles.disabledWeekButton,
                  selectedWeek === weekNum && styles.activeWeekButton,
                  isCurrentWeek && styles.currentWeekButton,
                ]}
                disabled={!availableWeeks.includes(weekNum)}
                onPress={() => onWeekSelect(weekNum)}>
                <Text
                  style={[
                    styles.weekButtonText,
                    !availableWeeks.includes(weekNum) &&
                      styles.disabledWeekButtonText,
                    selectedWeek === weekNum && styles.activeWeekButtonText,
                    isCurrentWeek && styles.currentWeekButtonText,
                  ]}>
                  Week {weekNum} {isCurrentWeek ? '(Current)' : ''}
                </Text>
                <Text style={styles.weekDateRange}>{weekLabel}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={styles.backButtonText}>Back to Today's Report</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    maxHeight: 350,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#002366',
  },
  monthButton: {
    backgroundColor: '#e6eaf0',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 5,
  },
  monthButtonText: {
    color: '#002366',
    fontWeight: '500',
  },
  scrollView: {
    maxHeight: 250,
  },
  weeksContainer: {
    paddingVertical: 5,
  },
  weekButton: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeWeekButton: {
    backgroundColor: '#002366',
  },
  disabledWeekButton: {
    backgroundColor: '#f0f0f0',
    opacity: 0.6,
  },
  weekButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#002366',
  },
  activeWeekButtonText: {
    color: '#fff',
  },
  disabledWeekButtonText: {
    color: '#999',
  },
  weekDateRange: {
    fontSize: 14,
    color: '#666',
  },
  backButton: {
    backgroundColor: '#002366',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  backButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  currentWeekButton: {
    backgroundColor: '#e6f0ff',
    borderWidth: 1,
    borderColor: '#002366',
  },
  currentWeekButtonText: {
    color: '#002366',
    fontWeight: 'bold',
  },
});

export default WeekSelector;
