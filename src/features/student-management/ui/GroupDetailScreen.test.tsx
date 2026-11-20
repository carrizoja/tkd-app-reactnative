import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { studentService } from "../data/repository";
import { STUDENT_COPY } from "./copy";
import { GroupDetailScreen } from "./GroupDetailScreen";
import { ANA, BRUNO, GROUP, SCHOOL, confirmNextAlert, type MockStudentService } from "./test-helpers";

jest.mock("../data/repository", () => ({
  studentService: jest.requireActual("./test-helpers").mockStudentService(),
}));

const service = studentService as unknown as MockStudentService;

function renderGroup() {
  const props = { school: SCHOOL, groupId: GROUP.id, onRename: jest.fn(), onDeleted: jest.fn() };
  return { props, view: render(<GroupDetailScreen {...props} />) };
}

describe("GroupDetailScreen", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    Object.values(service).forEach((fn) => fn.mockReset());
    service.listGroups.mockResolvedValue([GROUP]);
    service.listStudents.mockResolvedValue([ANA, BRUNO]);
  });

  it("S8/S9: shows members apart from the students that can be added", async () => {
    const { view } = renderGroup();
    await view;

    expect(await screen.findByText(GROUP.name)).toBeTruthy();
    expect(screen.getByLabelText(STUDENT_COPY.removeMember("Ana Pérez"))).toBeTruthy();
    expect(screen.getByLabelText(STUDENT_COPY.addMember("Bruno Gómez"))).toBeTruthy();
    expect(screen.queryByLabelText(STUDENT_COPY.addMember("Ana Pérez"))).toBeNull();
  });

  it("S8: adds a student to the group", async () => {
    service.addMembers.mockResolvedValue(undefined);
    const { view } = renderGroup();
    await view;

    service.listGroups.mockResolvedValue([{ ...GROUP, memberIds: ["stu-ana", "stu-bruno"] }]);
    await fireEvent.press(await screen.findByLabelText(STUDENT_COPY.addMember("Bruno Gómez")));

    await waitFor(() => expect(service.addMembers).toHaveBeenCalledWith(GROUP, [BRUNO]));
    expect(await screen.findByLabelText(STUDENT_COPY.removeMember("Bruno Gómez"))).toBeTruthy();
  });

  it("S9: removes a member, who stays available to add again", async () => {
    service.removeMember.mockResolvedValue(undefined);
    const { view } = renderGroup();
    await view;

    service.listGroups.mockResolvedValue([{ ...GROUP, memberIds: [] }]);
    await fireEvent.press(await screen.findByLabelText(STUDENT_COPY.removeMember("Ana Pérez")));

    await waitFor(() => expect(service.removeMember).toHaveBeenCalledWith(GROUP, ANA));
    expect(await screen.findByLabelText(STUDENT_COPY.addMember("Ana Pérez"))).toBeTruthy();
  });

  it("ignores member ids whose student no longer exists", async () => {
    service.listGroups.mockResolvedValue([{ ...GROUP, memberIds: ["stu-ana", "stu-gone"] }]);
    const { view } = renderGroup();
    await view;

    expect(await screen.findByLabelText(STUDENT_COPY.removeMember("Ana Pérez"))).toBeTruthy();
    expect(screen.queryByText(STUDENT_COPY.membersEmpty)).toBeNull();
  });

  it("renames, and deletes the group after confirmation", async () => {
    service.deleteGroup.mockResolvedValue(undefined);
    const { props, view } = renderGroup();
    await view;

    await fireEvent.press(await screen.findByText(STUDENT_COPY.renameGroup));
    expect(props.onRename).toHaveBeenCalledWith(GROUP);

    confirmNextAlert();
    await fireEvent.press(screen.getByText(STUDENT_COPY.deleteGroup));
    await waitFor(() => expect(props.onDeleted).toHaveBeenCalled());
    expect(service.deleteGroup).toHaveBeenCalledWith(GROUP);
  });
});
