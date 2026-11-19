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
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, Text, View } from "react-native";
import { LoginScreen } from "../features/user-auth/ui/LoginScreen";
import { NoTenancyScreen } from "../features/user-auth/ui/NoTenancyScreen";
import { RegisterScreen } from "../features/user-auth/ui/RegisterScreen";
import { SignOutButton } from "../features/user-auth/ui/SignOutButton";
import { SESSION_COPY } from "../features/user-auth/ui/copy";
import { useSession } from "../features/user-auth/ui/useSession";
import { routeForSession } from "./routeForSession";

export type RootStackParamList = {
  Home: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Placeholder hub; the real information architecture lands in task 10.1. */
function HomeScreen() {
  return (
    <View testID="home-hub" className="flex-1 items-center justify-center gap-2 bg-white">
      <Text className="text-2xl font-bold text-slate-900">TKD Admin</Text>
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

  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: "TKD Admin" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
