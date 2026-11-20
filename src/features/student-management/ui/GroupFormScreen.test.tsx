import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { studentService } from "../data/repository";
import { STUDENT_COPY } from "./copy";
import { GroupFormScreen } from "./GroupFormScreen";
import { GROUP, SCHOOL, type MockStudentService } from "./test-helpers";

jest.mock("../data/repository", () => ({
  studentService: jest.requireActual("./test-helpers").mockStudentService(),
}));

const service = studentService as unknown as MockStudentService;

describe("GroupFormScreen", () => {
  beforeEach(() => {
    Object.values(service).forEach((fn) => fn.mockReset());
  });

  it("S8: creates an empty group and opens it to add members", async () => {
    const created = { ...GROUP, id: "g-new", memberIds: [] };
    service.createGroup.mockResolvedValue(created);
    const onCreated = jest.fn();
    await render(<GroupFormScreen school={SCHOOL} onCreated={onCreated} onDone={jest.fn()} />);

    await fireEvent.changeText(screen.getByLabelText(STUDENT_COPY.groupNameLabel), "Competidores");
    await fireEvent.press(screen.getByText(STUDENT_COPY.save));

    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(created));
    expect(service.createGroup).toHaveBeenCalledWith(SCHOOL, { name: "Competidores" }, []);
  });

  it("S8: requires a group name", async () => {
    await render(<GroupFormScreen school={SCHOOL} onCreated={jest.fn()} onDone={jest.fn()} />);

    await fireEvent.press(screen.getByText(STUDENT_COPY.save));

    expect(await screen.findByText(STUDENT_COPY.validation.groupName)).toBeTruthy();
    expect(service.createGroup).not.toHaveBeenCalled();
  });

  it("renames an existing group", async () => {
    service.renameGroup.mockResolvedValue(undefined);
    const onDone = jest.fn();
    await render(<GroupFormScreen school={SCHOOL} group={GROUP} onCreated={jest.fn()} onDone={onDone} />);

    await fireEvent.changeText(screen.getByLabelText(STUDENT_COPY.groupNameLabel), "Avanzados");
    await fireEvent.press(screen.getByText(STUDENT_COPY.save));

    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(service.renameGroup).toHaveBeenCalledWith(GROUP, { name: "Avanzados" });
  });
});
