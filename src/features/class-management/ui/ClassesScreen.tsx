/**
 * Clases: a school's active classes grouped by sede, with inactive classes in
 * their own section (S1, S3, A2).
 */
import { ScrollView, Text, View } from "react-native";
import { schoolService } from "../../school-management/data/repository";
import type { School } from "../../school-management/model/types";
import { ListRow, LoadFallback, PrimaryButton, SectionTitle } from "../../school-management/ui/parts";
import { useLoad } from "../../school-management/ui/useLoad";
import { classService } from "../data/repository";
import { splitByStatus } from "../model/schedule";
import type { Class } from "../model/types";
import { CLASS_COPY, formatSchedule } from "./copy";

interface ClassesScreenProps {
  school: School;
  onOpenClass: (klass: Class) => void;
  onCreateClass: () => void;
  reloadKey?: number;
}

async function loadClasses(school: School) {
  const [classes, sedes] = await Promise.all([classService.listClasses(school), schoolService.listSedes(school)]);
  return { classes, sedes };
}

export function ClassesScreen({ school, onOpenClass, onCreateClass, reloadKey = 0 }: ClassesScreenProps) {
  const { state, reload } = useLoad(() => loadClasses(school), [school.id, reloadKey]);

  if (state.status !== "ready") {
    return <LoadFallback failed={state.status === "error"} onRetry={reload} />;
  }

  const { classes, sedes } = state.data;
  const { active, inactive } = splitByStatus(classes);
  const sedeName = (klass: Class) => sedes.find((s) => s.id === klass.sedeId)?.name;

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-5 bg-white px-6 py-6">
      {sedes.length === 0 ? (
        <Text className="text-base text-slate-500">{CLASS_COPY.needsSede}</Text>
      ) : (
        <>
          {classes.length === 0 ? (
            <Text className="text-base text-slate-500">{CLASS_COPY.classesEmpty}</Text>
          ) : (
            sedes.map((sede) => {
              const own = active.filter((c) => c.sedeId === sede.id);
              return (
                <View key={sede.id} accessibilityLabel={`Sede ${sede.name}`} className="gap-3">
                  <SectionTitle>{sede.name}</SectionTitle>
                  {own.length === 0 ? (
                    <Text className="text-base text-slate-500">{CLASS_COPY.sedeEmpty}</Text>
                  ) : (
                    own.map((klass) => (
                      <ListRow
                        key={klass.id}
                        title={klass.name}
                        subtitle={formatSchedule(klass.schedule)}
                        onPress={() => onOpenClass(klass)}
                      />
                    ))
                  )}
                </View>
              );
            })
          )}
          {inactive.length > 0 ? (
            <View accessibilityLabel={CLASS_COPY.inactiveTitle} className="gap-3">
              <SectionTitle>{CLASS_COPY.inactiveTitle}</SectionTitle>
              {inactive.map((klass) => (
                <ListRow
                  key={klass.id}
                  title={klass.name}
                  subtitle={[sedeName(klass), formatSchedule(klass.schedule)].filter(Boolean).join(" · ")}
                  onPress={() => onOpenClass(klass)}
                />
              ))}
            </View>
          ) : null}
          <PrimaryButton label={CLASS_COPY.newClass} onPress={onCreateClass} />
        </>
      )}
    </ScrollView>
  );
}
