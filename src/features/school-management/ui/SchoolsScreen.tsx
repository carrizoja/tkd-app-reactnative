/**
 * Escuelas: the schools visible to the user's scope (S6/S8). Only an
 * association user can create schools (S1), so instructors never see the button.
 */
import { ScrollView, Text } from "react-native";
import type { UserScope } from "../../user-auth/model/scope";
import { schoolService } from "../data/repository";
import type { School } from "../model/types";
import { SCHOOL_COPY } from "./copy";
import { ListRow, LoadFallback, PrimaryButton } from "./parts";
import { useLoad } from "./useLoad";

interface SchoolsScreenProps {
  scope: UserScope;
  onOpenSchool: (school: School) => void;
  onCreateSchool: () => void;
  /** Bumped by the route when the screen regains focus, to show fresh data. */
  reloadKey?: number;
}

export function SchoolsScreen({ scope, onOpenSchool, onCreateSchool, reloadKey = 0 }: SchoolsScreenProps) {
  const { state, reload } = useLoad(() => schoolService.listSchools(scope), [scope, reloadKey]);

  if (state.status !== "ready") {
    return <LoadFallback failed={state.status === "error"} onRetry={reload} />;
  }

  return (
    <ScrollView contentContainerClassName="gap-3 bg-white px-6 py-6">
      {state.data.length === 0 ? (
        <Text className="text-base text-slate-500">{SCHOOL_COPY.schoolsEmpty}</Text>
      ) : (
        state.data.map((school) => (
          <ListRow key={school.id} title={school.name} onPress={() => onOpenSchool(school)} />
        ))
      )}
      {scope.kind === "association" ? (
        <PrimaryButton label={SCHOOL_COPY.newSchool} onPress={onCreateSchool} />
      ) : null}
    </ScrollView>
  );
}
