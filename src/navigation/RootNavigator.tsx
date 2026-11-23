/**
 * Auth-gated root navigation (task 3.7).
 *
 * Which stack mounts is derived from the session by `routeForSession`, so the
 * gate is one tested pure function rather than conditionals spread across
 * screens. Login and registration never push a route on success: they change
 * the Firebase session, and this navigator reacts to it.
 */
import { useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  type NativeStackScreenProps,
} from "@react-navigation/native-stack";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SCHOOL_COPY } from "../features/school-management/ui/copy";
import { LoginScreen } from "../features/user-auth/ui/LoginScreen";
import { NoTenancyScreen } from "../features/user-auth/ui/NoTenancyScreen";
import { RegisterScreen } from "../features/user-auth/ui/RegisterScreen";
import { SignOutButton } from "../features/user-auth/ui/SignOutButton";
import { SESSION_COPY } from "../features/user-auth/ui/copy";
import { useSession } from "../features/user-auth/ui/useSession";
import { routeForSession } from "./routeForSession";
import {
  AttendanceRoute,
  ClassDetailRoute,
  ClassesRoute,
  ClassFormRoute,
  GroupDetailRoute,
  GroupFormRoute,
  GroupsRoute,
  SchoolDetailRoute,
  SchoolFormRoute,
  SchoolsRoute,
  ScopeContext,
  SedeFormRoute,
  StudentFormRoute,
  StudentProfileRoute,
  StudentsRoute,
  type SchoolRoutesParamList,
} from "./schoolRoutes";
import { CLASS_COPY } from "../features/class-management/ui/copy";
import { STUDENT_COPY } from "../features/student-management/ui/copy";

export type RootStackParamList = {
  Home: undefined;
} & SchoolRoutesParamList;

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Placeholder hub; the real information architecture lands in task 10.1. */
function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, "Home">) {
  return (
    <View testID="home-hub" className="flex-1 items-center justify-center gap-4 bg-white px-6">
      <Text className="text-2xl font-bold text-slate-900">TKD Admin</Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => navigation.navigate("Schools")}
        className="w-full items-center rounded-xl bg-slate-900 px-4 py-4"
      >
        <Text className="text-base font-semibold text-white">{SCHOOL_COPY.homeLink}</Text>
      </Pressable>
      <SignOutButton />
    </View>
  );
}

function SplashScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white">
      <ActivityIndicator />
      <Text className="text-base text-slate-500">{SESSION_COPY.loading}</Text>
    </View>
  );
}

/** Login and registration swap in place; neither is a route the user can pop to. */
function AuthFlow() {
  const [showRegister, setShowRegister] = useState(false);

  return showRegister ? (
    <RegisterScreen onGoToLogin={() => setShowRegister(false)} />
  ) : (
    <LoginScreen onGoToRegister={() => setShowRegister(true)} />
  );
}

export function RootNavigator() {
  const { session, refresh } = useSession();
  const route = routeForSession(session);

  if (route === "splash") {
    return <SplashScreen />;
  }

  if (route === "auth") {
    return <AuthFlow />;
  }

  if (route === "no-tenancy") {
    // `routeForSession` only returns this for an active session, so the scope
    // is necessarily one of the two no-tenancy kinds.
    const reason =
      session.status === "active" && session.scope.kind === "unavailable"
        ? "unavailable"
        : "unassigned";
    return <NoTenancyScreen reason={reason} onRetry={refresh} />;
  }

  // `routeForSession` only reaches this point for an active session with tenancy.
  const scope = session.status === "active" ? session.scope : null;

  return (
    <ScopeContext.Provider value={scope}>
      <NavigationContainer>
        <Stack.Navigator>
          <Stack.Screen name="Home" component={HomeScreen} options={{ title: "TKD Admin" }} />
          <Stack.Screen
            name="Schools"
            component={SchoolsRoute}
            options={{ title: SCHOOL_COPY.schoolsTitle }}
          />
          <Stack.Screen name="SchoolDetail" component={SchoolDetailRoute} options={{ title: "" }} />
          <Stack.Screen name="SchoolForm" component={SchoolFormRoute} options={{ title: "" }} />
          <Stack.Screen name="SedeForm" component={SedeFormRoute} options={{ title: "" }} />
          <Stack.Screen
            name="Students"
            component={StudentsRoute}
            options={({ route }) => ({ title: `${STUDENT_COPY.studentsTitle} · ${route.params.school.name}` })}
          />
          <Stack.Screen name="StudentForm" component={StudentFormRoute} options={{ title: "" }} />
          <Stack.Screen name="StudentProfile" component={StudentProfileRoute} options={{ title: "" }} />
          <Stack.Screen
            name="Groups"
            component={GroupsRoute}
            options={({ route }) => ({ title: `${STUDENT_COPY.groupsTitle} · ${route.params.school.name}` })}
          />
          <Stack.Screen name="GroupForm" component={GroupFormRoute} options={{ title: "" }} />
          <Stack.Screen name="GroupDetail" component={GroupDetailRoute} options={{ title: "" }} />
          <Stack.Screen
            name="Classes"
            component={ClassesRoute}
            options={({ route }) => ({ title: `${CLASS_COPY.schoolLink} · ${route.params.school.name}` })}
          />
          <Stack.Screen name="ClassForm" component={ClassFormRoute} options={{ title: "" }} />
          <Stack.Screen name="ClassDetail" component={ClassDetailRoute} options={{ title: "" }} />
          <Stack.Screen name="Attendance" component={AttendanceRoute} options={{ title: "" }} />
        </Stack.Navigator>
      </NavigationContainer>
    </ScopeContext.Provider>
  );
}
