import { fireEvent, render, screen } from "@testing-library/react-native";
import { studentService } from "../data/repository";
import { STUDENT_COPY } from "./copy";
import { GroupsScreen } from "./GroupsScreen";
import { GROUP, SCHOOL, type MockStudentService } from "./test-helpers";

jest.mock("../data/repository", () => ({
  studentService: jest.requireActual("./test-helpers").mockStudentService(),
}));

const service = studentService as unknown as MockStudentService;

describe("GroupsScreen", () => {
  beforeEach(() => {
    Object.values(service).forEach((fn) => fn.mockReset());
  });

  it("S8: lists the school's groups with their member count and routes to them", async () => {
    service.listGroups.mockResolvedValue([GROUP]);
    const onOpenGroup = jest.fn();
    const onCreateGroup = jest.fn();
    await render(<GroupsScreen school={SCHOOL} onOpenGroup={onOpenGroup} onCreateGroup={onCreateGroup} />);

    await fireEvent.press(await screen.findByText(GROUP.name));
    expect(screen.getByText(STUDENT_COPY.memberCount(1))).toBeTruthy();
    expect(onOpenGroup).toHaveBeenCalledWith(GROUP);
    await fireEvent.press(screen.getByText(STUDENT_COPY.newGroup));
    expect(onCreateGroup).toHaveBeenCalled();
    expect(service.listGroups).toHaveBeenCalledWith(SCHOOL);
  });

  it("says so when the school has no groups yet", async () => {
    service.listGroups.mockResolvedValue([]);
    await render(<GroupsScreen school={SCHOOL} onOpenGroup={jest.fn()} onCreateGroup={jest.fn()} />);

    expect(await screen.findByText(STUDENT_COPY.groupsEmpty)).toBeTruthy();
  });
});
