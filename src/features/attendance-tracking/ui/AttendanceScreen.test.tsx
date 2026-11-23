import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { classService } from "../../class-management/data/repository";
import { INFANTILES, SCHOOL, type MockClassService } from "../../class-management/ui/test-helpers";
import { studentService } from "../../student-management/data/repository";
import { openDatePicker } from "../../student-management/ui/openDatePicker";
import { ANA, BRUNO, type MockStudentService } from "../../student-management/ui/test-helpers";
import { attendanceService } from "../data/repository";
import { AttendanceError } from "../model/types";
import { AttendanceScreen } from "./AttendanceScreen";
import { ATTENDANCE_COPY } from "./copy";
import type { MockAttendanceService } from "./test-helpers";

jest.mock("../data/repository", () => ({
  attendanceService: jest.requireActual("./test-helpers").mockAttendanceService(),
}));
jest.mock("../../class-management/data/repository", () => ({
  classService: jest.requireActual("../../class-management/ui/test-helpers").mockClassService(),
}));
jest.mock("../../student-management/data/repository", () => ({
  studentService: jest.requireActual("../../student-management/ui/test-helpers").mockStudentService(),
}));
jest.mock("../../student-management/ui/openDatePicker", () => ({ openDatePicker: jest.fn() }));

const attendance = attendanceService as unknown as MockAttendanceService;
const classes = classService as unknown as MockClassService;
const students = studentService as unknown as MockStudentService;
const pickDate = openDatePicker as jest.Mock;

const CARLA = { ...BRUNO, id: "stu-carla", firstName: "Carla", lastName: "Díaz", lastNameLower: "díaz" };

/** The device clock in these tests: Sunday 22/11/2026, noon. */
const NOW = new Date(2026, 10, 22, 12);
/** Infantiles meets Monday, Wednesday and Friday, so the screen opens on Friday. */
const LAST_CLASS_DAY = "2026-11-20";

const NOTHING = { recorded: false, marks: {} };

async function renderScreen(klass = INFANTILES) {
  return await render(<AttendanceScreen school={SCHOOL} klass={klass} />);
}

describe("AttendanceScreen", () => {
  beforeAll(() => {
    // Fake only the clock; real timers keep the screen's async loads running.
    jest.useFakeTimers({
      now: NOW,
      doNotFake: [
        "hrtime",
        "nextTick",
        "performance",
        "queueMicrotask",
        "requestAnimationFrame",
        "cancelAnimationFrame",
        "requestIdleCallback",
        "cancelIdleCallback",
        "setImmediate",
        "clearImmediate",
        "setInterval",
        "clearInterval",
        "setTimeout",
        "clearTimeout",
      ],
    });
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => {
    [attendance, classes, students].forEach((service) => Object.values(service).forEach((fn) => fn.mockReset()));
    pickDate.mockReset();
    classes.listEnrolledStudentIds.mockResolvedValue(["stu-ana", "stu-bruno"]);
    students.listStudents.mockResolvedValue([ANA, BRUNO, CARLA]);
    attendance.getDay.mockResolvedValue(NOTHING);
    attendance.takeAttendance.mockResolvedValue(undefined);
  });

  it("S3/A1: offers only enrolled students, all starting as Presente, on the last class day", async () => {
    await renderScreen();

    expect(await screen.findByLabelText(ATTENDANCE_COPY.markLabel("Ana Pérez", true))).toBeTruthy();
    expect(screen.getByLabelText(ATTENDANCE_COPY.markLabel("Bruno Gómez", true))).toBeTruthy();
    expect(screen.queryByText(/Carla/)).toBeNull();
    expect(screen.getByText(ATTENDANCE_COPY.summary(2, 2))).toBeTruthy();
    expect(attendance.getDay).toHaveBeenCalledWith(INFANTILES, LAST_CLASS_DAY);
  });

  it("S5: says when no attendance was recorded for the date", async () => {
    await renderScreen();

    expect(await screen.findByText(ATTENDANCE_COPY.notRecorded)).toBeTruthy();
  });

  it("S1: marks a student absent and saves one mark per enrolled student", async () => {
    await renderScreen();

    await fireEvent.press(await screen.findByLabelText(ATTENDANCE_COPY.markLabel("Bruno Gómez", true)));
    expect(screen.getByLabelText(ATTENDANCE_COPY.markLabel("Bruno Gómez", false))).toBeTruthy();
    expect(screen.getByText(ATTENDANCE_COPY.summary(1, 2))).toBeTruthy();

    attendance.getDay.mockResolvedValue({ recorded: true, marks: { "stu-ana": true, "stu-bruno": false } });
    await fireEvent.press(screen.getByText(ATTENDANCE_COPY.save));

    await waitFor(() =>
      expect(attendance.takeAttendance).toHaveBeenCalledWith(INFANTILES, LAST_CLASS_DAY, {
        "stu-ana": true,
        "stu-bruno": false,
      }),
    );
    expect(await screen.findByText(ATTENDANCE_COPY.saved)).toBeTruthy();
    expect(screen.getByText(ATTENDANCE_COPY.recorded)).toBeTruthy();
    expect(screen.getByLabelText(ATTENDANCE_COPY.markLabel("Bruno Gómez", false))).toBeTruthy();
  });

  it("S2/S4: picking a recorded date shows its saved marks, which can be changed and saved again", async () => {
    pickDate.mockResolvedValue(new Date(2026, 10, 18));
    attendance.getDay.mockImplementation(async (_klass, date: string) =>
      date === "2026-11-18" ? { recorded: true, marks: { "stu-ana": false, "stu-bruno": true } } : NOTHING,
    );
    await renderScreen();

    await fireEvent.press(await screen.findByLabelText(ATTENDANCE_COPY.dateLabel));

    expect(await screen.findByText("18/11/2026")).toBeTruthy();
    expect(await screen.findByText(ATTENDANCE_COPY.recorded)).toBeTruthy();
    expect(screen.getByLabelText(ATTENDANCE_COPY.markLabel("Ana Pérez", false))).toBeTruthy();
    expect(pickDate.mock.calls[0][1]).toBeInstanceOf(Date);

    await fireEvent.press(screen.getByLabelText(ATTENDANCE_COPY.markLabel("Ana Pérez", false)));
    await fireEvent.press(screen.getByText(ATTENDANCE_COPY.save));

    await waitFor(() =>
      expect(attendance.takeAttendance).toHaveBeenCalledWith(INFANTILES, "2026-11-18", {
        "stu-ana": true,
        "stu-bruno": true,
      }),
    );
  });

  it("opens on today when the class meets today", async () => {
    await renderScreen({ ...INFANTILES, schedule: { ...INFANTILES.schedule, days: [7] } });

    expect(await screen.findByText("22/11/2026")).toBeTruthy();
    expect(attendance.getDay).toHaveBeenCalledWith(expect.anything(), "2026-11-22");
  });

  it("blocks a picked day the class does not meet: no marking, no saving", async () => {
    pickDate.mockResolvedValue(new Date(2026, 10, 22));
    await renderScreen();

    await fireEvent.press(await screen.findByLabelText(ATTENDANCE_COPY.dateLabel));

    expect(await screen.findByText(ATTENDANCE_COPY.offDay("Infantiles", "Lun, Mié, Vie"))).toBeTruthy();
    expect(screen.queryByLabelText(ATTENDANCE_COPY.markLabel("Ana Pérez", true))).toBeNull();
    expect(screen.queryByText(ATTENDANCE_COPY.save)).toBeNull();
  });

  it("A4: shows the saved marks of students no longer enrolled, read-only", async () => {
    attendance.getDay.mockResolvedValue({ recorded: true, marks: { "stu-ana": true, "stu-carla": false } });
    await renderScreen();

    expect(await screen.findByText(ATTENDANCE_COPY.formerTitle)).toBeTruthy();
    expect(screen.getByText(ATTENDANCE_COPY.markLabel("Carla Díaz", false))).toBeTruthy();
    expect(screen.queryByLabelText(ATTENDANCE_COPY.markLabel("Carla Díaz", false))).toBeNull();
  });

  it("A2: an inactive class shows its history without marking or saving", async () => {
    attendance.getDay.mockResolvedValue({ recorded: true, marks: { "stu-ana": true, "stu-bruno": false } });
    await renderScreen({ ...INFANTILES, status: "inactive" });

    expect(await screen.findByText(ATTENDANCE_COPY.inactiveNotice)).toBeTruthy();
    expect(screen.getByText(ATTENDANCE_COPY.markLabel("Bruno Gómez", false))).toBeTruthy();
    expect(screen.queryByLabelText(ATTENDANCE_COPY.markLabel("Bruno Gómez", false))).toBeNull();
    expect(screen.queryByText(ATTENDANCE_COPY.save)).toBeNull();
  });

  it("says when the class has no enrolled students, with nothing to save", async () => {
    classes.listEnrolledStudentIds.mockResolvedValue([]);
    await renderScreen();

    expect(await screen.findByText(ATTENDANCE_COPY.rosterEmpty)).toBeTruthy();
    expect(screen.queryByText(ATTENDANCE_COPY.save)).toBeNull();
  });

  it("shows the reason when saving fails", async () => {
    attendance.takeAttendance.mockRejectedValue(new AttendanceError("not-enrolled", "x"));
    await renderScreen();

    await fireEvent.press(await screen.findByText(ATTENDANCE_COPY.save));

    expect(
      await screen.findByText("Hay alumnos que ya no están inscriptos en la clase. Volvé a abrir la asistencia."),
    ).toBeTruthy();
  });
});
