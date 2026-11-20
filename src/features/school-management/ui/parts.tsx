/**
 * Small presentational pieces shared by the school-management screens, styled
 * like the auth screens so the app reads as one product.
 */
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SCHOOL_COPY } from "./copy";

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export function PrimaryButton({ label, onPress, disabled }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className={`items-center rounded-xl px-4 py-4 ${disabled ? "bg-slate-400" : "bg-slate-900"}`}
    >
      <Text className="text-base font-semibold text-white">{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, disabled }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className="items-center rounded-xl border border-slate-300 bg-white px-4 py-4"
    >
      <Text className="text-base font-semibold text-slate-900">{label}</Text>
    </Pressable>
  );
}

export function DangerButton({ label, onPress, disabled }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      className="items-center rounded-xl border border-red-200 bg-white px-4 py-4"
    >
      <Text className="text-base font-semibold text-red-600">{label}</Text>
    </Pressable>
  );
}

/** A tappable row with a title and an optional secondary line. */
export function ListRow({ title, subtitle, onPress }: { title: string; subtitle?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="gap-0.5 rounded-xl border border-slate-200 bg-white px-4 py-3"
    >
      <Text className="text-base font-semibold text-slate-900">{title}</Text>
      {subtitle ? <Text className="text-sm text-slate-500">{subtitle}</Text> : null}
    </Pressable>
  );
}

export function ErrorText({ message }: { message: string | null }) {
  return message ? (
    <Text accessibilityRole="alert" className="text-sm text-red-600">
      {message}
    </Text>
  ) : null;
}

/** Loading spinner, or a load error with a retry button. */
export function LoadFallback({ failed, onRetry }: { failed: boolean; onRetry: () => void }) {
  return (
    <View className="flex-1 items-center justify-center gap-3 bg-white px-6">
      {failed ? (
        <>
          <Text className="text-center text-base text-slate-600">{SCHOOL_COPY.loadFailed}</Text>
          <SecondaryButton label={SCHOOL_COPY.retry} onPress={onRetry} />
        </>
      ) : (
        <>
          <ActivityIndicator />
          <Text className="text-base text-slate-500">{SCHOOL_COPY.loading}</Text>
        </>
      )}
    </View>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <Text className="text-lg font-bold text-slate-900">{children}</Text>;
}
