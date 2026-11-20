/**
 * Create a student under a school (S1) or edit one, including the belt/grade
 * (S3/S4). Emptied optional fields are cleared by the service.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, Text } from "react-native";
import type { School } from "../../school-management/model/types";
import { ErrorText, PrimaryButton } from "../../school-management/ui/parts";
import { FormTextField } from "../../user-auth/ui/FormTextField";
import { studentService } from "../data/repository";
import type { Student } from "../model/types";
import { BeltSelect } from "./BeltSelect";
import { DateField } from "./DateField";
import { STUDENT_COPY, studentErrorMessage } from "./copy";
import { studentFormSchema, type StudentForm } from "./form-schemas";

interface StudentFormScreenProps {
  school: School;
  /** The student to edit; omitted to create a new one. */
  student?: Student;
  onDone: () => void;
}

const FIELDS = [
  { name: "firstName", label: STUDENT_COPY.firstNameLabel, placeholder: STUDENT_COPY.firstNamePlaceholder },
  { name: "lastName", label: STUDENT_COPY.lastNameLabel, placeholder: STUDENT_COPY.lastNamePlaceholder },
] as const;

export function StudentFormScreen({ school, student, onDone }: StudentFormScreenProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<StudentForm>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: {
      firstName: student?.firstName ?? "",
      lastName: student?.lastName ?? "",
      beltGrade: student?.beltGrade ?? "",
      birthDate: student?.birthDate ?? "",
    },
  });

  const onSubmit = handleSubmit(async (input) => {
    setSubmitError(null);
    try {
      if (student) {
        await studentService.updateStudent(student, input);
      } else {
        await studentService.createStudent(school, input);
      }
      onDone();
    } catch (error) {
      setSubmitError(studentErrorMessage(error));
    }
  });

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-5 bg-white px-6 py-6" keyboardShouldPersistTaps="handled">
      <Text className="text-2xl font-bold text-slate-900">
        {student ? STUDENT_COPY.editStudentTitle : STUDENT_COPY.newStudentTitle}
      </Text>
      {FIELDS.map((field) => (
        <Controller
          key={field.name}
          control={control}
          name={field.name}
          render={({ field: { onChange, onBlur, value } }) => (
            <FormTextField
              label={field.label}
              placeholder={field.placeholder}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors[field.name]?.message}
              autoCapitalize="words"
            />
          )}
        />
      ))}
      <Controller
        control={control}
        name="beltGrade"
        render={({ field: { onChange, value } }) => (
          <BeltSelect
            label={STUDENT_COPY.beltGradeLabel}
            value={value}
            onChange={onChange}
            error={errors.beltGrade?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="birthDate"
        render={({ field: { onChange, value } }) => (
          <DateField
            label={STUDENT_COPY.birthDateLabel}
            value={value}
            onChange={onChange}
            error={errors.birthDate?.message}
          />
        )}
      />
      <ErrorText message={submitError} />
      <PrimaryButton label={STUDENT_COPY.save} onPress={onSubmit} disabled={isSubmitting} />
    </ScrollView>
  );
}
