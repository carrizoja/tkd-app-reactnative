import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { schoolService } from "../../school-management/data/repository";
import type { MockSchoolService } from "../../school-management/ui/test-helpers";
import { classService } from "../data/repository";
import { ClassFormScreen } from "./ClassFormScreen";
import { CLASS_COPY } from "./copy";
import { openTimePicker } from "./openTimePicker";
import { CENTRO, INFANTILES, NORTE, SCHOOL, type MockClassService } from "./test-helpers";

jest.mock("../data/repository", () => ({
  classService: jest.requireActual("./test-helpers").mockClassService(),
}));
jest.mock("../../school-management/data/repository", () => ({
  schoolService: jest.requireActual("../../school-management/ui/test-helpers").mockSchoolService(),
}));
jest.mock("./openTimePicker", () => ({ openTimePicker: jest.fn() }));

const classes = classService as unknown as MockClassService;
const schools = schoolService as unknown as MockSchoolService;
const pickTime = openTimePicker as jest.Mock;

const day = (long: string) => screen.getByLabelText(CLASS_COPY.dayToggle(long));

describe("ClassFormScreen", () => {
  beforeEach(() => {
    Object.values(classes).forEach((fn) => fn.mockReset());
    Object.values(schools).forEach((fn) => fn.mockReset());
    pickTime.mockReset();
    schools.listSedes.mockResolvedValue([CENTRO, NORTE]);
  });

  it("S1: creates a class under the picked sede with its days and times", async () => {
    const created = { ...INFANTILES, id: "cls-new" };
    classes.createClass.mockResolvedValue(created);
    const onCreated = jest.fn();
    await render(<ClassFormScreen school={SCHOOL} onCreated={onCreated} onDone={jest.fn()} />);

    await fireEvent.changeText(await screen.findByLabelText(CLASS_COPY.nameLabel), "Infantiles");
    await fireEvent.press(screen.getByLabelText(`${CLASS_COPY.sedeLabel} ${CENTRO.name}`));
    await fireEvent.press(day("miércoles"));
    await fireEvent.press(day("lunes"));
    pickTime.mockResolvedValueOnce("18:00");
    await fireEvent.press(screen.getByLabelText(CLASS_COPY.startLabel));
    pickTime.mockResolvedValueOnce("19:30");
    await fireEvent.press(screen.getByLabelText(CLASS_COPY.endLabel));
    expect(await screen.findByText("19:30")).toBeTruthy();
    await fireEvent.press(screen.getByText(CLASS_COPY.save));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(classes.createClass).toHaveBeenCalledWith(SCHOOL, CENTRO, {
      name: "Infantiles",
      schedule: { days: [1, 3], start: "18:00", end: "19:30" },
    });
    expect(day("lunes").props.accessibilityState).toEqual({ selected: true });
    expect(day("martes").props.accessibilityState).toEqual({ selected: false });
  });

  it("S1: requires a name, sede, at least one day and both times", async () => {
    await render(<ClassFormScreen school={SCHOOL} onCreated={jest.fn()} onDone={jest.fn()} />);

    await fireEvent.press(await screen.findByText(CLASS_COPY.save));

    for (const message of Object.values(CLASS_COPY.validation).filter((m) => m !== CLASS_COPY.validation.order)) {
      expect(await screen.findByText(message)).toBeTruthy();
    }
    expect(classes.createClass).not.toHaveBeenCalled();
  });

  it("S1: rejects a class that ends before it starts", async () => {
    await render(<ClassFormScreen school={SCHOOL} klass={INFANTILES} onCreated={jest.fn()} onDone={jest.fn()} />);

    pickTime.mockResolvedValueOnce("17:00");
    await fireEvent.press(await screen.findByLabelText(CLASS_COPY.endLabel));
    expect(await screen.findByText("17:00")).toBeTruthy();
    await fireEvent.press(screen.getByText(CLASS_COPY.save));

    expect(await screen.findByText(CLASS_COPY.validation.order)).toBeTruthy();
    expect(classes.updateClass).not.toHaveBeenCalled();
  });

  it("picks the only sede when the school has one", async () => {
    schools.listSedes.mockResolvedValue([CENTRO]);
    await render(<ClassFormScreen school={SCHOOL} onCreated={jest.fn()} onDone={jest.fn()} />);

    const only = await screen.findByLabelText(`${CLASS_COPY.sedeLabel} ${CENTRO.name}`);
    expect(only.props.accessibilityState).toEqual({ selected: true });
  });

  it("S2: edits a class, moving it to another sede", async () => {
    classes.updateClass.mockResolvedValue(undefined);
    const onDone = jest.fn();
    await render(<ClassFormScreen school={SCHOOL} klass={INFANTILES} onCreated={jest.fn()} onDone={onDone} />);

    expect(await screen.findByDisplayValue(INFANTILES.name)).toBeTruthy();
    expect(screen.getByText("18:00")).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(`${CLASS_COPY.sedeLabel} ${NORTE.name}`));
    await fireEvent.press(day("viernes"));
    pickTime.mockResolvedValueOnce("18:30");
    await fireEvent.press(screen.getByLabelText(CLASS_COPY.startLabel));
    expect(await screen.findByText("18:30")).toBeTruthy();
    await fireEvent.press(screen.getByText(CLASS_COPY.save));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(classes.updateClass).toHaveBeenCalledWith(INFANTILES, NORTE, {
      name: "Infantiles",
      schedule: { days: [1, 3], start: "18:30", end: "19:30" },
    });
    expect(pickTime).toHaveBeenCalledWith("18:00");
  });

  it("keeps the previous time when the clock dialog is dismissed", async () => {
    await render(<ClassFormScreen school={SCHOOL} klass={INFANTILES} onCreated={jest.fn()} onDone={jest.fn()} />);

    pickTime.mockResolvedValueOnce(null);
    await fireEvent.press(await screen.findByLabelText(CLASS_COPY.startLabel));

    await waitFor(() => expect(pickTime).toHaveBeenCalled());
    expect(screen.getByText("18:00")).toBeTruthy();
  });
});
