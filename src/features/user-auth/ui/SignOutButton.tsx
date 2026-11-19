import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { signOutUser } from "../data/auth-service";
import { AUTH_COPY, authErrorMessage } from "./copy";

export function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPress = async () => {
    setError(null);
    setIsSigningOut(true);
    try {
      await signOutUser();
    } catch {
      setError(authErrorMessage("unknown"));
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <View className="items-center gap-2">
      <Pressable
        accessibilityRole="button"
        disabled={isSigningOut}
        onPress={onPress}
        className={`rounded-lg border px-6 py-3 ${
          isSigningOut ? "border-slate-200 bg-slate-50" : "border-slate-300 bg-white"
        }`}
      >
        <Text className="text-base font-semibold text-slate-700">{AUTH_COPY.signOut}</Text>
      </Pressable>

      {error ? (
        <Text accessibilityRole="alert" className="text-center text-sm text-red-600">
          {error}
        </Text>
      ) : null}
    </View>
  );
}
