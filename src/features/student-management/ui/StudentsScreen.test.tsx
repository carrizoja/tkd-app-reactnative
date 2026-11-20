import { fireEvent, render, screen } from "@testing-library/react-native";
import { studentService } from "../data/repository";
import { STUDENT_COPY } from "./copy";
import { StudentsScreen } from "./StudentsScreen";
import { ANA, BRUNO, SCHOOL, type MockStudentService } from "./test-helpers";

jest.mock("../data/repository", () => ({
  studentService: jest.requireActual("./test-helpers").mockStudentService(),
}));

const service = studentService as unknown as MockStudentService;

function renderScreen() {
  const props = { school: SCHOOL, onOpenStudent: jest.fn(), onCreateStudent: jest.fn(), onOpenGroups: jest.fn() };
  return { props, view: render(<StudentsScreen {...props} />) };
}

describe("StudentsScreen", () => {
  beforeEach(() => {
    Object.values(service).forEach((fn) => fn.mockReset());
    service.listStudents.mockResolvedValue([BRUNO, ANA]);
  });

  it("S1: lists the school's students with their belt/grade", async () => {
    const { view } = renderScreen();
    await view;

    expect(await screen.findByText("Bruno Gómez")).toBeTruthy();
    expect(screen.getByText("Ana Pérez")).toBeTruthy();
    expect(screen.getByText(STUDENT_COPY.beltGrade("8° Gup – Amarillo"))).toBeTruthy();
    expect(service.listStudents).toHaveBeenCalledWith(SCHOOL);
  });

  it("S5: filters by a surname fragment, ignoring accents", async () => {
    const { view } = renderScreen();
    await view;

    await fireEvent.changeText(await screen.findByLabelText(STUDENT_COPY.searchLabel), "perez");

    expect(screen.getByText("Ana Pérez")).toBeTruthy();
    expect(screen.queryByText("Bruno Gómez")).toBeNull();
  });

  it("S7: filters by first name", async () => {
    const { view } = renderScreen();
    await view;

    await fireEvent.changeText(await screen.findByLabelText(STUDENT_COPY.searchLabel), "bru");

    expect(screen.getByText("Bruno Gómez")).toBeTruthy();
    expect(screen.queryByText("Ana Pérez")).toBeNull();
  });

  it("S6: shows an empty result state when nothing matches", async () => {
    const { view } = renderScreen();
    await view;

    await fireEvent.changeText(await screen.findByLabelText(STUDENT_COPY.searchLabel), "zzz");

    expect(screen.getByText(STUDENT_COPY.noMatches("zzz"))).toBeTruthy();
    expect(screen.queryByText("Ana Pérez")).toBeNull();
  });

  it("says so when the school has no students yet, without offering a search", async () => {
    service.listStudents.mockResolvedValue([]);
    const { view } = renderScreen();
    await view;

    expect(await screen.findByText(STUDENT_COPY.studentsEmpty)).toBeTruthy();
    expect(screen.queryByLabelText(STUDENT_COPY.searchLabel)).toBeNull();
  });

  it("presents the field as a search", async () => {
    const { view } = renderScreen();
    await view;

    const search = await screen.findByLabelText(STUDENT_COPY.searchLabel);
    expect(search.props.placeholder).toBe("Buscar por nombre o apellido");
  });

  it("S1/S8: routes to a student, to creating one, and to the groups", async () => {
    const { props, view } = renderScreen();
    await view;

    await fireEvent.press(await screen.findByText("Ana Pérez"));
    expect(props.onOpenStudent).toHaveBeenCalledWith(ANA);
    await fireEvent.press(screen.getByText(STUDENT_COPY.newStudent));
    expect(props.onCreateStudent).toHaveBeenCalled();
    await fireEvent.press(screen.getByText(STUDENT_COPY.groupsLink));
    expect(props.onOpenGroups).toHaveBeenCalled();
  });
});
