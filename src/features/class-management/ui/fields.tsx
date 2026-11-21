/**
 * Form fields for the class form: toggle chips (sede and weekdays) and a time
 * field that opens the device clock.
 */
import { Pressable, Text, View } from "react-native";
import { CLASS_COPY } from "./copy";
import { openTimePicker } from "./openTimePicker";

/** Where the clock opens when no time is set yet. */
const DEFAULT_TIME = "18:00";

export function FieldLabel({ children }: { children: string }) {
  return <Text className="text-sm font-medium text-slate-700">{children}</Text>;
}

export function FieldError({ message }: { message?: string }) {
  return message ? <Text className="text-sm text-red-600">{message}</Text> : null;
}

interface ChipProps {
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  onPress: () => void;
}

export function Chip({ label, accessibilityLabel, selected, onPress }: ChipProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`rounded-full border px-4 py-2 ${selected ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-white"}`}
    >
      <Text className={`text-sm font-semibold ${selected ? "text-white" : "text-slate-900"}`}>{label}</Text>
    </Pressable>
  );
}

interface TimeFieldProps {
  label: string;
  /** `HH:MM`, or "" for none. */
  value: string;
  onChange: (time: string) => void;
  error?: string;
}

export function TimeField({ label, value, onChange, error }: TimeFieldProps) {
  const pick = async () => {
    const picked = await openTimePicker(value || DEFAULT_TIME);
    if (picked) {
      onChange(picked);
    }
  };

  return (
    <View className="flex-1 gap-1">
      <FieldLabel>{label}</FieldLabel>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={pick}
        className={`rounded-xl border px-4 py-3 ${error ? "border-red-500" : "border-slate-300"}`}
      >
        <Text className={`text-base ${value ? "text-slate-900" : "text-slate-400"}`}>
          {value || CLASS_COPY.timePlaceholder}
        </Text>
      </Pressable>
      <FieldError message={error} />
    </View>
  );
}
