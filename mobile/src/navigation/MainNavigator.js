import React from 'react';
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

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen 
        name="HomeList" 
        component={HomeScreen} 
        options={{ title: 'Groups' }}
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
    </Stack.Navigator>
  );
}

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Activities') {
            iconName = focused ? 'bell' : 'bell-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'account' : 'account-outline';
          }
          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen name="Activities" component={ActivityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

