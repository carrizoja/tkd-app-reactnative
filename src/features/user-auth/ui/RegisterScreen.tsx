/**
 * Instructor registration (user-auth spec, "Instructor registration"). On
 * success Firebase starts the session; navigation reacts to that session change
 * rather than pushing a route from here (see the auth-gated navigator).
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, Text, View } from "react-native";
import { registerWithEmail } from "../data/auth-service";
import { AuthError } from "../model/auth-user";
import { AUTH_COPY, authErrorMessage } from "./copy";
import { registerSchema, type RegisterForm } from "./credentials-schema";
import { FormTextField } from "./FormTextField";

interface RegisterScreenProps {
  /** Navigate to the login screen; omitted when the screen is used stand-alone. */
  onGoToLogin?: () => void;
}

export function RegisterScreen({ onGoToLogin }: RegisterScreenProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setSubmitError(null);
    try {
      await registerWithEmail(email.trim(), password);
    } catch (error) {
      setSubmitError(
        error instanceof AuthError
          ? authErrorMessage(error.code)
          : authErrorMessage("unknown"),
      );
    }
  });

  return (
    <ScrollView
      contentContainerClassName="flex-grow justify-center gap-6 bg-white px-6 py-10"
      keyboardShouldPersistTaps="handled"
    >
      <View className="gap-1">
        <Text className="text-3xl font-bold text-slate-900">
          {AUTH_COPY.registerTitle}
        </Text>
        <Text className="text-base text-slate-500">
          {AUTH_COPY.registerSubtitle}
        </Text>
      </View>

      <View className="gap-4">
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormTextField
              label={AUTH_COPY.emailLabel}
              placeholder={AUTH_COPY.emailPlaceholder}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field: { onChange, onBlur, value } }) => (
            <FormTextField
              label={AUTH_COPY.passwordLabel}
              placeholder={AUTH_COPY.passwordPlaceholder}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.password?.message}
              autoCapitalize="none"
              autoComplete="new-password"
              secureTextEntry
            />
          )}
        />
      </View>

      {submitError ? (
        <Text accessibilityRole="alert" className="text-sm text-red-600">
          {submitError}
        </Text>
      ) : null}

      <View className="gap-4">
        <Pressable
          accessibilityRole="button"
          disabled={isSubmitting}
          onPress={onSubmit}
          className={`items-center rounded-xl px-4 py-4 ${
            isSubmitting ? "bg-slate-400" : "bg-slate-900"
          }`}
        >
          <Text className="text-base font-semibold text-white">
            {AUTH_COPY.submitRegister}
          </Text>
        </Pressable>

        {onGoToLogin ? (
          <Pressable accessibilityRole="button" onPress={onGoToLogin}>
            <Text className="text-center text-sm text-slate-600">
              {AUTH_COPY.goToLogin}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}
