/**
 * Route wrappers for the school-management screens (OpenSpec 4.3). The screens
 * take plain props and callbacks; these wrappers read the user's scope and the
 * route params, and translate callbacks into navigation.
 */
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { School, Sede } from "../features/school-management/model/types";
import { SchoolDetailScreen } from "../features/school-management/ui/SchoolDetailScreen";
import { SchoolFormScreen } from "../features/school-management/ui/SchoolFormScreen";
import { SchoolsScreen } from "../features/school-management/ui/SchoolsScreen";
import { SedeFormScreen } from "../features/school-management/ui/SedeFormScreen";
import type { UserScope } from "../features/user-auth/model/scope";

export type SchoolRoutesParamList = {
  Schools: undefined;
  SchoolDetail: { schoolId: string };
  SchoolForm: { school?: School };
  SedeForm: { school: School; sede?: Sede };
};

/** The signed-in user's scope; provided by `RootNavigator` once it is resolved. */
export const ScopeContext = createContext<UserScope | null>(null);

function useScope(): UserScope {
  const scope = useContext(ScopeContext);
  if (scope === null) {
    throw new Error("School routes must render inside a ScopeContext provider.");
  }
  return scope;
}

/** Counts returns to a screen, so lists refresh after a form pops back. */
function useReturnCount(): number {
  const [count, setCount] = useState(0);
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      setCount((n) => n + 1);
    }, []),
  );
  return count;
}

type RouteProps<K extends keyof SchoolRoutesParamList> = NativeStackScreenProps<SchoolRoutesParamList, K>;

export function SchoolsRoute({ navigation }: RouteProps<"Schools">) {
  return (
    <SchoolsScreen
      scope={useScope()}
      reloadKey={useReturnCount()}
      onOpenSchool={(school) => navigation.navigate("SchoolDetail", { schoolId: school.id })}
      onCreateSchool={() => navigation.navigate("SchoolForm", {})}
    />
  );
}

export function SchoolDetailRoute({ navigation, route }: RouteProps<"SchoolDetail">) {
  return (
    <SchoolDetailScreen
      scope={useScope()}
      schoolId={route.params.schoolId}
      reloadKey={useReturnCount()}
      onEditSchool={(school) => navigation.navigate("SchoolForm", { school })}
      onCreateSede={(school) => navigation.navigate("SedeForm", { school })}
      onEditSede={(school, sede) => navigation.navigate("SedeForm", { school, sede })}
      onDeleted={() => navigation.goBack()}
    />
  );
}

export function SchoolFormRoute({ navigation, route }: RouteProps<"SchoolForm">) {
  return <SchoolFormScreen scope={useScope()} school={route.params.school} onDone={() => navigation.goBack()} />;
}

export function SedeFormRoute({ navigation, route }: RouteProps<"SedeForm">) {
  return (
    <SedeFormScreen school={route.params.school} sede={route.params.sede} onDone={() => navigation.goBack()} />
  );
}
