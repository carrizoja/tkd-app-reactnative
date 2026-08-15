/**
 * Labeled text input with inline validation feedback, shared by the register
 * and login forms. The label doubles as the accessibility label so the field is
 * reachable by screen readers and by tests.
 */
import { Text, TextInput, View, type TextInputProps } from "react-native";

interface FormTextFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

export function FormTextField({ label, error, ...inputProps }: FormTextFieldProps) {
  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-slate-700">{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#94a3b8"
        className={`rounded-xl border px-4 py-3 text-base text-slate-900 ${
          error ? "border-red-500" : "border-slate-300"
        }`}
        {...inputProps}
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
