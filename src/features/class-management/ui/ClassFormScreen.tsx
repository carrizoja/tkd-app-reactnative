/**
 * Create a class under a sede (S1) or edit one (S2): name, sede, weekdays and
 * start/end times picked with the device clock (A1).
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { ScrollView, Text, View } from "react-native";
import { schoolService } from "../../school-management/data/repository";
import type { School, Sede } from "../../school-management/model/types";
import { ErrorText, LoadFallback, PrimaryButton } from "../../school-management/ui/parts";
import { useLoad } from "../../school-management/ui/useLoad";
import { FormTextField } from "../../user-auth/ui/FormTextField";
import { classService } from "../data/repository";
import type { Class, Weekday } from "../model/types";
import { CLASS_COPY, WEEKDAYS, classErrorMessage } from "./copy";
import { Chip, FieldError, FieldLabel, TimeField } from "./fields";
import { classFormSchema, type ClassForm } from "./form-schemas";

interface ClassFormScreenProps {
  school: School;
  /** The class to edit; omitted to create a new one. */
  klass?: Class;
  onCreated: (created: Class) => void;
  onDone: () => void;
}

export function ClassFormScreen(props: ClassFormScreenProps) {
  const { state, reload } = useLoad(() => schoolService.listSedes(props.school), [props.school.id]);

  if (state.status !== "ready") {
    return <LoadFallback failed={state.status === "error"} onRetry={reload} />;
  }
  return <ClassFormBody {...props} sedes={state.data} />;
}

function toggle(days: Weekday[], day: Weekday): Weekday[] {
  return days.includes(day) ? days.filter((d) => d !== day) : [...days, day].sort((a, b) => a - b);
}

function ClassFormBody({ school, klass, sedes, onCreated, onDone }: ClassFormScreenProps & { sedes: Sede[] }) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClassForm>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: klass?.name ?? "",
      // A school with a single sede has nothing to choose.
      sedeId: klass?.sedeId ?? (sedes.length === 1 ? sedes[0].id : ""),
      days: klass?.schedule.days ?? [],
      start: klass?.schedule.start ?? "",
      end: klass?.schedule.end ?? "",
    },
  });

  const onSubmit = handleSubmit(async ({ name, sedeId, days, start, end }) => {
    setSubmitError(null);
    const sede = sedes.find((s) => s.id === sedeId);
    if (!sede) {
      setSubmitError(CLASS_COPY.validation.sede);
      return;
    }
    const input = { name, schedule: { days, start, end } };
    try {
      if (klass) {
        await classService.updateClass(klass, sede, input);
        onDone();
      } else {
        onCreated(await classService.createClass(school, sede, input));
      }
    } catch (error) {
      setSubmitError(classErrorMessage(error));
    }
  });

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-5 bg-white px-6 py-6" keyboardShouldPersistTaps="handled">
      <Text className="text-2xl font-bold text-slate-900">
        {klass ? CLASS_COPY.editClassTitle : CLASS_COPY.newClassTitle}
      </Text>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormTextField
            label={CLASS_COPY.nameLabel}
            placeholder={CLASS_COPY.namePlaceholder}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.name?.message}
            autoCapitalize="sentences"
          />
        )}
      />
      <Controller
        control={control}
        name="sedeId"
        render={({ field: { onChange, value } }) => (
          <View className="gap-2">
            <FieldLabel>{CLASS_COPY.sedeLabel}</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {sedes.map((sede) => (
                <Chip
                  key={sede.id}
                  label={sede.name}
                  accessibilityLabel={`${CLASS_COPY.sedeLabel} ${sede.name}`}
                  selected={value === sede.id}
                  onPress={() => onChange(sede.id)}
                />
              ))}
            </View>
            <FieldError message={errors.sedeId?.message} />
          </View>
        )}
      />
      <Controller
        control={control}
        name="days"
        render={({ field: { onChange, value } }) => (
          <View className="gap-2">
            <FieldLabel>{CLASS_COPY.daysLabel}</FieldLabel>
            <View className="flex-row flex-wrap gap-2">
              {WEEKDAYS.map(({ day, short, long }) => (
                <Chip
                  key={day}
                  label={short}
                  accessibilityLabel={CLASS_COPY.dayToggle(long)}
                  selected={value.includes(day)}
                  onPress={() => onChange(toggle(value, day))}
                />
              ))}
            </View>
            <FieldError message={errors.days?.message} />
          </View>
        )}
      />
      <View className="flex-row gap-3">
        <Controller
          control={control}
          name="start"
          render={({ field: { onChange, value } }) => (
            <TimeField label={CLASS_COPY.startLabel} value={value} onChange={onChange} error={errors.start?.message} />
          )}
        />
        <Controller
          control={control}
          name="end"
          render={({ field: { onChange, value } }) => (
            <TimeField label={CLASS_COPY.endLabel} value={value} onChange={onChange} error={errors.end?.message} />
          )}
        />
      </View>
      <ErrorText message={submitError} />
      <PrimaryButton label={CLASS_COPY.save} onPress={onSubmit} disabled={isSubmitting} />
    </ScrollView>
  );
}
