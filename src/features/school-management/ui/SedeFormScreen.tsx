/**
 * Create a sede under a school (S2) or edit and delete one (S3/S4). A sede that
 * still has classes is refused with an explanation instead of being deleted.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Alert, ScrollView, Text } from "react-native";
import { FormTextField } from "../../user-auth/ui/FormTextField";
import { schoolService } from "../data/repository";
import type { School, Sede } from "../model/types";
import { SCHOOL_COPY, schoolErrorMessage } from "./copy";
import { sedeFormSchema, type SedeForm } from "./form-schemas";
import { DangerButton, ErrorText, PrimaryButton } from "./parts";

interface SedeFormScreenProps {
  school: School;
  /** The sede to edit; omitted to create a new one. */
  sede?: Sede;
  onDone: () => void;
}

export function SedeFormScreen({ school, sede, onDone }: SedeFormScreenProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SedeForm>({
    resolver: zodResolver(sedeFormSchema),
    defaultValues: { name: sede?.name ?? "", address: sede?.address ?? "" },
  });

  const onSubmit = handleSubmit(async (input) => {
    setSubmitError(null);
    try {
      if (sede) {
        await schoolService.updateSede(sede, input);
      } else {
        await schoolService.createSede(school, input);
      }
      onDone();
    } catch (error) {
      setSubmitError(schoolErrorMessage(error));
    }
  });

  const deleteSede = async (target: Sede) => {
    setDeleting(true);
    setSubmitError(null);
    try {
      await schoolService.deleteSede(target);
      onDone();
    } catch (error) {
      setSubmitError(schoolErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const confirmDelete = (target: Sede) =>
    Alert.alert(SCHOOL_COPY.deleteSede, SCHOOL_COPY.confirmDeleteSede(target.name), [
      { text: SCHOOL_COPY.cancel, style: "cancel" },
      { text: SCHOOL_COPY.confirmDelete, style: "destructive", onPress: () => deleteSede(target) },
    ]);

  const busy = isSubmitting || deleting;

  return (
    <ScrollView
      className="flex-1 bg-white"
      contentContainerClassName="gap-6 bg-white px-6 py-6"
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-2xl font-bold text-slate-900">
        {sede ? SCHOOL_COPY.editSedeTitle : SCHOOL_COPY.newSedeTitle}
      </Text>
      <Text className="text-base text-slate-500">{school.name}</Text>
      <Controller
        control={control}
        name="name"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormTextField
            label={SCHOOL_COPY.sedeNameLabel}
            placeholder={SCHOOL_COPY.sedeNamePlaceholder}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.name?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="address"
        render={({ field: { onChange, onBlur, value } }) => (
          <FormTextField
            label={SCHOOL_COPY.sedeAddressLabel}
            placeholder={SCHOOL_COPY.sedeAddressPlaceholder}
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={errors.address?.message}
          />
        )}
      />
      <ErrorText message={submitError} />
      <PrimaryButton label={SCHOOL_COPY.save} onPress={onSubmit} disabled={busy} />
      {sede ? (
        <DangerButton label={SCHOOL_COPY.deleteSede} onPress={() => confirmDelete(sede)} disabled={busy} />
      ) : null}
    </ScrollView>
  );
}
