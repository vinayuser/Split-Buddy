import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors, spacing, typography, borderRadius } from '../../theme/colors';
import { Card } from 'react-native-paper';

const FAQ_DATA = [
  {
    category: 'Getting Started',
    questions: [
      {
        question: 'How do I create a group?',
        answer: 'Tap the "Add Group" button on the Home screen, enter a group name, and add members by phone number or email. You can also use the invite code to let others join.',
      },
      {
        question: 'How do I add an expense?',
        answer: 'Open a group, tap the "+" button, enter the expense details (amount, description, who paid), select participants, and choose how to split (equally or custom amounts).',
      },
      {
        question: 'What is the 7-day free trial?',
        answer: 'Every new user gets 7 days of free access to all features. After the trial expires, you\'ll need to subscribe to continue creating expenses and managing groups.',
      },
    ],
  },
  {
    category: 'Expenses & Splitting',
    questions: [
      {
        question: 'How does expense splitting work?',
        answer: 'When you add an expense, you can split it equally among all participants or set custom amounts for each person. The app automatically calculates who owes whom.',
      },
      {
        question: 'Can I edit or delete an expense?',
        answer: 'Yes! Tap on any expense to view details, then you can edit or delete it. Changes will automatically update the balances.',
      },
      {
        question: 'What if someone paid for the whole group?',
        answer: 'Select that person as the payer and include all group members as participants. The app will calculate how much each person owes the payer.',
      },
      {
        question: 'Can I split expenses unequally?',
        answer: 'Yes! When adding an expense, choose "Custom Split" and enter the exact amount each person should pay.',
      },
    ],
  },
  {
    category: 'Balances & Settlements',
    questions: [
      {
        question: 'How do I see who owes me money?',
        answer: 'Go to the Friends tab to see all your balances across groups, or open a specific group and check the Balances tab.',
      },
      {
        question: 'How do I record a payment?',
        answer: 'In the Balances or Settlements tab, tap "Settle" next to a balance, enter the amount paid, add notes (optional), and confirm. The balance will update immediately.',
      },
      {
        question: 'What is simplified settlement?',
        answer: 'Simplified settlement minimizes the number of payments needed. Instead of multiple transactions, it shows the most efficient way to settle all balances.',
      },
      {
        question: 'Can I settle a partial amount?',
        answer: 'Yes! When recording a payment, you can enter any amount up to the total balance. The remaining amount will still show as pending.',
      },
    ],
  },
  {
    category: 'Subscriptions',
    questions: [
      {
        question: 'What happens after my 7-day trial ends?',
        answer: 'You can still view all your data, but you won\'t be able to create new expenses or groups. Subscribe to any plan to continue using all features.',
      },
      {
        question: 'What subscription plans are available?',
        answer: 'We offer Premium (₹10/month) and Premium Plus (₹15/month). Both include unlimited groups and expenses. Premium Plus includes additional features like export reports and custom categories.',
      },
      {
        question: 'How do I cancel my subscription?',
        answer: 'You can cancel your subscription anytime from your device\'s app store settings (Google Play or App Store). Your subscription will remain active until the end of the current billing period.',
      },
      {
        question: 'Do I lose my data if I don\'t subscribe?',
        answer: 'No! Your data is always safe. Even after trial expiration, you can view all your groups, expenses, and balances. You just need a subscription to create new expenses.',
      },
    ],
  },
  {
    category: 'Groups & Members',
    questions: [
      {
        question: 'How do I add members to a group?',
        answer: 'Open the group, go to the Members tab, tap "Add Member", and enter their phone number or email. They\'ll receive an invite to join.',
      },
      {
        question: 'Can I remove a member from a group?',
        answer: 'Yes, group creators can remove members. Go to the Members tab, find the member, and tap the remove option. Note: This won\'t delete their expense history.',
      },
      {
        question: 'What is an invite code?',
        answer: 'Each group has a unique invite code. Share this code with others so they can join your group without you manually adding them.',
      },
      {
        question: 'Can I leave a group?',
        answer: 'Yes, you can leave a group anytime. However, you\'ll still be responsible for any outstanding balances. Settle up before leaving!',
      },
    ],
  },
  {
    category: 'Notifications',
    questions: [
      {
        question: 'Why am I not receiving notifications?',
        answer: 'Make sure you\'ve granted notification permissions when prompted. You can check permissions in your device settings. Also ensure you\'re logged in to the app.',
      },
      {
        question: 'What notifications will I receive?',
        answer: 'You\'ll receive notifications when someone adds an expense in a group you\'re part of. This helps you stay updated on group activity.',
      },
      {
        question: 'Can I disable notifications?',
        answer: 'Yes, you can disable notifications from your device settings. However, you might miss important updates about expenses in your groups.',
      },
    ],
  },
  {
    category: 'General',
    questions: [
      {
        question: 'Is my data secure?',
        answer: 'Yes! We use industry-standard encryption and security practices. Your financial data is stored securely and only accessible to you and your group members.',
      },
      {
        question: 'Can I use the app offline?',
        answer: 'The app requires an internet connection to sync data. However, you can view previously loaded data when offline.',
      },
      {
        question: 'How do I contact support?',
        answer: 'For support, please email us or use the in-app feedback option. Premium subscribers get priority support.',
      },
      {
        question: 'Can I export my expense data?',
        answer: 'Premium Plus subscribers can export expense reports. This feature is available in the subscription plans.',
      },
    ],
  },
];

const FAQItem = ({ question, answer, isExpanded, onToggle }) => {
  return (
    <Card style={styles.faqItem}>
      <TouchableOpacity
        style={styles.faqQuestion}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.faqQuestionContent}>
          <Text style={styles.faqQuestionText}>{question}</Text>
        </View>
        <Icon
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={24}
          color={colors.primary}
        />
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.faqAnswer}>
          <Text style={styles.faqAnswerText}>{answer}</Text>
        </View>
      )}
    </Card>
  );
};

const FAQCategory = ({ category, questions, expandedItems, onToggle }) => {
  return (
    <View style={styles.categorySection}>
      <Text style={styles.categoryTitle}>{category}</Text>
      {questions.map((item, index) => {
        const itemId = `${category}-${index}`;
        const isExpanded = expandedItems.includes(itemId);
        return (
          <FAQItem
            key={itemId}
            question={item.question}
            answer={item.answer}
            isExpanded={isExpanded}
            onToggle={() => onToggle(itemId)}
          />
        );
      })}
    </View>
  );
};

export default function FAQScreen() {
  const [expandedItems, setExpandedItems] = useState([]);

  const handleToggle = useCallback((itemId) => {
    setExpandedItems((prev) => {
      if (prev.includes(itemId)) {
        return prev.filter((id) => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  }, []);

  const expandAll = useCallback(() => {
    const allIds = FAQ_DATA.flatMap((category, catIndex) =>
      category.questions.map((_, qIndex) => `${category.category}-${qIndex}`)
    );
    setExpandedItems(allIds);
  }, []);

  const collapseAll = useCallback(() => {
    setExpandedItems([]);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Icon name="help-circle" size={32} color={colors.primary} />
          <Text style={styles.headerTitle}>Frequently Asked Questions</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={expandAll}
            activeOpacity={0.7}
          >
            <Text style={styles.headerButtonText}>Expand All</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={collapseAll}
            activeOpacity={0.7}
          >
            <Text style={styles.headerButtonText}>Collapse All</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {FAQ_DATA.map((category, index) => (
          <FAQCategory
            key={category.category}
            category={category.category}
            questions={category.questions}
            expandedItems={expandedItems}
            onToggle={handleToggle}
          />
        ))}

        <Card style={styles.helpCard}>
          <Card.Content>
            <View style={styles.helpContent}>
              <Icon name="message-text" size={24} color={colors.primary} />
              <View style={styles.helpTextContainer}>
                <Text style={styles.helpTitle}>Still have questions?</Text>
                <Text style={styles.helpText}>
                  Contact our support team for assistance
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundSecondary,
  },
  header: {
    backgroundColor: colors.background,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerTitle: {
    ...typography.h2,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  headerActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.sm,
  },
  headerButtonText: {
    ...typography.bodySmall,
    fontWeight: '600',
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
  },
  categorySection: {
    marginBottom: spacing.lg,
  },
  categoryTitle: {
    ...typography.h3,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  faqItem: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  faqQuestionContent: {
    flex: 1,
    marginRight: spacing.sm,
  },
  faqQuestionText: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    lineHeight: 22,
  },
  faqAnswer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: spacing.xs,
  },
  faqAnswerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  helpCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
    marginBottom: spacing.xl,
  },
  helpContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  helpTextContainer: {
    flex: 1,
    marginLeft: spacing.md,
  },
  helpTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs / 2,
  },
  helpText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});

