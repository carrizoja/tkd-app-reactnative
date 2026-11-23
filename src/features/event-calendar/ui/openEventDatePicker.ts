/**
 * Opens Android's native calendar dialog for an event day: today or later
 * (odd/tasks/event-calendar.md A3). Kept in its own module so screen tests
 * can replace it; the picker is a native module. Android only, like the
 * student birth-date picker.
 */
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

/** The picked day, or null when the user dismisses the dialog. */
export function openEventDatePicker(value: Date, minimumDate: Date): Promise<Date | null> {
  return new Promise((resolve) => {
    DateTimePickerAndroid.open({
      value,
      mode: "date",
      minimumDate,
      onValueChange: (_event, date) => resolve(date),
      onDismiss: () => resolve(null),
    });
  });
}
