import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../theme/colors';

export default function TabView({ tabs, activeTab, onTabChange }) {
  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.key}
            style={[
              styles.tab,
              activeTab === index && styles.tabActive,
            ]}
            onPress={() => onTabChange(index)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === index && styles.tabTextActive,
              ]}
            >
              {tab.label}
            </Text>
            {tab.badge && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{tab.badge}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.indicatorContainer}>
        <View
          style={[
            styles.indicator,
            { left: `${(activeTab / tabs.length) * 100}%`, width: `${100 / tabs.length}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  tabActive: {
    // Active state handled by text color
  },
  tabText: {
    ...typography.bodySmall,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  tabTextActive: {
    fontWeight: '600',
    color: colors.primary,
  },
  badge: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.round,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.background,
    fontSize: 10,
  },
  indicatorContainer: {
    height: 3,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    height: 3,
    backgroundColor: colors.primary,
    bottom: 0,
  },
});

