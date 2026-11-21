/**
 * Route wrappers for the school, student and class screens (OpenSpec 4.3, 5.3, 6.3). The screens
 * take plain props and callbacks; these wrappers read the user's scope and the
 * route params, and translate callbacks into navigation.
 */
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { createContext, useCallback, useContext, useRef, useState } from "react";
import type { Class } from "../features/class-management/model/types";
import { ClassDetailScreen } from "../features/class-management/ui/ClassDetailScreen";
import { ClassesScreen } from "../features/class-management/ui/ClassesScreen";
import { ClassFormScreen } from "../features/class-management/ui/ClassFormScreen";
import type { School, Sede } from "../features/school-management/model/types";
import type { Student, StudentGroup } from "../features/student-management/model/types";
import { GroupDetailScreen } from "../features/student-management/ui/GroupDetailScreen";
import { GroupFormScreen } from "../features/student-management/ui/GroupFormScreen";
import { GroupsScreen } from "../features/student-management/ui/GroupsScreen";
import { StudentFormScreen } from "../features/student-management/ui/StudentFormScreen";
import { StudentProfileScreen } from "../features/student-management/ui/StudentProfileScreen";
import { StudentsScreen } from "../features/student-management/ui/StudentsScreen";
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
  Students: { school: School };
  StudentForm: { school: School; student?: Student };
  StudentProfile: { school: School; studentId: string };
  Groups: { school: School };
  GroupForm: { school: School; group?: StudentGroup };
  GroupDetail: { school: School; groupId: string };
  Classes: { school: School };
  ClassForm: { school: School; klass?: Class };
  ClassDetail: { school: School; classId: string };
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
      onOpenStudents={(school) => navigation.navigate("Students", { school })}
      onOpenClasses={(school) => navigation.navigate("Classes", { school })}
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

export function StudentsRoute({ navigation, route }: RouteProps<"Students">) {
  const { school } = route.params;
  return (
    <StudentsScreen
      school={school}
      reloadKey={useReturnCount()}
      onOpenStudent={(student) => navigation.navigate("StudentProfile", { school, studentId: student.id })}
      onCreateStudent={() => navigation.navigate("StudentForm", { school })}
      onOpenGroups={() => navigation.navigate("Groups", { school })}
    />
  );
}

export function StudentFormRoute({ navigation, route }: RouteProps<"StudentForm">) {
  return (
    <StudentFormScreen
      school={route.params.school}
      student={route.params.student}
      onDone={() => navigation.goBack()}
    />
  );
}

export function StudentProfileRoute({ navigation, route }: RouteProps<"StudentProfile">) {
  const { school, studentId } = route.params;
  return (
    <StudentProfileScreen
      school={school}
      studentId={studentId}
      reloadKey={useReturnCount()}
      onEdit={(student) => navigation.navigate("StudentForm", { school, student })}
      onDeleted={() => navigation.goBack()}
    />
  );
}

export function GroupsRoute({ navigation, route }: RouteProps<"Groups">) {
  const { school } = route.params;
  return (
    <GroupsScreen
      school={school}
      reloadKey={useReturnCount()}
      onOpenGroup={(group) => navigation.navigate("GroupDetail", { school, groupId: group.id })}
      onCreateGroup={() => navigation.navigate("GroupForm", { school })}
    />
  );
}

export function GroupFormRoute({ navigation, route }: RouteProps<"GroupForm">) {
  const { school, group } = route.params;
  return (
    <GroupFormScreen
      school={school}
      group={group}
      // A new group replaces the form, so "back" from it returns to the list.
      onCreated={(created) => navigation.replace("GroupDetail", { school, groupId: created.id })}
      onDone={() => navigation.goBack()}
    />
  );
}

export function GroupDetailRoute({ navigation, route }: RouteProps<"GroupDetail">) {
  const { school, groupId } = route.params;
  return (
    <GroupDetailScreen
      school={school}
      groupId={groupId}
      reloadKey={useReturnCount()}
      onRename={(group) => navigation.navigate("GroupForm", { school, group })}
      onDeleted={() => navigation.goBack()}
    />
  );
}

export function ClassesRoute({ navigation, route }: RouteProps<"Classes">) {
  const { school } = route.params;
  return (
    <ClassesScreen
      school={school}
      reloadKey={useReturnCount()}
      onOpenClass={(klass) => navigation.navigate("ClassDetail", { school, classId: klass.id })}
      onCreateClass={() => navigation.navigate("ClassForm", { school })}
    />
  );
}

export function ClassFormRoute({ navigation, route }: RouteProps<"ClassForm">) {
  const { school, klass } = route.params;
  return (
    <ClassFormScreen
      school={school}
      klass={klass}
      // A new class replaces the form, so "back" from it returns to the list.
      onCreated={(created) => navigation.replace("ClassDetail", { school, classId: created.id })}
      onDone={() => navigation.goBack()}
    />
  );
}

export function ClassDetailRoute({ navigation, route }: RouteProps<"ClassDetail">) {
  const { school, classId } = route.params;
  return (
    <ClassDetailScreen
      school={school}
      classId={classId}
      reloadKey={useReturnCount()}
      onEdit={(klass) => navigation.navigate("ClassForm", { school, klass })}
      onDeleted={() => navigation.goBack()}
    />
  );
}
