/**
 * Birth date field: tapping it opens the device calendar; a small button
 * clears it. The value is a `YYYY-MM-DD` string, or "" for none.
 */
import { Pressable, Text, View } from "react-native";
import { STUDENT_COPY } from "./copy";
import { formatBirthDate, fromIsoDate, toIsoDate } from "./dates";
import { openDatePicker } from "./openDatePicker";

interface DateFieldProps {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  error?: string;
}

/** Where the calendar opens when no date is set yet: a typical student's birth year. */
function defaultDay(): Date {
  const today = new Date();
  return new Date(today.getFullYear() - 10, 0, 1);
}

export function DateField({ label, value, onChange, error }: DateFieldProps) {
  const pick = async () => {
    const start = /^\d{4}-\d{2}-\d{2}$/.test(value) ? fromIsoDate(value) : defaultDay();
    const picked = await openDatePicker(start, new Date());
    if (picked) {
      onChange(toIsoDate(picked));
    }
  };

  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-slate-700">{label}</Text>
      <View
        className={`flex-row items-center rounded-xl border ${error ? "border-red-500" : "border-slate-300"}`}
      >
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={pick} className="flex-1 px-4 py-3">
          <Text className={`text-base ${value ? "text-slate-900" : "text-slate-400"}`}>
            {value ? formatBirthDate(value) : STUDENT_COPY.birthDatePlaceholder}
          </Text>
        </Pressable>
        {value ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={STUDENT_COPY.clearBirthDate}
            onPress={() => onChange("")}
            className="px-4 py-3"
          >
            <Text className="text-base text-slate-400">✕</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
