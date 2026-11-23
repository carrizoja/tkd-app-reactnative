/**
 * A school's cuotas for one month (OpenSpec 8.3, odd/tasks/fee-management.md).
 * Opens on the current month with previous/next month buttons, never past the
 * current one (A2). "Adeudan" lists the students with no payment for the month
 * (S4) and "Pagaron" the ones who paid, with amount and date (S5). Tapping an
 * overdue student asks for the amount and registers a cash payment (S1, S3,
 * A1); a month already paid is reported, not overwritten (S2).
 */
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { School } from "../../school-management/model/types";
import { ErrorText, LoadFallback, PrimaryButton, SecondaryButton, SectionTitle } from "../../school-management/ui/parts";
import { useLoad } from "../../school-management/ui/useLoad";
import type { Student } from "../../student-management/model/types";
import { fullName } from "../../student-management/ui/copy";
import { formatBirthDate, toIsoDate } from "../../student-management/ui/dates";
import { FormTextField } from "../../user-auth/ui/FormTextField";
import { feeService } from "../data/repository";
import { FEE_COPY, feeErrorMessage, formatAmount, formatPeriod, parseAmount, shiftPeriod } from "./copy";

interface FeesScreenProps {
  school: School;
}

function MonthButton({ label, symbol, onPress, disabled }: {
  label: string;
  symbol: string;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      className={`h-11 w-11 items-center justify-center rounded-full border ${disabled ? "border-slate-200" : "border-slate-300"}`}
    >
      <Text className={`text-xl ${disabled ? "text-slate-300" : "text-slate-900"}`}>{symbol}</Text>
    </Pressable>
  );
}

export function FeesScreen({ school }: FeesScreenProps) {
  const [currentPeriod] = useState(() => feeService.currentPeriod());
  const [period, setPeriod] = useState(currentPeriod);
  // The overdue student whose amount form is open.
  const [paying, setPaying] = useState<Student | null>(null);
  const [amountText, setAmountText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const month = useLoad(() => feeService.getPeriod(school.id, period), [school.id, period]);

  const changePeriod = (delta: number) => {
    setPeriod((p) => shiftPeriod(p, delta));
    setPaying(null);
    setError(null);
    setNotice(null);
  };

  const openForm = (student: Student) => {
    setPaying(student);
    setAmountText("");
    setError(null);
    setNotice(null);
  };

  const register = async () => {
    if (!paying) return;
    setBusy(true);
    setError(null);
    try {
      await feeService.registerPayment(paying, period, parseAmount(amountText));
      setNotice(FEE_COPY.registered(fullName(paying)));
      setPaying(null);
      month.reload();
    } catch (e) {
      setError(feeErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <View className="gap-4">
      <Text className="text-2xl font-bold text-slate-900">{FEE_COPY.title(school.name)}</Text>
      <View className="flex-row items-center justify-between">
        <MonthButton label={FEE_COPY.previousMonth} symbol="‹" onPress={() => changePeriod(-1)} disabled={busy} />
        <Text className="text-lg font-semibold text-slate-900">{formatPeriod(period)}</Text>
        <MonthButton
          label={FEE_COPY.nextMonth}
          symbol="›"
          onPress={() => changePeriod(1)}
          // `YYYY-MM` strings compare in calendar order.
          disabled={busy || period >= currentPeriod}
        />
      </View>
    </View>
  );

  if (month.state.status !== "ready") {
    return (
      <View className="flex-1 gap-4 bg-white px-6 py-6">
        {header}
        <LoadFallback failed={month.state.status === "error"} onRetry={month.reload} />
      </View>
    );
  }

  const { overdue, paid } = month.state.data;

  return (
    <ScrollView className="flex-1 bg-white" contentContainerClassName="gap-4 bg-white px-6 py-6">
      {header}

      {notice ? <Text className="text-base font-medium text-emerald-700">{notice}</Text> : null}

      {overdue.length === 0 && paid.length === 0 ? (
        <Text className="text-base text-slate-500">{FEE_COPY.noStudents}</Text>
      ) : (
        <>
          <View className="gap-3">
            <SectionTitle>{FEE_COPY.overdueTitle(overdue.length)}</SectionTitle>
            {overdue.length === 0 ? <Text className="text-base text-slate-500">{FEE_COPY.noOverdue}</Text> : null}
            {overdue.map((student) =>
              paying?.id === student.id ? (
                <View key={student.id} className="gap-3 rounded-xl border border-slate-300 px-4 py-4">
                  <Text className="text-base font-semibold text-slate-900">{fullName(student)}</Text>
                  <FormTextField
                    label={FEE_COPY.amountLabel}
                    placeholder={FEE_COPY.amountPlaceholder}
                    keyboardType="decimal-pad"
                    value={amountText}
                    onChangeText={setAmountText}
                    editable={!busy}
                    autoFocus
                  />
                  <Text className="text-sm text-slate-500">{FEE_COPY.cashNote}</Text>
                  <ErrorText message={error} />
                  <PrimaryButton label={FEE_COPY.register} onPress={register} disabled={busy} />
                  <SecondaryButton label={FEE_COPY.cancel} onPress={() => setPaying(null)} disabled={busy} />
                </View>
              ) : (
                <Pressable
                  key={student.id}
                  accessibilityRole="button"
                  accessibilityLabel={FEE_COPY.registerFor(fullName(student))}
                  onPress={() => openForm(student)}
                  disabled={busy}
                  className="flex-row items-center justify-between rounded-xl border border-slate-200 px-4 py-3"
                >
                  <Text className="flex-1 text-base text-slate-900">{fullName(student)}</Text>
                  <Text className="rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-800">
                    {FEE_COPY.collect}
                  </Text>
                </Pressable>
              ),
            )}
          </View>

          <View className="gap-3">
            <SectionTitle>{FEE_COPY.paidTitle(paid.length)}</SectionTitle>
            {paid.length === 0 ? <Text className="text-base text-slate-500">{FEE_COPY.noPaid}</Text> : null}
            {paid.map(({ student, payment }) => (
              <View key={student.id} className="gap-1 rounded-xl border border-slate-200 px-4 py-3">
                <Text className="text-base text-slate-900">{fullName(student)}</Text>
                <Text className="text-sm text-emerald-700">
                  {FEE_COPY.paidLine(
                    formatAmount(payment.amount),
                    formatBirthDate(toIsoDate(new Date(payment.paidAt))),
                  )}
                </Text>
              </View>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}
