import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface DateNavigatorProps {
  currentDate: string;
  currentIndex: number;
  totalDates: number;
  matchCount: number;
  isAtFirst: boolean;
  isAtLast: boolean;
  onNavigate: (direction: 'prev' | 'next') => void;
  formatDate: (date: string) => string;
}

export const DateNavigator: React.FC<DateNavigatorProps> = ({
  currentDate,
  currentIndex,
  totalDates,
  matchCount,
  isAtFirst,
  isAtLast,
  onNavigate,
  formatDate,
}) => {
  if (totalDates <= 1) return null; // Don't show navigator for single date

  const displayDate = formatDate(currentDate);
  const isToday = currentDate && new Date(currentDate).toDateString() === new Date().toDateString();
  const dateInfo = isToday ? '📅 Today' : displayDate;

  return (
    <View style={styles.dateNavigator}>
      <TouchableOpacity 
        style={[
          styles.dateNavButton,
          isAtFirst && styles.dateNavButtonDisabled
        ]}
        onPress={() => !isAtFirst && onNavigate('prev')}
        disabled={isAtFirst}
      >
        <Text style={[
          styles.dateNavButtonText,
          isAtFirst && styles.dateNavButtonTextDisabled
        ]}>◀</Text>
      </TouchableOpacity>
      
      <View style={styles.dateDisplayContainer}>
        <Text style={styles.dateDisplayText}>{dateInfo}</Text>
        <Text style={styles.datePositionText}>
          {matchCount} matches • {currentIndex + 1} of {totalDates}
        </Text>
      </View>
      
      <TouchableOpacity 
        style={[
          styles.dateNavButton,
          isAtLast && styles.dateNavButtonDisabled
        ]}
        onPress={() => !isAtLast && onNavigate('next')}
        disabled={isAtLast}
      >
        <Text style={[
          styles.dateNavButtonText,
          isAtLast && styles.dateNavButtonTextDisabled
        ]}>▶</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  dateNavigator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateNavButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1B365D',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1B365D',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dateNavButtonDisabled: {
    backgroundColor: '#D1D5DB',
    shadowOpacity: 0,
    elevation: 0,
  },
  dateNavButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  dateNavButtonTextDisabled: {
    color: '#9CA3AF',
  },
  dateDisplayContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 16,
  },
  dateDisplayText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1B365D',
    marginBottom: 4,
  },
  datePositionText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
});