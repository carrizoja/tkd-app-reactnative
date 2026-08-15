/**
 * Instructor login (user-auth spec, "Login"). Errors are reported with one
 * generic message so a failed attempt never reveals whether the address or the
 * password was wrong. The session that Firebase starts here is persisted by the
 * auth initializer, so navigation switches to the Home hub on its own.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, Text, View } from "react-native";
import { loginWithEmail } from "../data/auth-service";
import { AuthError } from "../model/auth-user";
import { AUTH_COPY, authErrorMessage } from "./copy";
import { loginSchema, type LoginForm } from "./credentials-schema";
import { FormTextField } from "./FormTextField";

interface LoginScreenProps {
  /** Navigate to registration; omitted when the screen is used stand-alone. */
  onGoToRegister?: () => void;
}

export function LoginScreen({ onGoToRegister }: LoginScreenProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setSubmitError(null);
    try {
      await loginWithEmail(email.trim(), password);
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
          {AUTH_COPY.loginTitle}
        </Text>
        <Text className="text-base text-slate-500">{AUTH_COPY.loginSubtitle}</Text>
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
              autoComplete="current-password"
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
            {AUTH_COPY.submitLogin}
          </Text>
        </Pressable>

        {onGoToRegister ? (
          <Pressable accessibilityRole="button" onPress={onGoToRegister}>
            <Text className="text-center text-sm text-slate-600">
              {AUTH_COPY.goToRegister}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}
