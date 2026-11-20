/**
 * Belt/grade selector (S3): a field that opens the ITF grade list. Picking from
 * a fixed list keeps the stored values consistent ("8° Gup", never "8 gup").
 */
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { beltLabel, ITF_BELTS } from "../model/belts";
import { STUDENT_COPY } from "./copy";

interface BeltSelectProps {
  label: string;
  /** The stored grade, or "" for none. */
  value: string;
  onChange: (grade: string) => void;
  error?: string;
}

function Option({ text, selected, onPress }: { text: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={`border-b border-slate-100 px-6 py-4 ${selected ? "bg-slate-100" : "bg-white"}`}
    >
      <Text className={`text-base ${selected ? "font-semibold text-slate-900" : "text-slate-700"}`}>{text}</Text>
    </Pressable>
  );
}

export function BeltSelect({ label, value, onChange, error }: BeltSelectProps) {
  const [open, setOpen] = useState(false);
  const choose = (grade: string) => {
    onChange(grade);
    setOpen(false);
  };

  return (
    <View className="gap-1">
      <Text className="text-sm font-medium text-slate-700">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        className={`flex-row items-center justify-between rounded-xl border px-4 py-3 ${
          error ? "border-red-500" : "border-slate-300"
        }`}
      >
        <Text className={`text-base ${value ? "text-slate-900" : "text-slate-400"}`}>
          {value ? beltLabel(value) : STUDENT_COPY.beltGradePlaceholder}
        </Text>
        <Text className="text-base text-slate-400">▾</Text>
      </Pressable>
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[80%] rounded-t-2xl bg-white pb-6">
            <Text className="px-6 pb-2 pt-5 text-lg font-bold text-slate-900">{STUDENT_COPY.selectBeltTitle}</Text>
            <ScrollView>
              <Option text={STUDENT_COPY.noBeltGrade} selected={value === ""} onPress={() => choose("")} />
              {ITF_BELTS.map((belt) => (
                <Option
                  key={belt.grade}
                  text={belt.label}
                  selected={belt.grade === value}
                  onPress={() => choose(belt.grade)}
                />
              ))}
            </ScrollView>
            <Pressable accessibilityRole="button" onPress={() => setOpen(false)} className="items-center px-6 pt-4">
              <Text className="text-base font-semibold text-slate-600">{STUDENT_COPY.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
