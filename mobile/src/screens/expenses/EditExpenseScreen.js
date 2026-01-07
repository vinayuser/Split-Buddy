import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { expenseAPI, groupAPI } from '../../services/api';

export default function EditExpenseScreen({ route, navigation }) {
  const { expenseId } = route.params;
  const [expense, setExpense] = useState(null);
  const [group, setGroup] = useState(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [customSplits, setCustomSplits] = useState({});
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    loadExpense();
  }, []);

  const loadExpense = async () => {
    try {
      const expenseRes = await expenseAPI.getExpense(expenseId);
      if (expenseRes.success) {
        const exp = expenseRes.expense;
        setExpense(exp);
        setDescription(exp.description);
        setAmount(exp.amount.toString());
        setPaidBy(exp.paidBy._id);
        setSplitType(exp.splitType);
        setSelectedParticipants(exp.splits.map((s) => s.userId._id));
        
        if (exp.splitType === 'custom') {
          const splits = {};
          exp.splits.forEach((s) => {
            splits[s.userId._id] = s.amount.toString();
          });
          setCustomSplits(splits);
        }

        const groupRes = await groupAPI.getGroup(exp.groupId._id);
        if (groupRes.success) {
          setGroup(groupRes.group);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load expense');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await expenseAPI.deleteExpense(expenseId);
              if (response.success) {
                navigation.goBack();
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Description is required');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('Error', 'Valid amount is required');
      return;
    }

    if (!paidBy) {
      Alert.alert('Error', 'Please select who paid');
      return;
    }

    if (selectedParticipants.length === 0) {
      Alert.alert('Error', 'Please select at least one participant');
      return;
    }

    let splits = [];
    if (splitType === 'equal') {
      const splitAmount = parseFloat(amount) / selectedParticipants.length;
      splits = selectedParticipants.map((userId) => ({
        userId,
        amount: splitAmount,
      }));
    } else {
      const totalSplit = selectedParticipants.reduce(
        (sum, userId) => sum + parseFloat(customSplits[userId] || 0),
        0
      );
      if (Math.abs(totalSplit - parseFloat(amount)) > 0.01) {
        Alert.alert('Error', 'Custom split amounts must equal expense amount');
        return;
      }
      splits = selectedParticipants.map((userId) => ({
        userId,
        amount: parseFloat(customSplits[userId] || 0),
      }));
    }

    setLoading(true);
    try {
      const response = await expenseAPI.updateExpense(expenseId, {
        description,
        amount: parseFloat(amount),
        paidBy,
        splitType,
        splits,
      });

      if (response.success) {
        navigation.goBack();
      } else {
        Alert.alert('Error', response.message || 'Failed to update expense');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update expense');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading || !expense || !group) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Similar UI to AddExpenseScreen - reuse styles and structure
  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.label}>Description *</Text>
        <TextInput
          style={styles.input}
          value={description}
          onChangeText={setDescription}
          maxLength={200}
        />

        <Text style={styles.label}>Amount (₹) *</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Paid By *</Text>
        {group.members.map((member) => (
          <TouchableOpacity
            key={member.userId._id}
            style={[
              styles.memberOption,
              paidBy === member.userId._id && styles.memberOptionSelected,
            ]}
            onPress={() => setPaidBy(member.userId._id)}
          >
            <Text
              style={[
                styles.memberName,
                paidBy === member.userId._id && styles.memberNameSelected,
              ]}
            >
              {member.userId.name}
            </Text>
            {paidBy === member.userId._id && (
              <Text style={styles.checkmark}>✓</Text>
            )}
          </TouchableOpacity>
        ))}

        <View style={styles.splitTypeContainer}>
          <Text style={styles.label}>Split Type</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggle,
                splitType === 'equal' && styles.toggleActive,
              ]}
              onPress={() => setSplitType('equal')}
            >
              <Text
                style={[
                  styles.toggleText,
                  splitType === 'equal' && styles.toggleTextActive,
                ]}
              >
                Equal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggle,
                splitType === 'custom' && styles.toggleActive,
              ]}
              onPress={() => setSplitType('custom')}
            >
              <Text
                style={[
                  styles.toggleText,
                  splitType === 'custom' && styles.toggleTextActive,
                ]}
              >
                Custom
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.label}>Participants *</Text>
        {group.members.map((member) => {
          const isSelected = selectedParticipants.includes(member.userId._id);
          return (
            <View key={member.userId._id} style={styles.participantRow}>
              <TouchableOpacity
                style={styles.participantInfo}
                onPress={() => {
                  if (isSelected) {
                    setSelectedParticipants(
                      selectedParticipants.filter((id) => id !== member.userId._id)
                    );
                    const newSplits = { ...customSplits };
                    delete newSplits[member.userId._id];
                    setCustomSplits(newSplits);
                  } else {
                    setSelectedParticipants([
                      ...selectedParticipants,
                      member.userId._id,
                    ]);
                  }
                }}
              >
                <View
                  style={[
                    styles.checkbox,
                    isSelected && styles.checkboxSelected,
                  ]}
                >
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={styles.memberName}>{member.userId.name}</Text>
              </TouchableOpacity>
              {isSelected && splitType === 'custom' && (
                <TextInput
                  style={styles.splitInput}
                  value={customSplits[member.userId._id] || ''}
                  onChangeText={(value) =>
                    setCustomSplits({ ...customSplits, [member.userId._id]: value })
                  }
                  keyboardType="decimal-pad"
                />
              )}
            </View>
          );
        })}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Update Expense</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.deleteButton]}
          onPress={handleDelete}
        >
          <Text style={styles.deleteButtonText}>Delete Expense</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  memberOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
  },
  memberOptionSelected: {
    borderColor: '#6200ee',
    backgroundColor: '#f3e5f5',
  },
  memberName: {
    fontSize: 16,
    color: '#333',
  },
  memberNameSelected: {
    color: '#6200ee',
    fontWeight: '600',
  },
  checkmark: {
    color: '#6200ee',
    fontSize: 18,
    fontWeight: 'bold',
  },
  splitTypeContainer: {
    marginTop: 16,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    padding: 4,
  },
  toggle: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleActive: {
    backgroundColor: '#6200ee',
  },
  toggleText: {
    fontSize: 16,
    color: '#666',
  },
  toggleTextActive: {
    color: '#fff',
    fontWeight: 'bold',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: '#6200ee',
    backgroundColor: '#6200ee',
  },
  splitInput: {
    width: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#6200ee',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    marginTop: 12,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

