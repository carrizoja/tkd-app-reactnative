/**
 * A school's calendar (OpenSpec 9.3, odd/tasks/event-calendar.md). Lists the
 * upcoming events by date (S3, A2) with a type filter (S4), and creates a
 * mesa de examen, torneo or master class with a title and a day picked on
 * the native calendar, today or later (S1, A3). The service rejects invalid
 * input and the screen shows why (S2).
 */
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { School } from "../../school-management/model/types";
import { ErrorText, LoadFallback, PrimaryButton, SecondaryButton, SectionTitle } from "../../school-management/ui/parts";
import { useLoad } from "../../school-management/ui/useLoad";
import { formatBirthDate, fromIsoDate, toIsoDate } from "../../student-management/ui/dates";
import { FormTextField } from "../../user-auth/ui/FormTextField";
import { eventService } from "../data/repository";
import { EVENT_TYPES, type EventType } from "../model/types";
import { EVENT_COPY, EVENT_TYPE_FILTERS, EVENT_TYPE_LABELS, eventErrorMessage } from "./copy";
import { openEventDatePicker } from "./openEventDatePicker";

interface CalendarScreenProps {
  school: School;
}

function Chip({ label, accessibilityLabel, selected, onPress, disabled }: {
  label: string;
  accessibilityLabel?: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected, disabled }}
      onPress={onPress}
      disabled={disabled}
      className={`rounded-full border px-4 py-2 ${selected ? "border-slate-900 bg-slate-900" : "border-slate-300 bg-white"}`}
    >
      <Text className={`text-sm font-medium ${selected ? "text-white" : "text-slate-900"}`}>{label}</Text>
    </Pressable>
  );
}

interface Draft {
  type: EventType | "";
  title: string;
  date: string;
}

export function CalendarScreen({ school }: CalendarScreenProps) {
  const [today] = useState(() => eventService.today());
  const [filter, setFilter] = useState<EventType | undefined>(undefined);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const upcoming = useLoad(() => eventService.listUpcoming(school.id, filter), [school.id, filter]);

  const changeFilter = (type: EventType | undefined) => {
    setFilter(type);
    setNotice(null);
  };

  const openForm = () => {
    setDraft({ type: "", title: "", date: today });
    setError(null);
    setNotice(null);
  };

  const pickDate = async () => {
    if (!draft) return;
    const picked = await openEventDatePicker(fromIsoDate(draft.date), fromIsoDate(today));
    if (picked) {
      setDraft((d) => (d ? { ...d, date: toIsoDate(picked) } : d));
    }
  };

  const create = async () => {
    if (!draft) return;
    setBusy(true);
    setError(null);
    try {
      const created = await eventService.createEvent(school, draft);
      setNotice(EVENT_COPY.created(created.title));
      setDraft(null);
      upcoming.reload();
    } catch (e) {
      setError(eventErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <View className="gap-4">
      <Text className="text-2xl font-bold text-slate-900">{EVENT_COPY.title(school.name)}</Text>
      <View className="flex-row flex-wrap gap-2">
        <Chip label={EVENT_COPY.filterAll} selected={filter === undefined} onPress={() => changeFilter(undefined)} />
        {EVENT_TYPES.map((type) => (
          <Chip
            key={type}
            label={EVENT_TYPE_FILTERS[type]}
            selected={filter === type}
            onPress={() => changeFilter(type)}
          />
        ))}
      </View>
    </View>
  );

  const form = draft ? (
    <View className="gap-3 rounded-xl border border-slate-300 px-4 py-4">
      <Text className="text-sm font-medium text-slate-700">{EVENT_COPY.typeLabel}</Text>
      <View className="flex-row flex-wrap gap-2">
        {EVENT_TYPES.map((type) => (
          <Chip
            key={type}
            label={EVENT_TYPE_LABELS[type]}
            accessibilityLabel={`${EVENT_COPY.typeLabel}: ${EVENT_TYPE_LABELS[type]}`}
            selected={draft.type === type}
            onPress={() => setDraft({ ...draft, type })}
            disabled={busy}
          />
        ))}
      </View>
      <FormTextField
        label={EVENT_COPY.titleLabel}
        placeholder={EVENT_COPY.titlePlaceholder}
        value={draft.title}
        onChangeText={(title) => setDraft({ ...draft, title })}
        editable={!busy}
        maxLength={100}
      />
      <View className="gap-1">
        <Text className="text-sm font-medium text-slate-700">{EVENT_COPY.dateLabel}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={EVENT_COPY.dateLabel}
          onPress={pickDate}
          disabled={busy}
          className="rounded-xl border border-slate-300 px-4 py-3"
        >
          <Text className="text-base text-slate-900">{formatBirthDate(draft.date)}</Text>
        </Pressable>
      </View>
      <ErrorText message={error} />
      <PrimaryButton label={EVENT_COPY.create} onPress={create} disabled={busy} />
      <SecondaryButton label={EVENT_COPY.cancel} onPress={() => setDraft(null)} disabled={busy} />
    </View>
  ) : (
    <PrimaryButton label={EVENT_COPY.newEvent} onPress={openForm} />
  );

  if (upcoming.state.status !== "ready") {
    return (
      <View className="flex-1 gap-4 bg-white px-6 py-6">
        {header}
        <LoadFallback failed={upcoming.state.status === "error"} onRetry={upcoming.reload} />
      </View>
    );
  }

  const list = upcoming.state.data;

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-4 bg-white px-6 py-6">
      {header}
      {notice ? <Text className="text-base font-medium text-emerald-700">{notice}</Text> : null}
      {form}

      <View className="gap-3">
        <SectionTitle>{EVENT_COPY.upcomingTitle(list.length)}</SectionTitle>
        {list.length === 0 ? (
          <Text className="text-base text-slate-500">
            {filter ? EVENT_COPY.noEventsOfType : EVENT_COPY.noEvents}
          </Text>
        ) : null}
        {list.map((event) => (
          <View key={event.id} className="gap-1 rounded-xl border border-slate-200 px-4 py-3">
            <Text className="text-base font-semibold text-slate-900">{event.title}</Text>
            <Text className="text-sm text-slate-600">
              {`${EVENT_TYPE_LABELS[event.type]} · ${formatBirthDate(event.date)}`}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}
