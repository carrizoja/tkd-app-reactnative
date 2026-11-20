/**
 * A student's profile: photo, name, belt/grade and birth date (S2–S4). Picking
 * a photo uploads it right away; deleting asks for confirmation. Attendance and
 * fee stats join this screen once those sections exist (assumption A3).
 */
import { useState } from "react";
import { Alert, Image, ScrollView, Text, View } from "react-native";
import type { School } from "../../school-management/model/types";
import {
  DangerButton,
  ErrorText,
  LoadFallback,
  SecondaryButton,
} from "../../school-management/ui/parts";
import { useLoad } from "../../school-management/ui/useLoad";
import { studentService } from "../data/repository";
import type { Student } from "../model/types";
import { beltLabel } from "../model/belts";
import { fullName, STUDENT_COPY, studentErrorMessage } from "./copy";
import { formatBirthDate } from "./dates";
import { pickPhoto } from "./pickPhoto";

interface StudentProfileScreenProps {
  school: School;
  studentId: string;
  onEdit: (student: Student) => void;
  onDeleted: () => void;
  reloadKey?: number;
}

function Avatar({ student, photoUrl }: { student: Student; photoUrl?: string }) {
  if (photoUrl) {
    return (
      <Image
        accessibilityLabel={STUDENT_COPY.photoAlt(fullName(student))}
        source={{ uri: photoUrl }}
        className="h-32 w-32 rounded-full bg-slate-100"
      />
    );
  }
  const initials = `${student.firstName[0] ?? ""}${student.lastName[0] ?? ""}`.toUpperCase();
  return (
    <View className="h-32 w-32 items-center justify-center rounded-full bg-slate-200">
      <Text className="text-3xl font-bold text-slate-600">{initials}</Text>
    </View>
  );
}

export function StudentProfileScreen({ studentId, onEdit, onDeleted, reloadKey = 0 }: StudentProfileScreenProps) {
  const { state, reload } = useLoad(() => studentService.getStudent(studentId), [studentId, reloadKey]);
  // The URL of a photo uploaded on this screen, shown without reloading the student.
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.status !== "ready") {
    return <LoadFallback failed={state.status === "error"} onRetry={reload} />;
  }
  const student = state.data;
  if (student === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base text-slate-600">{STUDENT_COPY.studentMissing}</Text>
      </View>
    );
  }

  const photoUrl = uploadedUrl ?? student.photoUrl;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e) {
      setError(studentErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const changePhoto = () =>
    run(async () => {
      const photo = await pickPhoto();
      if (photo) {
        setUploadedUrl(await studentService.setPhoto(student, photo));
      }
    });

  const confirmDelete = () =>
    Alert.alert(STUDENT_COPY.deleteStudent, STUDENT_COPY.confirmDeleteStudent(fullName(student)), [
      { text: STUDENT_COPY.cancel, style: "cancel" },
      {
        text: STUDENT_COPY.confirmDelete,
        style: "destructive",
        onPress: () =>
          run(async () => {
            await studentService.deleteStudent(student);
            onDeleted();
          }),
      },
    ]);

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="items-center gap-4 bg-white px-6 py-6">
      <Avatar student={student} photoUrl={photoUrl} />
      <Text className="text-2xl font-bold text-slate-900">{fullName(student)}</Text>
      <Text className="text-base text-slate-600">
        {student.beltGrade ? STUDENT_COPY.beltGrade(beltLabel(student.beltGrade)) : STUDENT_COPY.noBeltGrade}
      </Text>
      {student.birthDate ? (
        <Text className="text-base text-slate-600">{STUDENT_COPY.birthDate(formatBirthDate(student.birthDate))}</Text>
      ) : null}
      <ErrorText message={error} />
      <View className="w-full gap-3">
        <SecondaryButton
          label={photoUrl ? STUDENT_COPY.changePhoto : STUDENT_COPY.addPhoto}
          onPress={changePhoto}
          disabled={busy}
        />
        <SecondaryButton label={STUDENT_COPY.editStudent} onPress={() => onEdit(student)} disabled={busy} />
        <DangerButton label={STUDENT_COPY.deleteStudent} onPress={confirmDelete} disabled={busy} />
      </View>
    </ScrollView>
  );
}
