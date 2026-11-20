/**
 * Alumnos: a school's students with search by first name or surname (S1, S5–S7).
 * The list is loaded once and filtered on the device (assumption A2).
 */
import { useState } from "react";
import { ScrollView, Text, TextInput, View } from "react-native";
import type { School } from "../../school-management/model/types";
import { ListRow, LoadFallback, PrimaryButton, SecondaryButton } from "../../school-management/ui/parts";
import { useLoad } from "../../school-management/ui/useLoad";
import { studentService } from "../data/repository";
import { filterStudents } from "../model/search";
import type { Student } from "../model/types";
import { beltLabel } from "../model/belts";
import { fullName, STUDENT_COPY } from "./copy";

/** A magnifier drawn with two views, so the search needs no icon dependency. */
function SearchIcon() {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="h-5 w-5">
      <View className="h-3.5 w-3.5 rounded-full border-2 border-slate-400" />
      <View className="absolute bottom-0.5 right-0 h-2 w-0.5 -rotate-45 rounded-full bg-slate-400" />
    </View>
  );
}

function SearchField({ value, onChangeText }: { value: string; onChangeText: (text: string) => void }) {
  return (
    <View className="flex-row items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4">
      <SearchIcon />
      <TextInput
        accessibilityLabel={STUDENT_COPY.searchLabel}
        accessibilityRole="search"
        placeholder={STUDENT_COPY.searchPlaceholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText}
        autoCorrect={false}
        returnKeyType="search"
        className="flex-1 py-3 text-base text-slate-900"
      />
    </View>
  );
}

interface StudentsScreenProps {
  school: School;
  onOpenStudent: (student: Student) => void;
  onCreateStudent: () => void;
  onOpenGroups: () => void;
  /** Bumped by the route when the screen regains focus, to show fresh data. */
  reloadKey?: number;
}

export function StudentsScreen(props: StudentsScreenProps) {
  const { school, onOpenStudent, onCreateStudent, onOpenGroups, reloadKey = 0 } = props;
  const { state, reload } = useLoad(() => studentService.listStudents(school), [school.id, reloadKey]);
  const [term, setTerm] = useState("");

  if (state.status !== "ready") {
    return <LoadFallback failed={state.status === "error"} onRetry={reload} />;
  }

  const matches = filterStudents(state.data, term);
  const emptyMessage =
    state.data.length === 0 ? STUDENT_COPY.studentsEmpty : STUDENT_COPY.noMatches(term.trim());

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-3 bg-white px-6 py-6" keyboardShouldPersistTaps="handled">
      {/* Searching only makes sense once there is something to search. */}
      {state.data.length > 0 ? <SearchField value={term} onChangeText={setTerm} /> : null}
      {matches.length === 0 ? (
        <Text className="text-base text-slate-500">{emptyMessage}</Text>
      ) : (
        matches.map((student) => (
          <ListRow
            key={student.id}
            title={fullName(student)}
            subtitle={student.beltGrade ? STUDENT_COPY.beltGrade(beltLabel(student.beltGrade)) : STUDENT_COPY.noBeltGrade}
            onPress={() => onOpenStudent(student)}
          />
        ))
      )}
      <View className="gap-3 pt-2">
        <PrimaryButton label={STUDENT_COPY.newStudent} onPress={onCreateStudent} />
        <SecondaryButton label={STUDENT_COPY.groupsLink} onPress={onOpenGroups} />
      </View>
    </ScrollView>
  );
}
