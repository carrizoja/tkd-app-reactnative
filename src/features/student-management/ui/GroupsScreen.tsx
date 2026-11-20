/** Grupos: a school's student groups with their member counts (S8). */
import { ScrollView, Text } from "react-native";
import type { School } from "../../school-management/model/types";
import { ListRow, LoadFallback, PrimaryButton } from "../../school-management/ui/parts";
import { useLoad } from "../../school-management/ui/useLoad";
import { studentService } from "../data/repository";
import type { StudentGroup } from "../model/types";
import { STUDENT_COPY } from "./copy";

interface GroupsScreenProps {
  school: School;
  onOpenGroup: (group: StudentGroup) => void;
  onCreateGroup: () => void;
  reloadKey?: number;
}

export function GroupsScreen({ school, onOpenGroup, onCreateGroup, reloadKey = 0 }: GroupsScreenProps) {
  const { state, reload } = useLoad(() => studentService.listGroups(school), [school.id, reloadKey]);

  if (state.status !== "ready") {
    return <LoadFallback failed={state.status === "error"} onRetry={reload} />;
  }

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-3 bg-white px-6 py-6">
      {state.data.length === 0 ? (
        <Text className="text-base text-slate-500">{STUDENT_COPY.groupsEmpty}</Text>
      ) : (
        state.data.map((group) => (
          <ListRow
            key={group.id}
            title={group.name}
            subtitle={STUDENT_COPY.memberCount(group.memberIds.length)}
            onPress={() => onOpenGroup(group)}
          />
        ))
      )}
      <PrimaryButton label={STUDENT_COPY.newGroup} onPress={onCreateGroup} />
    </ScrollView>
  );
}
