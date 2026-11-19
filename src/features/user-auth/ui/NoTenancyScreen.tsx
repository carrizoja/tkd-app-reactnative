/**
 * Shown to a user who is authenticated but has no usable tenancy (task 3.7).
 *
 * The two causes need different words and different actions: an `unassigned`
 * user is waiting on an administrator and retrying achieves nothing, while an
 * `unavailable` scope is a failed read that a retry may well fix.
 */
import { Pressable, Text, View } from "react-native";
import { SESSION_COPY } from "./copy";
import { SignOutButton } from "./SignOutButton";

interface NoTenancyScreenProps {
  reason: "unassigned" | "unavailable";
  onRetry: () => void;
}

export function NoTenancyScreen({ reason, onRetry }: NoTenancyScreenProps) {
  const isUnassigned = reason === "unassigned";

  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white px-8">
      <Text className="text-center text-xl font-bold text-slate-900">
        {isUnassigned ? SESSION_COPY.unassignedTitle : SESSION_COPY.unavailableTitle}
      </Text>
      <Text className="text-center text-base text-slate-500">
        {isUnassigned ? SESSION_COPY.unassignedBody : SESSION_COPY.unavailableBody}
      </Text>

      {!isUnassigned && (
        <Pressable
          accessibilityRole="button"
          onPress={onRetry}
          className="mt-2 rounded-lg bg-slate-900 px-6 py-3"
        >
          <Text className="text-base font-semibold text-white">{SESSION_COPY.retry}</Text>
        </Pressable>
      )}

      <SignOutButton />
    </View>
  );
}
