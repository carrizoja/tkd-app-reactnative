/** A student's name with one action button, used by group and class rosters. */
import { Pressable, Text, View } from "react-native";
import { fullName } from "./copy";

interface MemberRowProps {
  student: { firstName: string; lastName: string };
  actionLabel: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled: boolean;
}

export function MemberRow({ student, actionLabel, accessibilityLabel, onPress, disabled }: MemberRowProps) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
      <Text className="flex-1 text-base text-slate-900">{fullName(student)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        disabled={disabled}
        className="rounded-lg border border-slate-300 px-3 py-2"
      >
        <Text className="text-sm font-semibold text-slate-900">{actionLabel}</Text>
      </Pressable>
    </View>
  );
}
