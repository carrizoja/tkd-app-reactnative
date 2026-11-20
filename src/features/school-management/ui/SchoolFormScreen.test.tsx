import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { schoolService } from "../data/repository";
import { SchoolError } from "../model/types";
import { SCHOOL_COPY } from "./copy";
import { SchoolFormScreen } from "./SchoolFormScreen";
import { PRESIDENT, SCHOOL_A1, type MockSchoolService } from "./test-helpers";

jest.mock("../data/repository", () => ({
  schoolService: jest.requireActual("./test-helpers").mockSchoolService(),
}));

const service = schoolService as unknown as MockSchoolService;

describe("SchoolFormScreen", () => {
  beforeEach(() => {
    Object.values(service).forEach((fn) => fn.mockReset());
  });

  it("S1: creates a school with the entered name", async () => {
    service.createSchool.mockResolvedValue({ ...SCHOOL_A1, name: "Dojang Oeste" });
    const onDone = jest.fn();
    await render(<SchoolFormScreen scope={PRESIDENT} onDone={onDone} />);

    expect(screen.getByText(SCHOOL_COPY.newSchoolTitle)).toBeTruthy();
    await fireEvent.changeText(screen.getByLabelText(SCHOOL_COPY.schoolNameLabel), "Dojang Oeste");
    await fireEvent.press(screen.getByText(SCHOOL_COPY.save));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(service.createSchool).toHaveBeenCalledWith(PRESIDENT, { name: "Dojang Oeste" });
  });

  it("S4: renames an existing school, starting from its current name", async () => {
    service.renameSchool.mockResolvedValue(undefined);
    const onDone = jest.fn();
    await render(<SchoolFormScreen scope={PRESIDENT} school={SCHOOL_A1} onDone={onDone} />);

    const field = screen.getByLabelText(SCHOOL_COPY.schoolNameLabel);
    expect(field.props.value).toBe(SCHOOL_A1.name);
    await fireEvent.changeText(field, "Escuela Central");
    await fireEvent.press(screen.getByText(SCHOOL_COPY.save));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(service.renameSchool).toHaveBeenCalledWith(SCHOOL_A1, { name: "Escuela Central" });
  });

  it("requires a name before saving", async () => {
    await render(<SchoolFormScreen scope={PRESIDENT} onDone={jest.fn()} />);

    await fireEvent.changeText(screen.getByLabelText(SCHOOL_COPY.schoolNameLabel), "   ");
    await fireEvent.press(screen.getByText(SCHOOL_COPY.save));

    expect(await screen.findByText(SCHOOL_COPY.validation.schoolName)).toBeTruthy();
    expect(service.createSchool).not.toHaveBeenCalled();
  });

  it("shows the service's refusal and stays on the form", async () => {
    service.createSchool.mockRejectedValue(new SchoolError("forbidden", "no"));
    const onDone = jest.fn();
    await render(<SchoolFormScreen scope={PRESIDENT} onDone={onDone} />);

    await fireEvent.changeText(screen.getByLabelText(SCHOOL_COPY.schoolNameLabel), "Nueva");
    await fireEvent.press(screen.getByText(SCHOOL_COPY.save));

    expect(await screen.findByText(SCHOOL_COPY.errors.forbidden)).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
  });
});
