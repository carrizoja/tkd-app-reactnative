import { CLASS_COPY } from "../../class-management/ui/copy";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { schoolService } from "../data/repository";
import { SchoolError } from "../model/types";
import { STUDENT_COPY } from "../../student-management/ui/copy";
import { SCHOOL_COPY } from "./copy";
import { SchoolDetailScreen } from "./SchoolDetailScreen";
import {
  confirmNextAlert,
  INSTRUCTOR,
  PRESIDENT,
  SCHOOL_A1,
  SEDE_1,
  type MockSchoolService,
} from "./test-helpers";

jest.mock("../data/repository", () => ({
  schoolService: jest.requireActual("./test-helpers").mockSchoolService(),
}));

const service = schoolService as unknown as MockSchoolService;

function renderDetail(overrides: Partial<Parameters<typeof SchoolDetailScreen>[0]> = {}) {
  const props = {
    scope: PRESIDENT,
    schoolId: SCHOOL_A1.id,
    onEditSchool: jest.fn(),
    onCreateSede: jest.fn(),
    onEditSede: jest.fn(),
    onDeleted: jest.fn(),
    onOpenStudents: jest.fn(),
    onOpenClasses: jest.fn(),
    ...overrides,
  };
  return { props, view: render(<SchoolDetailScreen {...props} />) };
}

describe("SchoolDetailScreen", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    Object.values(service).forEach((fn) => fn.mockReset());
    service.getSchool.mockResolvedValue(SCHOOL_A1);
    service.listSedes.mockResolvedValue([SEDE_1]);
  });

  it("S4: shows the school with its sedes", async () => {
    const { view } = renderDetail();
    await view;

    expect(await screen.findByText(SCHOOL_A1.name)).toBeTruthy();
    expect(screen.getByText(SEDE_1.name)).toBeTruthy();
    expect(screen.getByText(SEDE_1.address)).toBeTruthy();
    expect(service.listSedes).toHaveBeenCalledWith(SCHOOL_A1);
  });

  it("S2/S4: routes to creating and editing sedes and renaming the school", async () => {
    const { props, view } = renderDetail();
    await view;

    await fireEvent.press(await screen.findByText(SEDE_1.name));
    expect(props.onEditSede).toHaveBeenCalledWith(SCHOOL_A1, SEDE_1);
    await fireEvent.press(screen.getByText(SCHOOL_COPY.newSede));
    expect(props.onCreateSede).toHaveBeenCalledWith(SCHOOL_A1);
    await fireEvent.press(screen.getByText(SCHOOL_COPY.editSchool));
    expect(props.onEditSchool).toHaveBeenCalledWith(SCHOOL_A1);
  });

  it("opens the school's students", async () => {
    const { props, view } = renderDetail();
    await view;

    await fireEvent.press(await screen.findByText(STUDENT_COPY.schoolLink));
    expect(props.onOpenStudents).toHaveBeenCalledWith(SCHOOL_A1);
  });

  it("opens the school's classes", async () => {
    const { props, view } = renderDetail();
    await view;

    await fireEvent.press(await screen.findByText(CLASS_COPY.schoolLink));
    expect(props.onOpenClasses).toHaveBeenCalledWith(SCHOOL_A1);
  });

  it("S5: deletes a school without sedes after confirmation", async () => {
    service.listSedes.mockResolvedValue([]);
    service.deleteSchool.mockResolvedValue(undefined);
    const { props, view } = renderDetail();
    await view;

    confirmNextAlert();
    await fireEvent.press(await screen.findByText(SCHOOL_COPY.deleteSchool));

    await waitFor(() => expect(props.onDeleted).toHaveBeenCalled());
    expect(service.deleteSchool).toHaveBeenCalledWith(PRESIDENT, SCHOOL_A1);
  });

  it("S5: explains why a school with sedes cannot be deleted", async () => {
    service.deleteSchool.mockRejectedValue(new SchoolError("has-sedes", "has sedes"));
    const { props, view } = renderDetail();
    await view;

    confirmNextAlert();
    await fireEvent.press(await screen.findByText(SCHOOL_COPY.deleteSchool));

    expect(await screen.findByText(SCHOOL_COPY.errors["has-sedes"])).toBeTruthy();
    expect(props.onDeleted).not.toHaveBeenCalled();
  });

  it("S8: an instructor cannot delete its school", async () => {
    const { view } = renderDetail({ scope: INSTRUCTOR });
    await view;

    expect(await screen.findByText(SCHOOL_A1.name)).toBeTruthy();
    expect(screen.queryByText(SCHOOL_COPY.deleteSchool)).toBeNull();
  });

  it("says so when the school no longer exists", async () => {
    service.getSchool.mockResolvedValue(null);
    const { view } = renderDetail();
    await view;

    expect(await screen.findByText(SCHOOL_COPY.schoolMissing)).toBeTruthy();
  });
});
