import { fireEvent, render, screen } from "@testing-library/react-native";
import { schoolService } from "../data/repository";
import { SCHOOL_COPY } from "./copy";
import { SchoolsScreen } from "./SchoolsScreen";
import { INSTRUCTOR, PRESIDENT, SCHOOL_A1, SCHOOL_A2, type MockSchoolService } from "./test-helpers";

jest.mock("../data/repository", () => ({
  schoolService: jest.requireActual("./test-helpers").mockSchoolService(),
}));

const service = schoolService as unknown as MockSchoolService;

describe("SchoolsScreen", () => {
  beforeEach(() => {
    Object.values(service).forEach((fn) => fn.mockReset());
  });

  it("S6: lists the schools visible to the user's scope", async () => {
    service.listSchools.mockResolvedValue([SCHOOL_A2, SCHOOL_A1]);
    await render(<SchoolsScreen scope={PRESIDENT} onOpenSchool={jest.fn()} onCreateSchool={jest.fn()} />);

    expect(await screen.findByText(SCHOOL_A2.name)).toBeTruthy();
    expect(screen.getByText(SCHOOL_A1.name)).toBeTruthy();
    expect(service.listSchools).toHaveBeenCalledWith(PRESIDENT);
  });

  it("S1: offers creating a school to a president", async () => {
    service.listSchools.mockResolvedValue([]);
    const onCreateSchool = jest.fn();
    await render(<SchoolsScreen scope={PRESIDENT} onOpenSchool={jest.fn()} onCreateSchool={onCreateSchool} />);

    expect(await screen.findByText(SCHOOL_COPY.schoolsEmpty)).toBeTruthy();
    await fireEvent.press(screen.getByText(SCHOOL_COPY.newSchool));
    expect(onCreateSchool).toHaveBeenCalled();
  });

  it("S8: an instructor sees only its school and cannot create schools", async () => {
    service.listSchools.mockResolvedValue([SCHOOL_A1]);
    await render(<SchoolsScreen scope={INSTRUCTOR} onOpenSchool={jest.fn()} onCreateSchool={jest.fn()} />);

    expect(await screen.findByText(SCHOOL_A1.name)).toBeTruthy();
    expect(screen.queryByText(SCHOOL_COPY.newSchool)).toBeNull();
  });

  it("S4: opens a school when it is tapped", async () => {
    service.listSchools.mockResolvedValue([SCHOOL_A1]);
    const onOpenSchool = jest.fn();
    await render(<SchoolsScreen scope={PRESIDENT} onOpenSchool={onOpenSchool} onCreateSchool={jest.fn()} />);

    await fireEvent.press(await screen.findByText(SCHOOL_A1.name));
    expect(onOpenSchool).toHaveBeenCalledWith(SCHOOL_A1);
  });

  it("offers a retry when the schools cannot be loaded", async () => {
    service.listSchools.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce([SCHOOL_A1]);
    await render(<SchoolsScreen scope={PRESIDENT} onOpenSchool={jest.fn()} onCreateSchool={jest.fn()} />);

    expect(await screen.findByText(SCHOOL_COPY.loadFailed)).toBeTruthy();
    await fireEvent.press(screen.getByText(SCHOOL_COPY.retry));
    expect(await screen.findByText(SCHOOL_A1.name)).toBeTruthy();
  });
});
