import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { schoolService } from "../data/repository";
import { SchoolError } from "../model/types";
import { SCHOOL_COPY } from "./copy";
import { SedeFormScreen } from "./SedeFormScreen";
import { confirmNextAlert, SCHOOL_A1, SEDE_1, type MockSchoolService } from "./test-helpers";

jest.mock("../data/repository", () => ({
  schoolService: jest.requireActual("./test-helpers").mockSchoolService(),
}));

const service = schoolService as unknown as MockSchoolService;

async function fill(name: string, address: string) {
  await fireEvent.changeText(screen.getByLabelText(SCHOOL_COPY.sedeNameLabel), name);
  await fireEvent.changeText(screen.getByLabelText(SCHOOL_COPY.sedeAddressLabel), address);
}

describe("SedeFormScreen", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    Object.values(service).forEach((fn) => fn.mockReset());
  });

  it("S2: creates a sede with a name and address under the school", async () => {
    service.createSede.mockResolvedValue(SEDE_1);
    const onDone = jest.fn();
    await render(<SedeFormScreen school={SCHOOL_A1} onDone={onDone} />);

    await fill("Sede Sur", "Av. Siempre Viva 742");
    await fireEvent.press(screen.getByText(SCHOOL_COPY.save));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(service.createSede).toHaveBeenCalledWith(SCHOOL_A1, {
      name: "Sede Sur",
      address: "Av. Siempre Viva 742",
    });
    expect(screen.queryByText(SCHOOL_COPY.deleteSede)).toBeNull();
  });

  it("S2: requires both a name and an address", async () => {
    await render(<SedeFormScreen school={SCHOOL_A1} onDone={jest.fn()} />);

    await fill("", "");
    await fireEvent.press(screen.getByText(SCHOOL_COPY.save));

    expect(await screen.findByText(SCHOOL_COPY.validation.sedeName)).toBeTruthy();
    expect(screen.getByText(SCHOOL_COPY.validation.sedeAddress)).toBeTruthy();
    expect(service.createSede).not.toHaveBeenCalled();
  });

  it("S4: edits an existing sede, starting from its current values", async () => {
    service.updateSede.mockResolvedValue(undefined);
    const onDone = jest.fn();
    await render(<SedeFormScreen school={SCHOOL_A1} sede={SEDE_1} onDone={onDone} />);

    expect(screen.getByLabelText(SCHOOL_COPY.sedeNameLabel).props.value).toBe(SEDE_1.name);
    expect(screen.getByLabelText(SCHOOL_COPY.sedeAddressLabel).props.value).toBe(SEDE_1.address);
    await fill("Sede Uno", "Calle 9");
    await fireEvent.press(screen.getByText(SCHOOL_COPY.save));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(service.updateSede).toHaveBeenCalledWith(SEDE_1, { name: "Sede Uno", address: "Calle 9" });
  });

  it("S3: deletes a sede without classes after confirmation", async () => {
    service.deleteSede.mockResolvedValue(undefined);
    const onDone = jest.fn();
    await render(<SedeFormScreen school={SCHOOL_A1} sede={SEDE_1} onDone={onDone} />);

    confirmNextAlert();
    await fireEvent.press(screen.getByText(SCHOOL_COPY.deleteSede));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(service.deleteSede).toHaveBeenCalledWith(SEDE_1);
  });

  it("S3: explains why a sede with classes cannot be deleted", async () => {
    service.deleteSede.mockRejectedValue(new SchoolError("has-classes", "has classes"));
    const onDone = jest.fn();
    await render(<SedeFormScreen school={SCHOOL_A1} sede={SEDE_1} onDone={onDone} />);

    confirmNextAlert();
    await fireEvent.press(screen.getByText(SCHOOL_COPY.deleteSede));

    expect(await screen.findByText(SCHOOL_COPY.errors["has-classes"])).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });
});
