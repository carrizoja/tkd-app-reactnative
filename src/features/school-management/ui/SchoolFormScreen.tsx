/**
 * Create a school (S1) or rename one (S4). Only the name is editable: the
 * association is fixed at creation (S9).
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, Text } from "react-native";
import type { UserScope } from "../../user-auth/model/scope";
import { FormTextField } from "../../user-auth/ui/FormTextField";
import { schoolService } from "../data/repository";
import type { School } from "../model/types";
import { SCHOOL_COPY, schoolErrorMessage } from "./copy";
import { schoolFormSchema, type SchoolForm } from "./form-schemas";
import { ErrorText, PrimaryButton } from "./parts";

interface SchoolFormScreenProps {
  scope: UserScope;
  /** The school to rename; omitted to create a new one. */
  school?: School;
  onDone: () => void;
}

export function SchoolFormScreen({ scope, school, onDone }: SchoolFormScreenProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SchoolForm>({
    resolver: zodResolver(schoolFormSchema),
    defaultValues: { name: school?.name ?? "" },
  });

  const onSubmit = handleSubmit(async (input) => {
    setSubmitError(null);
    try {
      if (school) {
        await schoolService.renameSchool(school, input);
      } else {
        await schoolService.createSchool(scope, input);
      }
      onDone();
    } catch (error) {
      setSubmitError(schoolErrorMessage(error));
    }
  });

  return (
    <ScrollView
      contentContainerClassName="gap-6 bg-white px-6 py-6"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-2xl font-bold text-slate-900">
        {school ? SCHOOL_COPY.editSchoolTitle : SCHOOL_COPY.newSchoolTitle}
      </Text>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormTextField
            label={SCHOOL_COPY.schoolNameLabel}
            placeholder={SCHOOL_COPY.schoolNamePlaceholder}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.name?.message}
          />
        )}
      />
      <ErrorText message={submitError} />
      <PrimaryButton label={SCHOOL_COPY.save} onPress={onSubmit} disabled={isSubmitting} />
    </ScrollView>
  );
}
