/**
 * One group: its members, the school's other students to add, rename and
 * delete (S8/S9). Removing a member only takes them out of the group.
 */
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import type { School } from "../../school-management/model/types";
import {
  DangerButton,
  ErrorText,
  LoadFallback,
  SecondaryButton,
  SectionTitle,
} from "../../school-management/ui/parts";
import { useLoad } from "../../school-management/ui/useLoad";
import { studentService } from "../data/repository";
import type { Student, StudentGroup } from "../model/types";
import { fullName, STUDENT_COPY, studentErrorMessage } from "./copy";

interface GroupDetailScreenProps {
  school: School;
  groupId: string;
  onRename: (group: StudentGroup) => void;
  onDeleted: () => void;
  reloadKey?: number;
}

async function loadGroup(school: School, groupId: string) {
  const [groups, students] = await Promise.all([
    studentService.listGroups(school),
    studentService.listStudents(school),
  ]);
  const group = groups.find((g) => g.id === groupId);
  return group ? { group, students } : null;
}

function MemberRow({ student, actionLabel, accessibilityLabel, onPress, disabled }: {
  student: Student;
  actionLabel: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">
      <Text className="flex-1 text-base text-slate-900">{fullName(student)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        disabled={disabled}
        className="rounded-lg border border-slate-300 px-3 py-2"
      >
        <Text className="text-sm font-semibold text-slate-900">{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

export function GroupDetailScreen({ school, groupId, onRename, onDeleted, reloadKey = 0 }: GroupDetailScreenProps) {
  const { state, reload } = useLoad(() => loadGroup(school, groupId), [school.id, groupId, reloadKey]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (state.status !== "ready") {
    return <LoadFallback failed={state.status === "error"} onRetry={reload} />;
  }
  if (state.data === null) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-6">
        <Text className="text-center text-base text-slate-600">{STUDENT_COPY.groupMissing}</Text>
      </View>
    );
  }

  const { group, students } = state.data;
  // Member ids whose student was deleted are simply not shown.
  const members = students.filter((s) => group.memberIds.includes(s.id));
  const others = students.filter((s) => !group.memberIds.includes(s.id));

  const run = async (action: () => Promise<void>, thenReload = true) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      if (thenReload) reload();
    } catch (e) {
      setError(studentErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = () =>
    Alert.alert(STUDENT_COPY.deleteGroup, STUDENT_COPY.confirmDeleteGroup(group.name), [
      { text: STUDENT_COPY.cancel, style: "cancel" },
      {
        text: STUDENT_COPY.confirmDelete,
        style: "destructive",
        onPress: () =>
          run(async () => {
            await studentService.deleteGroup(group);
            onDeleted();
          }, false),
      },
    ]);

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-4 bg-white px-6 py-6">
      <Text className="text-2xl font-bold text-slate-900">{group.name}</Text>
      <SecondaryButton label={STUDENT_COPY.renameGroup} onPress={() => onRename(group)} disabled={busy} />

      <View className="gap-3">
        <SectionTitle>{STUDENT_COPY.membersTitle}</SectionTitle>
        {members.length === 0 ? (
          <Text className="text-base text-slate-500">{STUDENT_COPY.membersEmpty}</Text>
        ) : (
          members.map((student) => (
            <MemberRow
              key={student.id}
              student={student}
              actionLabel="Quitar"
              accessibilityLabel={STUDENT_COPY.removeMember(fullName(student))}
              onPress={() => run(() => studentService.removeMember(group, student))}
              disabled={busy}
            />
          ))
        )}
      </View>

      <View className="gap-3">
        <SectionTitle>{STUDENT_COPY.addMembersTitle}</SectionTitle>
        {others.length === 0 ? (
          <Text className="text-base text-slate-500">{STUDENT_COPY.addMembersEmpty}</Text>
        ) : (
          others.map((student) => (
            <MemberRow
              key={student.id}
              student={student}
              actionLabel="Agregar"
              accessibilityLabel={STUDENT_COPY.addMember(fullName(student))}
              onPress={() => run(() => studentService.addMembers(group, [student]))}
              disabled={busy}
            />
          ))
        )}
      </View>

      <ErrorText message={error} />
      <DangerButton label={STUDENT_COPY.deleteGroup} onPress={confirmDelete} disabled={busy} />
    </ScrollView>
  );
}
