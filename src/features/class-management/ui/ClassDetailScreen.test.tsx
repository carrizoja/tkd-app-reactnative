import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { schoolService } from "../../school-management/data/repository";
import type { MockSchoolService } from "../../school-management/ui/test-helpers";
import { studentService } from "../../student-management/data/repository";
import {
  ANA,
  BRUNO,
  confirmNextAlert,
  type MockStudentService,
} from "../../student-management/ui/test-helpers";
import { classService } from "../data/repository";
import { ClassError } from "../model/types";
import { ClassDetailScreen } from "./ClassDetailScreen";
import { ATTENDANCE_COPY } from "../../attendance-tracking/ui/copy";
import { CLASS_COPY } from "./copy";
import { CENTRO, INFANTILES, NORTE, SCHOOL, type MockClassService } from "./test-helpers";

jest.mock("../data/repository", () => ({
  classService: jest.requireActual("./test-helpers").mockClassService(),
}));
jest.mock("../../school-management/data/repository", () => ({
  schoolService: jest.requireActual("../../school-management/ui/test-helpers").mockSchoolService(),
}));
jest.mock("../../student-management/data/repository", () => ({
  studentService: jest.requireActual("../../student-management/ui/test-helpers").mockStudentService(),
}));

const classes = classService as unknown as MockClassService;
const schools = schoolService as unknown as MockSchoolService;
const students = studentService as unknown as MockStudentService;

function renderDetail() {
  const props = {
    school: SCHOOL,
    classId: INFANTILES.id,
    onEdit: jest.fn(),
    onDeleted: jest.fn(),
    onOpenAttendance: jest.fn(),
  };
  return { props, view: render(<ClassDetailScreen {...props} />) };
}

describe("ClassDetailScreen", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    [classes, schools, students].forEach((service) => Object.values(service).forEach((fn) => fn.mockReset()));
    classes.getClass.mockResolvedValue(INFANTILES);
    classes.listEnrolledStudentIds.mockResolvedValue(["stu-ana"]);
    students.listStudents.mockResolvedValue([ANA, BRUNO]);
    schools.listSedes.mockResolvedValue([CENTRO, NORTE]);
  });

  it("S4: shows the class, its roster, and the students that can be enrolled", async () => {
    const { view } = renderDetail();
    await view;

    expect(await screen.findByText(INFANTILES.name)).toBeTruthy();
    expect(screen.getByText(`${CENTRO.name} · Lun, Mié, Vie · 18:00–19:30`)).toBeTruthy();
    expect(screen.getByLabelText(CLASS_COPY.unenroll("Ana Pérez"))).toBeTruthy();
    expect(screen.getByLabelText(CLASS_COPY.enroll("Bruno Gómez"))).toBeTruthy();
    expect(screen.queryByLabelText(CLASS_COPY.enroll("Ana Pérez"))).toBeNull();
    expect(classes.getClass).toHaveBeenCalledWith(INFANTILES.id);
    expect(classes.listEnrolledStudentIds).toHaveBeenCalledWith(INFANTILES);
  });

  it("S4: enrolls a student, who then appears on the roster", async () => {
    classes.enroll.mockResolvedValue(undefined);
    const { view } = renderDetail();
    await view;

    classes.listEnrolledStudentIds.mockResolvedValue(["stu-ana", "stu-bruno"]);
    await fireEvent.press(await screen.findByLabelText(CLASS_COPY.enroll("Bruno Gómez")));

    await waitFor(() => expect(classes.enroll).toHaveBeenCalledWith(INFANTILES, [BRUNO]));
    expect(await screen.findByLabelText(CLASS_COPY.unenroll("Bruno Gómez"))).toBeTruthy();
  });

  it("S5: explains a rejected enrollment", async () => {
    classes.enroll.mockRejectedValue(new ClassError("not-same-school", "outsider"));
    const { view } = renderDetail();
    await view;

    await fireEvent.press(await screen.findByLabelText(CLASS_COPY.enroll("Bruno Gómez")));

    expect(await screen.findByText(CLASS_COPY.errors["not-same-school"])).toBeTruthy();
  });

  it("S6: un-enrolls a student, who can be enrolled again", async () => {
    classes.unenroll.mockResolvedValue(undefined);
    const { view } = renderDetail();
    await view;

    classes.listEnrolledStudentIds.mockResolvedValue([]);
    await fireEvent.press(await screen.findByLabelText(CLASS_COPY.unenroll("Ana Pérez")));

    await waitFor(() => expect(classes.unenroll).toHaveBeenCalledWith(INFANTILES, ANA));
    expect(await screen.findByLabelText(CLASS_COPY.enroll("Ana Pérez"))).toBeTruthy();
    expect(screen.getByText(CLASS_COPY.rosterEmpty)).toBeTruthy();
  });

  it("A4: ignores enrollments whose student no longer exists", async () => {
    classes.listEnrolledStudentIds.mockResolvedValue(["stu-gone"]);
    const { view } = renderDetail();
    await view;

    expect(await screen.findByText(CLASS_COPY.rosterEmpty)).toBeTruthy();
  });

  it("S3: deactivates the class and offers to reactivate it", async () => {
    classes.setStatus.mockResolvedValue(undefined);
    const { view } = renderDetail();
    await view;

    classes.getClass.mockResolvedValue({ ...INFANTILES, status: "inactive" });
    await fireEvent.press(await screen.findByText(CLASS_COPY.deactivate));

    await waitFor(() => expect(classes.setStatus).toHaveBeenCalledWith(INFANTILES, "inactive"));
    expect(await screen.findByText(CLASS_COPY.reactivate)).toBeTruthy();
    expect(screen.getByText(CLASS_COPY.inactiveBadge)).toBeTruthy();
    expect(screen.getByLabelText(CLASS_COPY.unenroll("Ana Pérez"))).toBeTruthy();
  });

  it("S2: edits, and deletes the class after confirmation", async () => {
    classes.deleteClass.mockResolvedValue(undefined);
    const { props, view } = renderDetail();
    await view;

    await fireEvent.press(await screen.findByText(CLASS_COPY.editClass));
    expect(props.onEdit).toHaveBeenCalledWith(INFANTILES);

    confirmNextAlert();
    await fireEvent.press(screen.getByText(CLASS_COPY.deleteClass));
    await waitFor(() => expect(props.onDeleted).toHaveBeenCalled());
    expect(classes.deleteClass).toHaveBeenCalledWith(INFANTILES);
  });

  it("says so when the class no longer exists", async () => {
    classes.getClass.mockResolvedValue(null);
    const { view } = renderDetail();
    await view;

    expect(await screen.findByText(CLASS_COPY.classMissing)).toBeTruthy();
  });

  it("attendance S1: opens the class's attendance", async () => {
    const { props, view } = renderDetail();
    await view;

    await fireEvent.press(await screen.findByText(ATTENDANCE_COPY.classLink));

    expect(props.onOpenAttendance).toHaveBeenCalledWith(INFANTILES);
  });
});
