/**
 * One school with its sedes (S4). Deleting asks for confirmation and is offered
 * only to association users; a school that still has sedes is refused with an
 * explanation (S5, decision L2).
 */
import { useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";
import type { UserScope } from "../../user-auth/model/scope";
import { schoolService } from "../data/repository";
import type { School, Sede } from "../model/types";
import { CLASS_COPY } from "../../class-management/ui/copy";
import { STUDENT_COPY } from "../../student-management/ui/copy";
import { SCHOOL_COPY, schoolErrorMessage } from "./copy";
import {
  DangerButton,
  ErrorText,
  ListRow,
  LoadFallback,
  PrimaryButton,
  SecondaryButton,
  SectionTitle,
} from "./parts";
import { useLoad } from "./useLoad";

interface SchoolDetailScreenProps {
  scope: UserScope;
  schoolId: string;
  onEditSchool: (school: School) => void;
  onCreateSede: (school: School) => void;
  onEditSede: (school: School, sede: Sede) => void;
  onDeleted: () => void;
  onOpenStudents: (school: School) => void;
  onOpenClasses: (school: School) => void;
  reloadKey?: number;
}

async function loadSchoolWithSedes(schoolId: string) {
  const school = await schoolService.getSchool(schoolId);
  return school ? { school, sedes: await schoolService.listSedes(school) } : null;
}

export function SchoolDetailScreen(props: SchoolDetailScreenProps) {
  const {
    scope,
    schoolId,
    onEditSchool,
    onCreateSede,
    onEditSede,
    onDeleted,
    onOpenStudents,
    onOpenClasses,
    reloadKey = 0,
  } = props;
  const { state, reload } = useLoad(() => loadSchoolWithSedes(schoolId), [schoolId, reloadKey]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.status !== "ready") {
    return <LoadFallback failed={state.status === "error"} onRetry={reload} />;
  }
  if (state.data === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base text-slate-600">{SCHOOL_COPY.schoolMissing}</Text>
      </View>
    );
  }

  const { school, sedes } = state.data;

  const deleteSchool = async () => {
    setBusy(true);
    setError(null);
    try {
      await schoolService.deleteSchool(scope, school);
      onDeleted();
    } catch (e) {
      setError(schoolErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert(SCHOOL_COPY.deleteSchool, SCHOOL_COPY.confirmDeleteSchool(school.name), [
      { text: SCHOOL_COPY.cancel, style: "cancel" },
      { text: SCHOOL_COPY.confirmDelete, style: "destructive", onPress: deleteSchool },
    ]);

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-4 bg-white px-6 py-6">
      <Text className="text-2xl font-bold text-slate-900">{school.name}</Text>
      <PrimaryButton label={STUDENT_COPY.schoolLink} onPress={() => onOpenStudents(school)} />
      <PrimaryButton label={CLASS_COPY.schoolLink} onPress={() => onOpenClasses(school)} />
      <SecondaryButton label={SCHOOL_COPY.editSchool} onPress={() => onEditSchool(school)} />

      <View className="gap-3">
        <SectionTitle>{SCHOOL_COPY.sedesTitle}</SectionTitle>
        {sedes.length === 0 ? (
          <Text className="text-base text-slate-500">{SCHOOL_COPY.sedesEmpty}</Text>
        ) : (
          sedes.map((sede) => (
            <ListRow
              key={sede.id}
              title={sede.name}
              subtitle={sede.address}
              onPress={() => onEditSede(school, sede)}
            />
          ))
        )}
        <PrimaryButton label={SCHOOL_COPY.newSede} onPress={() => onCreateSede(school)} />
      </View>

      <ErrorText message={error} />
      {scope.kind === "association" ? (
        <DangerButton label={SCHOOL_COPY.deleteSchool} onPress={confirmDelete} disabled={busy} />
      ) : null}
    </ScrollView>
  );
}
