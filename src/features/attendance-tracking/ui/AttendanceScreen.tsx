/**
 * Take and review a class's attendance by date (OpenSpec 7.3,
 * odd/tasks/attendance-tracking.md). Every enrolled student starts as
 * Presente; tapping a student toggles the mark, and "Guardar asistencia"
 * saves the whole day at once (A1). A recorded date shows its saved marks
 * (S2, S4) or says nothing was recorded (S5). Inactive classes are
 * history only (A2).
 */
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { classService } from "../../class-management/data/repository";
import type { Class } from "../../class-management/model/types";
import type { School } from "../../school-management/model/types";
import { ErrorText, LoadFallback, PrimaryButton, SectionTitle } from "../../school-management/ui/parts";
import { useLoad } from "../../school-management/ui/useLoad";
import { studentService } from "../../student-management/data/repository";
import type { Student } from "../../student-management/model/types";
import { fullName } from "../../student-management/ui/copy";
import { formatBirthDate, fromIsoDate, toIsoDate } from "../../student-management/ui/dates";
import { openDatePicker } from "../../student-management/ui/openDatePicker";
import { attendanceService } from "../data/repository";
import type { AttendanceMarks } from "../model/types";
import { ATTENDANCE_COPY, attendanceErrorMessage } from "./copy";

interface AttendanceScreenProps {
  school: School;
  klass: Class;
}

async function loadStudents(school: School, klass: Class) {
  const [enrolledIds, students] = await Promise.all([
    classService.listEnrolledStudentIds(klass),
    studentService.listStudents(school),
  ]);
  // Enrollments whose student was deleted are simply not shown.
  return { enrolled: students.filter((s) => enrolledIds.includes(s.id)), students };
}

function MarkToggle({ student, present, onPress, disabled }: {
  student: Student;
  present: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ATTENDANCE_COPY.markLabel(fullName(student), present)}
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
    >
      <Text className="flex-1 text-base text-slate-900">{fullName(student)}</Text>
      <Text
        className={`rounded-full px-3 py-1 text-sm font-semibold ${present ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
      >
        {present ? ATTENDANCE_COPY.present : ATTENDANCE_COPY.absent}
      </Text>
    </Pressable>
  );
}

function SavedMark({ student, present }: { student: Student; present: boolean }) {
  return (
    <Text className="rounded-xl border border-slate-200 px-4 py-3 text-base text-slate-700">
      {ATTENDANCE_COPY.markLabel(fullName(student), present)}
    </Text>
  );
}

export function AttendanceScreen({ school, klass }: AttendanceScreenProps) {
  const [date, setDate] = useState(() => toIsoDate(new Date()));
  // Marks changed on screen since the day loaded; the rest come from the saved day.
  const [changes, setChanges] = useState<AttendanceMarks>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const people = useLoad(() => loadStudents(school, klass), [school.id, klass.id]);
  const day = useLoad(() => attendanceService.getDay(klass, date), [klass.id, date]);

  if (people.state.status !== "ready" || day.state.status !== "ready") {
    const failed = people.state.status === "error" || day.state.status === "error";
    return (
      <LoadFallback
        failed={failed}
        onRetry={() => {
          people.reload();
          day.reload();
        }}
      />
    );
  }

  const { enrolled, students } = people.state.data;
  const saved = day.state.data;
  const active = klass.status === "active";
  const markOf = (id: string) => changes[id] ?? saved.marks[id] ?? true;
  const presentCount = enrolled.filter((s) => markOf(s.id)).length;
  // Saved marks of students shown outside the roster: no longer enrolled (A4), or every
  // saved mark when the class is inactive and only its history is shown (A2).
  const historyOnly = students.filter(
    (s) => s.id in saved.marks && (!active || !enrolled.some((e) => e.id === s.id)),
  );

  const pickDate = async () => {
    const picked = await openDatePicker(fromIsoDate(date), new Date());
    if (picked) {
      setDate(toIsoDate(picked));
      setChanges({});
      setError(null);
      setNotice(null);
    }
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const marks: AttendanceMarks = {};
      for (const s of enrolled) marks[s.id] = markOf(s.id);
      await attendanceService.takeAttendance(klass, date, marks);
      setChanges({});
      setNotice(ATTENDANCE_COPY.saved);
      day.reload();
    } catch (e) {
      setError(attendanceErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-4 bg-white px-6 py-6">
      <Text className="text-2xl font-bold text-slate-900">{ATTENDANCE_COPY.title(klass.name)}</Text>

      <View className="gap-1">
        <Text className="text-sm font-medium text-slate-700">{ATTENDANCE_COPY.dateLabel}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={ATTENDANCE_COPY.dateLabel}
          onPress={pickDate}
          disabled={busy}
          className="rounded-xl border border-slate-300 px-4 py-3"
        >
          <Text className="text-base text-slate-900">{formatBirthDate(date)}</Text>
        </Pressable>
      </View>

      <Text className="text-base text-slate-600">
        {saved.recorded ? ATTENDANCE_COPY.recorded : ATTENDANCE_COPY.notRecorded}
      </Text>

      {active ? (
        <View className="gap-3">
          {enrolled.length === 0 ? (
            <Text className="text-base text-slate-500">{ATTENDANCE_COPY.rosterEmpty}</Text>
          ) : (
            <>
              <SectionTitle>{ATTENDANCE_COPY.summary(presentCount, enrolled.length)}</SectionTitle>
              {enrolled.map((student) => (
                <MarkToggle
                  key={student.id}
                  student={student}
                  present={markOf(student.id)}
                  onPress={() => setChanges((c) => ({ ...c, [student.id]: !markOf(student.id) }))}
                  disabled={busy}
                />
              ))}
            </>
          )}
        </View>
      ) : (
        <Text className="text-base text-slate-500">{ATTENDANCE_COPY.inactiveNotice}</Text>
      )}

      {historyOnly.length > 0 ? (
        <View className="gap-3">
          {active ? <SectionTitle>{ATTENDANCE_COPY.formerTitle}</SectionTitle> : null}
          {historyOnly.map((student) => (
            <SavedMark key={student.id} student={student} present={saved.marks[student.id]} />
          ))}
        </View>
      ) : null}

      <ErrorText message={error} />
      {notice ? <Text className="text-base font-medium text-emerald-700">{notice}</Text> : null}
      {active && enrolled.length > 0 ? (
        <PrimaryButton label={ATTENDANCE_COPY.save} onPress={save} disabled={busy} />
      ) : null}
    </ScrollView>
  );
}
