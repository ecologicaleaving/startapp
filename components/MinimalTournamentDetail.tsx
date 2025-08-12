import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Tournament } from '../types/tournament';

interface MinimalTournamentDetailProps {
  tournament: Tournament;
  onBack: () => void;
}

const MinimalTournamentDetail: React.FC<MinimalTournamentDetailProps> = ({ tournament, onBack }) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Tournament Details</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tournament Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Tournament #:</Text>
            <Text style={styles.value}>{tournament.No}</Text>
          </View>
          
          {tournament.Code && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Code:</Text>
              <Text style={styles.value}>{tournament.Code}</Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Text style={styles.label}>Name:</Text>
            <Text style={styles.value}>{tournament.Title || tournament.Name || 'N/A'}</Text>
          </View>
          
          {tournament.StartDate && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Start Date:</Text>
              <Text style={styles.value}>{formatDate(tournament.StartDate)}</Text>
            </View>
          )}
          
          {tournament.EndDate && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>End Date:</Text>
              <Text style={styles.value}>{formatDate(tournament.EndDate)}</Text>
            </View>
          )}
          
          {tournament.Status && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Status:</Text>
              <Text style={[styles.value, styles.statusValue]}>{tournament.Status}</Text>
            </View>
          )}
          
          {tournament.Location && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Location:</Text>
              <Text style={styles.value}>{tournament.Location}</Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>View Matches (Coming Soon)</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>View Schedule (Coming Soon)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    padding: 16,
    paddingTop: 50,
  },
  backButton: {
    marginRight: 16,
  },
  backButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    flex: 2,
    textAlign: 'right',
  },
  statusValue: {
    color: '#4CAF50',
  },
  actionButton: {
    backgroundColor: '#FF6B35',
    padding: 12,
    borderRadius: 6,
    marginBottom: 8,
  },
  actionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default MinimalTournamentDetail;