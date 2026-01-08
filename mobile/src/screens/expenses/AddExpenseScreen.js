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
  Switch,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { expenseAPI, groupAPI } from '../../services/api';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';

export default function AddExpenseScreen({ route, navigation }) {
  const { groupId } = route.params;
  const [group, setGroup] = useState(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [customSplits, setCustomSplits] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadGroup();
  }, []);

  const loadGroup = async () => {
    try {
      const response = await groupAPI.getGroup(groupId);
      if (response.success) {
        setGroup(response.group);
        setPaidBy(response.group.members[0]?.userId?._id || '');
        setSelectedParticipants(
          response.group.members.map((m) => m.userId._id)
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load group');
    }
  };

  const toggleParticipant = (userId) => {
    if (selectedParticipants.includes(userId)) {
      setSelectedParticipants(selectedParticipants.filter((id) => id !== userId));
      const newSplits = { ...customSplits };
      delete newSplits[userId];
      setCustomSplits(newSplits);
    } else {
      setSelectedParticipants([...selectedParticipants, userId]);
    }
  };

  const updateCustomSplit = (userId, value) => {
    setCustomSplits({ ...customSplits, [userId]: value });
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
      const response = await expenseAPI.createExpense({
        groupId,
        description,
        amount: parseFloat(amount),
        paidBy,
        splitType,
        splits,
      });

      if (response.success) {
        // Navigate back and refresh will happen via focus listener
        navigation.goBack();
      } else {
        Alert.alert('Error', response.message || 'Failed to add expense');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to add expense');
    } finally {
      setLoading(false);
    }
  };

  if (!group) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.form}>
        <View style={styles.section}>
          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={styles.input}
            placeholder="What was this expense for?"
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            maxLength={200}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Amount (₹) *</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.textTertiary}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Paid By *</Text>
          {group.members.map((member) => (
            <TouchableOpacity
              key={member.userId._id}
              style={[
                styles.memberOption,
                paidBy === member.userId._id && styles.memberOptionSelected,
              ]}
              onPress={() => setPaidBy(member.userId._id)}
              activeOpacity={0.7}
            >
              <View style={styles.memberOptionContent}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberAvatarText}>
                    {member.userId.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.memberName,
                    paidBy === member.userId._id && styles.memberNameSelected,
                  ]}
                >
                  {member.userId.name}
                </Text>
              </View>
              {paidBy === member.userId._id && (
                <Icon name="check-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Split Type</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggle,
                splitType === 'equal' && styles.toggleActive,
              ]}
              onPress={() => setSplitType('equal')}
              activeOpacity={0.7}
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
              activeOpacity={0.7}
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

        <View style={styles.section}>
          <Text style={styles.label}>Participants *</Text>
        {group.members.map((member) => {
          const isSelected = selectedParticipants.includes(member.userId._id);
          return (
            <View key={member.userId._id} style={styles.participantRow}>
              <TouchableOpacity
                style={styles.participantInfo}
                onPress={() => toggleParticipant(member.userId._id)}
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
                  placeholder="0.00"
                  value={customSplits[member.userId._id] || ''}
                  onChangeText={(value) =>
                    updateCustomSplit(member.userId._id, value)
                  }
                  keyboardType="decimal-pad"
                />
              )}
            </View>
          );
        })}

      </View>
      </ScrollView>
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <>
              <Icon name="plus-circle" size={20} color={colors.background} />
              <Text style={styles.buttonText}>Add Expense</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  form: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    ...typography.body,
    backgroundColor: colors.inputBackground,
    color: colors.textPrimary,
  },
  memberOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
  },
  memberOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  memberOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.round,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  memberAvatarText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.background,
  },
  memberName: {
    ...typography.body,
    color: colors.textPrimary,
  },
  memberNameSelected: {
    color: colors.primaryDark,
    fontWeight: '600',
  },
  splitTypeContainer: {
    marginTop: spacing.md,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: borderRadius.sm,
    backgroundColor: colors.inputBackground,
    padding: 4,
  },
  toggle: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm - 2,
  },
  toggleActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  toggleTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
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
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.sm - 4,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  splitInput: {
    width: 100,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    ...typography.bodySmall,
    backgroundColor: colors.card,
    color: colors.textPrimary,
  },
  footer: {
    padding: spacing.md,
    backgroundColor: colors.backgroundSecondary,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  button: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    ...typography.button,
    color: colors.background,
  },
});

