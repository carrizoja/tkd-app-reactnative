/**
 * One class: its sede and schedule, a link to its attendance, its roster with the school's other students
 * to enroll (S4–S6), edit, deactivate/reactivate (S3) and delete (S2).
 */
import { useState } from "react";
import { ATTENDANCE_COPY } from "../../attendance-tracking/ui/copy";
import { Alert, ScrollView, Text, View } from "react-native";
import { schoolService } from "../../school-management/data/repository";
import type { School } from "../../school-management/model/types";
import {
  DangerButton,
  ErrorText,
  LoadFallback,
  PrimaryButton,
  SecondaryButton,
  SectionTitle,
} from "../../school-management/ui/parts";
import { useLoad } from "../../school-management/ui/useLoad";
import { studentService } from "../../student-management/data/repository";
import { fullName } from "../../student-management/ui/copy";
import { MemberRow } from "../../student-management/ui/MemberRow";
import { classService } from "../data/repository";
import type { Class } from "../model/types";
import { CLASS_COPY, classErrorMessage, formatSchedule } from "./copy";

interface ClassDetailScreenProps {
  school: School;
  classId: string;
  onEdit: (klass: Class) => void;
  onDeleted: () => void;
  onOpenAttendance: (klass: Class) => void;
  reloadKey?: number;
}

async function loadClass(school: School, classId: string) {
  const klass = await classService.getClass(classId);
  if (!klass) {
    return null;
  }
  const [enrolledIds, students, sedes] = await Promise.all([
    classService.listEnrolledStudentIds(klass),
    studentService.listStudents(school),
    schoolService.listSedes(school),
  ]);
  return { klass, enrolledIds, students, sede: sedes.find((s) => s.id === klass.sedeId) };
}

export function ClassDetailScreen({
  school,
  classId,
  onEdit,
  onDeleted,
  onOpenAttendance,
  reloadKey = 0,
}: ClassDetailScreenProps) {
  const { state, reload } = useLoad(() => loadClass(school, classId), [school.id, classId, reloadKey]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.status !== "ready") {
    return <LoadFallback failed={state.status === "error"} onRetry={reload} />;
  }
  if (state.data === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base text-slate-600">{CLASS_COPY.classMissing}</Text>
      </View>
    );
  }

  const { klass, enrolledIds, students, sede } = state.data;
  // Enrollments whose student was deleted are simply not shown (A4).
  const roster = students.filter((s) => enrolledIds.includes(s.id));
  const others = students.filter((s) => !enrolledIds.includes(s.id));
  const inactive = klass.status === "inactive";

  const run = async (action: () => Promise<void>, thenReload = true) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (thenReload) reload();
    } catch (e) {
      setError(classErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert(CLASS_COPY.deleteClass, CLASS_COPY.confirmDeleteClass(klass.name), [
      { text: CLASS_COPY.cancel, style: "cancel" },
      {
        text: CLASS_COPY.confirmDelete,
        style: "destructive",
        onPress: () =>
          run(async () => {
            await classService.deleteClass(klass);
            onDeleted();
          }, false),
      },
    ]);

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-4 bg-white px-6 py-6">
      <View className="gap-1">
        <View className="flex-row flex-wrap items-center gap-2">
          <Text className="text-2xl font-bold text-slate-900">{klass.name}</Text>
          {inactive ? (
            <Text className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
              {CLASS_COPY.inactiveBadge}
            </Text>
          ) : null}
        </View>
        <Text className="text-base text-slate-600">
          {[sede?.name, formatSchedule(klass.schedule)].filter(Boolean).join(" · ")}
        </Text>
      </View>
      <PrimaryButton label={ATTENDANCE_COPY.classLink} onPress={() => onOpenAttendance(klass)} disabled={busy} />
      <SecondaryButton label={CLASS_COPY.editClass} onPress={() => onEdit(klass)} disabled={busy} />
      <SecondaryButton
        label={inactive ? CLASS_COPY.reactivate : CLASS_COPY.deactivate}
        onPress={() => run(() => classService.setStatus(klass, inactive ? "active" : "inactive"))}
        disabled={busy}
      />

      <View className="gap-3">
        <SectionTitle>{CLASS_COPY.rosterTitle}</SectionTitle>
        {roster.length === 0 ? (
          <Text className="text-base text-slate-500">{CLASS_COPY.rosterEmpty}</Text>
        ) : (
          roster.map((student) => (
            <MemberRow
              key={student.id}
              student={student}
              actionLabel={CLASS_COPY.unenrollAction}
              accessibilityLabel={CLASS_COPY.unenroll(fullName(student))}
              onPress={() => run(() => classService.unenroll(klass, student))}
              disabled={busy}
            />
          ))
        )}
      </View>

      <View className="gap-3">
        <SectionTitle>{CLASS_COPY.enrollTitle}</SectionTitle>
        {others.length === 0 ? (
          <Text className="text-base text-slate-500">{CLASS_COPY.enrollEmpty}</Text>
        ) : (
          others.map((student) => (
            <MemberRow
              key={student.id}
              student={student}
              actionLabel={CLASS_COPY.enrollAction}
              accessibilityLabel={CLASS_COPY.enroll(fullName(student))}
              onPress={() => run(() => classService.enroll(klass, [student]))}
              disabled={busy}
            />
          ))
        )}
      </View>

      <ErrorText message={error} />
      <DangerButton label={CLASS_COPY.deleteClass} onPress={confirmDelete} disabled={busy} />
    </ScrollView>
  );
}
