import { fireEvent, render, screen, within } from "@testing-library/react-native";
import { schoolService } from "../../school-management/data/repository";
import type { MockSchoolService } from "../../school-management/ui/test-helpers";
import { classService } from "../data/repository";
import { ClassesScreen } from "./ClassesScreen";
import { CLASS_COPY } from "./copy";
import { ADULTOS, CENTRO, INFANTILES, NORTE, SCHOOL, type MockClassService } from "./test-helpers";

jest.mock("../data/repository", () => ({
  classService: jest.requireActual("./test-helpers").mockClassService(),
}));
jest.mock("../../school-management/data/repository", () => ({
  schoolService: jest.requireActual("../../school-management/ui/test-helpers").mockSchoolService(),
}));

const classes = classService as unknown as MockClassService;
const schools = schoolService as unknown as MockSchoolService;

function renderScreen() {
  const props = { school: SCHOOL, onOpenClass: jest.fn(), onCreateClass: jest.fn() };
  return { props, view: render(<ClassesScreen {...props} />) };
}

describe("ClassesScreen", () => {
  beforeEach(() => {
    Object.values(classes).forEach((fn) => fn.mockReset());
    Object.values(schools).forEach((fn) => fn.mockReset());
    schools.listSedes.mockResolvedValue([CENTRO, NORTE]);
  });

  it("S1: lists each sede's classes with their schedule and opens them", async () => {
    classes.listClasses.mockResolvedValue([ADULTOS, INFANTILES]);
    const { props, view } = renderScreen();
    await view;

    const centro = await screen.findByLabelText(`Sede ${CENTRO.name}`);
    expect(within(centro).getByText(INFANTILES.name)).toBeTruthy();
    expect(within(centro).getByText("Lun, Mié, Vie · 18:00–19:30")).toBeTruthy();
    expect(within(screen.getByLabelText(`Sede ${NORTE.name}`)).getByText(ADULTOS.name)).toBeTruthy();

    await fireEvent.press(screen.getByText(INFANTILES.name));
    expect(props.onOpenClass).toHaveBeenCalledWith(INFANTILES);
    await fireEvent.press(screen.getByText(CLASS_COPY.newClass));
    expect(props.onCreateClass).toHaveBeenCalled();
    expect(classes.listClasses).toHaveBeenCalledWith(SCHOOL);
    expect(schools.listSedes).toHaveBeenCalledWith(SCHOOL);
  });

  it("S3: shows inactive classes only in their own section", async () => {
    classes.listClasses.mockResolvedValue([{ ...ADULTOS, status: "inactive" }, INFANTILES]);
    const { view } = renderScreen();
    await view;

    const inactive = await screen.findByLabelText(CLASS_COPY.inactiveTitle);
    expect(within(inactive).getByText(ADULTOS.name)).toBeTruthy();
    const norte = screen.getByLabelText(`Sede ${NORTE.name}`);
    expect(within(norte).queryByText(ADULTOS.name)).toBeNull();
    expect(within(norte).getByText(CLASS_COPY.sedeEmpty)).toBeTruthy();
  });

  it("says so when the school has no classes yet", async () => {
    classes.listClasses.mockResolvedValue([]);
    const { view } = renderScreen();
    await view;

    expect(await screen.findByText(CLASS_COPY.classesEmpty)).toBeTruthy();
    expect(screen.queryByLabelText(CLASS_COPY.inactiveTitle)).toBeNull();
  });

  it("asks for a sede first when the school has none", async () => {
    classes.listClasses.mockResolvedValue([]);
    schools.listSedes.mockResolvedValue([]);
    const { view } = renderScreen();
    await view;

    expect(await screen.findByText(CLASS_COPY.needsSede)).toBeTruthy();
    expect(screen.queryByText(CLASS_COPY.newClass)).toBeNull();
  });
});
