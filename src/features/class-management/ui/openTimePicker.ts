/**
 * Opens Android's native clock dialog for a class's start or end time.
 * Kept in its own module so screen tests can replace it; the picker is a
 * native module. Android only, like `openDatePicker`.
 */
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

const pad = (n: number) => String(n).padStart(2, "0");

/** The picked time as 24-hour `HH:MM`, or null when the user dismisses the dialog. */
export function openTimePicker(initial: string): Promise<string | null> {
  const [hours, minutes] = initial.split(":").map(Number);
  const value = new Date();
  value.setHours(hours, minutes, 0, 0);
  return new Promise((resolve) => {
    DateTimePickerAndroid.open({
      value,
      mode: "time",
      is24Hour: true,
      onValueChange: (_event, date) => resolve(`${pad(date.getHours())}:${pad(date.getMinutes())}`),
      onDismiss: () => resolve(null),
    });
  });
}
