import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import HomeScreen from '../screens/home/HomeScreen';
import GroupDetailScreen from '../screens/groups/GroupDetailScreen';
import EditGroupScreen from '../screens/groups/EditGroupScreen';
import AddExpenseScreen from '../screens/expenses/AddExpenseScreen';
import EditExpenseScreen from '../screens/expenses/EditExpenseScreen';
import BalanceScreen from '../screens/balances/BalanceScreen';
import SettlementScreen from '../screens/settlements/SettlementScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import CreateGroupScreen from '../screens/groups/CreateGroupScreen';
import ActivityScreen from '../screens/activities/ActivityScreen';
import FriendsScreen from '../screens/friends/FriendsScreen';
import SubscriptionScreen from '../screens/subscription/SubscriptionScreen';
import FAQScreen from '../screens/faq/FAQScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="HomeList" 
        component={HomeScreen} 
        options={{ headerShown: false }}
      />
      <Stack.Screen 
        name="CreateGroup" 
        component={CreateGroupScreen}
        options={{ title: 'Create Group' }}
      />
      <Stack.Screen 
        name="GroupDetail" 
        component={GroupDetailScreen}
        options={{ title: 'Group Details' }}
      />
      <Stack.Screen 
        name="EditGroup" 
        component={EditGroupScreen}
        options={{ title: 'Edit Group' }}
      />
      <Stack.Screen 
        name="AddExpense" 
        component={AddExpenseScreen}
        options={{ title: 'Add Expense' }}
      />
      <Stack.Screen 
        name="EditExpense" 
        component={EditExpenseScreen}
        options={{ title: 'Edit Expense' }}
      />
      <Stack.Screen 
        name="Balance" 
        component={BalanceScreen}
        options={{ title: 'Balances' }}
      />
      <Stack.Screen 
        name="Settlement" 
        component={SettlementScreen}
        options={{ title: 'Settlements' }}
      />
      <Stack.Screen 
        name="Subscription" 
        component={SubscriptionScreen}
        options={{ title: 'Subscription' }}
      />
      <Stack.Screen 
        name="FAQ" 
        component={FAQScreen}
        options={{ title: 'FAQ' }}
      />
    </Stack.Navigator>
  );
}

// Custom Tab Bar with Logo in Center
function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.tabBarContainer}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const label = options.tabBarLabel !== undefined
          ? options.tabBarLabel
          : options.title !== undefined
          ? options.title
          : route.name;

        // Show logo for the middle position (between Friends and Activities)
        if (index === 2) {
          return (
            <View key={route.key} style={styles.logoTabContainer}>
              <View style={styles.logoCircle}>
                <Image 
                  source={require('../../assets/app_logo.png')} 
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          );
        }

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        let iconName;
        if (route.name === 'Home') {
          iconName = isFocused ? 'home' : 'home-outline';
        } else if (route.name === 'Friends') {
          iconName = isFocused ? 'account-group' : 'account-group-outline';
        } else if (route.name === 'Activities') {
          iconName = isFocused ? 'bell' : 'bell-outline';
        } else if (route.name === 'Profile') {
          iconName = isFocused ? 'account' : 'account-outline';
        } else {
          iconName = 'circle';
        }
        
        const color = isFocused ? '#6200ee' : 'gray';

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
          >
            <Icon name={iconName} size={24} color={color} />
            <Text style={[styles.tabLabel, { color }]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Friends" component={FriendsScreen} />
      <Tab.Screen 
        name="Logo" 
        component={() => null} 
        options={{ tabBarLabel: '', tabBarButton: () => null }} 
        listeners={{
          tabPress: (e) => {
            e.preventDefault();
          },
        }}
      />
      <Tab.Screen name="Activities" component={ActivityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: 5,
    paddingTop: 5,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  logoTabContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#6200ee',
    overflow: 'hidden',
  },
  logoImage: {
    width: 40,
    height: 40,
  },
});

