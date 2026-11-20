/**
 * Opens Android's native calendar dialog (L12 decision: native calendar).
 * Kept in its own module so screen tests can replace it; the picker is a
 * native module. Uses the imperative API the library README recommends on
 * Android; `onChange` is deprecated in favor of `onValueChange`/`onDismiss`.
 *
 * Android only: the app currently ships an Android build. An iOS build would
 * need the `<DateTimePicker />` component instead.
 */
import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";

/** The picked day, or null when the user dismisses the dialog. */
export function openDatePicker(value: Date, maximumDate: Date): Promise<Date | null> {
  return new Promise((resolve) => {
    DateTimePickerAndroid.open({
      value,
      mode: "date",
      maximumDate,
      onValueChange: (_event, date) => resolve(date),
      onDismiss: () => resolve(null),
    });
  });
}
