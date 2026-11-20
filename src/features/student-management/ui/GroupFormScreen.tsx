/**
 * Create a group (S8) or rename one. A new group starts empty and opens right
 * away so members can be added (S8 "creates a group and adds students to it").
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, Text } from "react-native";
import type { School } from "../../school-management/model/types";
import { ErrorText, PrimaryButton } from "../../school-management/ui/parts";
import { FormTextField } from "../../user-auth/ui/FormTextField";
import { studentService } from "../data/repository";
import type { StudentGroup } from "../model/types";
import { STUDENT_COPY, studentErrorMessage } from "./copy";
import { groupFormSchema, type GroupForm } from "./form-schemas";

interface GroupFormScreenProps {
  school: School;
  /** The group to rename; omitted to create a new one. */
  group?: StudentGroup;
  /** Called with a newly created group. */
  onCreated: (group: StudentGroup) => void;
  /** Called after a rename. */
  onDone: () => void;
}

export function GroupFormScreen({ school, group, onCreated, onDone }: GroupFormScreenProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GroupForm>({
    resolver: zodResolver(groupFormSchema),
    defaultValues: { name: group?.name ?? "" },
  });

  const onSubmit = handleSubmit(async (input) => {
    setSubmitError(null);
    try {
      if (group) {
        await studentService.renameGroup(group, input);
        onDone();
      } else {
        onCreated(await studentService.createGroup(school, input, []));
      }
    } catch (error) {
      setSubmitError(studentErrorMessage(error));
    }
  });

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-6 bg-white px-6 py-6" keyboardShouldPersistTaps="handled">
      <Text className="text-2xl font-bold text-slate-900">
        {group ? STUDENT_COPY.editGroupTitle : STUDENT_COPY.newGroupTitle}
      </Text>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormTextField
            label={STUDENT_COPY.groupNameLabel}
            placeholder={STUDENT_COPY.groupNamePlaceholder}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.name?.message}
          />
        )}
      />
      <ErrorText message={submitError} />
      <PrimaryButton label={STUDENT_COPY.save} onPress={onSubmit} disabled={isSubmitting} />
    </ScrollView>
  );
}
