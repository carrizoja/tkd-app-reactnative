import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { studentService } from "../data/repository";
import { STUDENT_COPY } from "./copy";
import { openDatePicker } from "./openDatePicker";
import { StudentFormScreen } from "./StudentFormScreen";
import { ANA, SCHOOL, type MockStudentService } from "./test-helpers";

jest.mock("../data/repository", () => ({
  studentService: jest.requireActual("./test-helpers").mockStudentService(),
}));
jest.mock("./openDatePicker", () => ({ openDatePicker: jest.fn() }));

const service = studentService as unknown as MockStudentService;
const openDatePickerMock = openDatePicker as jest.MockedFunction<typeof openDatePicker>;

async function type(label: string, value: string) {
  await fireEvent.changeText(screen.getByLabelText(label), value);
}

/** Opens the belt selector and picks the option with this label. */
async function chooseBelt(optionLabel: string) {
  await fireEvent.press(screen.getByLabelText(STUDENT_COPY.beltGradeLabel));
  await fireEvent.press(await screen.findByText(optionLabel));
}

describe("StudentFormScreen", () => {
  beforeEach(() => {
    Object.values(service).forEach((fn) => fn.mockReset());
    openDatePickerMock.mockReset();
  });

  it("S1: creates a student with a first and last name under the school", async () => {
    service.createStudent.mockResolvedValue(ANA);
    const onDone = jest.fn();
    await render(<StudentFormScreen school={SCHOOL} onDone={onDone} />);

    await type(STUDENT_COPY.firstNameLabel, "Ana");
    await type(STUDENT_COPY.lastNameLabel, "Pérez");
    await chooseBelt("8° Gup – Amarillo");
    await fireEvent.press(screen.getByText(STUDENT_COPY.save));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(service.createStudent).toHaveBeenCalledWith(SCHOOL, {
      firstName: "Ana",
      lastName: "Pérez",
      beltGrade: "8° Gup",
      birthDate: "",
    });
  });

  it("S1: requires the first and last name", async () => {
    await render(<StudentFormScreen school={SCHOOL} onDone={jest.fn()} />);

    await fireEvent.press(screen.getByText(STUDENT_COPY.save));

    expect(await screen.findByText(STUDENT_COPY.validation.firstName)).toBeTruthy();
    expect(screen.getByText(STUDENT_COPY.validation.lastName)).toBeTruthy();
    expect(service.createStudent).not.toHaveBeenCalled();
  });

  it("picks the birth date from the calendar and stores it as YYYY-MM-DD", async () => {
    service.createStudent.mockResolvedValue(ANA);
    openDatePickerMock.mockResolvedValue(new Date(2015, 2, 9));
    const onDone = jest.fn();
    await render(<StudentFormScreen school={SCHOOL} onDone={onDone} />);

    await type(STUDENT_COPY.firstNameLabel, "Ana");
    await type(STUDENT_COPY.lastNameLabel, "Pérez");
    await fireEvent.press(screen.getByLabelText(STUDENT_COPY.birthDateLabel));
    expect(await screen.findByText("09/03/2015")).toBeTruthy();
    await fireEvent.press(screen.getByText(STUDENT_COPY.save));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(service.createStudent).toHaveBeenCalledWith(SCHOOL, expect.objectContaining({ birthDate: "2015-03-09" }));
    // The calendar never offers a future birth date.
    const [, maximumDate] = openDatePickerMock.mock.calls[0];
    expect(maximumDate.getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("keeps the birth date when the calendar is dismissed, and clears it on request", async () => {
    service.updateStudent.mockResolvedValue(undefined);
    openDatePickerMock.mockResolvedValue(null);
    const onDone = jest.fn();
    await render(<StudentFormScreen school={SCHOOL} student={{ ...ANA, birthDate: "2015-03-09" }} onDone={onDone} />);

    await fireEvent.press(screen.getByLabelText(STUDENT_COPY.birthDateLabel));
    await waitFor(() => expect(openDatePickerMock).toHaveBeenCalled());
    const [opened] = openDatePickerMock.mock.calls[0];
    expect([opened.getFullYear(), opened.getMonth(), opened.getDate()]).toEqual([2015, 2, 9]);
    expect(screen.getByText("09/03/2015")).toBeTruthy();

    await fireEvent.press(screen.getByLabelText(STUDENT_COPY.clearBirthDate));
    expect(screen.getByText(STUDENT_COPY.birthDatePlaceholder)).toBeTruthy();
    await fireEvent.press(screen.getByText(STUDENT_COPY.save));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(service.updateStudent).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ birthDate: "" }));
  });

  it("S3/S4: edits an existing student, starting from its current values", async () => {
    service.updateStudent.mockResolvedValue(undefined);
    const onDone = jest.fn();
    await render(<StudentFormScreen school={SCHOOL} student={ANA} onDone={onDone} />);

    expect(screen.getByText(STUDENT_COPY.editStudentTitle)).toBeTruthy();
    expect(screen.getByText("8° Gup – Amarillo")).toBeTruthy();
    await chooseBelt("7° Gup – Amarillo punta verde");
    await fireEvent.press(screen.getByText(STUDENT_COPY.save));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(service.updateStudent).toHaveBeenCalledWith(ANA, {
      firstName: "Ana",
      lastName: "Pérez",
      beltGrade: "7° Gup",
      birthDate: "",
    });
  });

  it("S3: offers every ITF grade, and clears the grade with 'Sin graduación'", async () => {
    service.updateStudent.mockResolvedValue(undefined);
    const onDone = jest.fn();
    await render(<StudentFormScreen school={SCHOOL} student={ANA} onDone={onDone} />);

    await fireEvent.press(screen.getByLabelText(STUDENT_COPY.beltGradeLabel));
    expect(await screen.findByText("10° Gup – Blanco")).toBeTruthy();
    expect(screen.getByText("9° Dan – Negro")).toBeTruthy();
    await fireEvent.press(screen.getByText(STUDENT_COPY.noBeltGrade));
    await fireEvent.press(screen.getByText(STUDENT_COPY.save));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(service.updateStudent).toHaveBeenCalledWith(ANA, expect.objectContaining({ beltGrade: "" }));
  });

  it("asks to pick a grade from the list when the student has older free text", async () => {
    await render(<StudentFormScreen school={SCHOOL} student={{ ...ANA, beltGrade: "amarilla" }} onDone={jest.fn()} />);

    expect(screen.getByText("amarilla")).toBeTruthy();
    await fireEvent.press(screen.getByText(STUDENT_COPY.save));

    expect(await screen.findByText(STUDENT_COPY.validation.beltGrade)).toBeTruthy();
    expect(service.updateStudent).not.toHaveBeenCalled();
  });
});
