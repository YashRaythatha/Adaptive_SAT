import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';
import { HeaderSignOutButton } from '../components/HeaderSignOutButton';
import { SetupScreen } from '../screens/SetupScreen';
import { DashboardScreen } from '../screens/DashboardScreen';
import { PlaceholderScreen } from '../screens/PlaceholderScreen';
import { PracticeStartScreen } from '../screens/PracticeStartScreen';
import { PracticeSessionScreen } from '../screens/PracticeSessionScreen';
import { ExamStartScreen } from '../screens/ExamStartScreen';
import { ExamSessionScreen } from '../screens/ExamSessionScreen';
import { ExamResultScreen } from '../screens/ExamResultScreen';
import { ExamReviewScreen } from '../screens/ExamReviewScreen';
import { HistoryListScreen } from '../screens/HistoryListScreen';
import { ProgressScreen } from '../screens/ProgressScreen';
import type { RootStackParamList, MainTabParamList, PracticeStackParamList, ExamStackParamList, HistoryStackParamList } from './types';
import { Ionicons } from '@expo/vector-icons';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();
const PracticeStack = createNativeStackNavigator<PracticeStackParamList>();
const ExamStack = createNativeStackNavigator<ExamStackParamList>();
const HistoryStack = createNativeStackNavigator<HistoryStackParamList>();

function PracticeTab() {
  return (
    <PracticeStack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.primaryForeground,
        headerTitleStyle: { fontWeight: '600', fontSize: 18 },
      }}
    >
      <PracticeStack.Screen name="PracticeStart" component={PracticeStartScreen} options={{ title: 'Practice' }} />
      <PracticeStack.Screen name="PracticeSession" component={PracticeSessionScreen} options={{ title: 'Practice' }} />
    </PracticeStack.Navigator>
  );
}

function ExamTab() {
  return (
    <ExamStack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.primaryForeground,
        headerTitleStyle: { fontWeight: '600', fontSize: 18 },
      }}
    >
      <ExamStack.Screen name="ExamStart" component={ExamStartScreen} options={{ title: 'Exam' }} />
      <ExamStack.Screen name="ExamSession" component={ExamSessionScreen} options={{ title: 'Exam' }} />
      <ExamStack.Screen name="ExamResult" component={ExamResultScreen} options={{ title: 'Exam result' }} />
      <ExamStack.Screen name="ExamReview" component={ExamReviewScreen} options={{ title: 'Exam review' }} />
    </ExamStack.Navigator>
  );
}

function HistoryTab() {
  return (
    <HistoryStack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.primaryForeground,
        headerTitleStyle: { fontWeight: '600', fontSize: 18 },
      }}
    >
      <HistoryStack.Screen name="HistoryList" component={HistoryListScreen} options={{ title: 'Exam history' }} />
      <HistoryStack.Screen name="ExamReview" component={ExamReviewScreen} options={{ title: 'Exam review' }} />
    </HistoryStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: theme.colors.primary },
        headerTintColor: theme.colors.primaryForeground,
        headerTitleStyle: { fontWeight: '600', fontSize: 18 },
        tabBarLabelStyle: { fontSize: 12 },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.mutedForeground,
        tabBarStyle: { backgroundColor: theme.colors.background, borderTopColor: theme.colors.border },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'Adaptive SAT',
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
          headerRight: () => <HeaderSignOutButton />,
        }}
      />
      <Tab.Screen
        name="Practice"
        component={PracticeTab}
        options={{
          title: 'Practice',
          tabBarLabel: 'Practice',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="book-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Exam"
        component={ExamTab}
        options={{
          title: 'Exam',
          tabBarLabel: 'Exam',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="document-text-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          title: 'Progress',
          tabBarLabel: 'Progress',
          tabBarIcon: ({ color, size }) => <Ionicons name="trending-up-outline" size={size} color={color} />,
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryTab}
        options={{
          title: 'Exam History',
          tabBarLabel: 'History',
          headerShown: false,
          tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color} />,
        }}
      />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  return (
    <Stack.Navigator
      key={user ? 'main' : 'setup'}
      initialRouteName={user ? 'Main' : 'Setup'}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name="Setup" component={SetupScreen} />
      <Stack.Screen name="Main" component={MainTabs} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    ...theme.typography.body,
    color: theme.colors.mutedForeground,
  },
});
