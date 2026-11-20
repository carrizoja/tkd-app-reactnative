import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { studentService } from "../data/repository";
import { StudentError } from "../model/types";
import { STUDENT_COPY } from "./copy";
import { pickPhoto } from "./pickPhoto";
import { StudentProfileScreen } from "./StudentProfileScreen";
import { ANA, SCHOOL, confirmNextAlert, type MockStudentService } from "./test-helpers";

jest.mock("../data/repository", () => ({
  studentService: jest.requireActual("./test-helpers").mockStudentService(),
}));
jest.mock("./pickPhoto", () => ({ pickPhoto: jest.fn() }));

const service = studentService as unknown as MockStudentService;
const pickPhotoMock = pickPhoto as jest.MockedFunction<typeof pickPhoto>;

function renderProfile() {
  const props = { school: SCHOOL, studentId: ANA.id, onEdit: jest.fn(), onDeleted: jest.fn() };
  return { props, view: render(<StudentProfileScreen {...props} />) };
}

describe("StudentProfileScreen", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    Object.values(service).forEach((fn) => fn.mockReset());
    pickPhotoMock.mockReset();
    service.getStudent.mockResolvedValue(ANA);
  });

  it("S4: shows the student's name, belt/grade and birth date", async () => {
    service.getStudent.mockResolvedValue({ ...ANA, birthDate: "2015-03-09" });
    const { view } = renderProfile();
    await view;

    expect(await screen.findByText("Ana Pérez")).toBeTruthy();
    expect(screen.getByText(STUDENT_COPY.beltGrade("8° Gup – Amarillo"))).toBeTruthy();
    expect(screen.getByText(STUDENT_COPY.birthDate("09/03/2015"))).toBeTruthy();
  });

  it("S2: uploads a picked photo and shows it on the profile", async () => {
    const photo = { uri: "file:///tmp/p.jpg", mimeType: "image/jpeg", fileSize: 1000 };
    pickPhotoMock.mockResolvedValue(photo);
    service.setPhoto.mockResolvedValue("https://photos.test/ana");
    const { view } = renderProfile();
    await view;

    await fireEvent.press(await screen.findByText(STUDENT_COPY.addPhoto));

    await waitFor(() => expect(service.setPhoto).toHaveBeenCalledWith(ANA, photo));
    const image = await screen.findByLabelText(STUDENT_COPY.photoAlt("Ana Pérez"));
    expect(image.props.source).toEqual({ uri: "https://photos.test/ana" });
    expect(screen.getByText(STUDENT_COPY.changePhoto)).toBeTruthy();
  });

  it("S2: does nothing when the user cancels the picker", async () => {
    pickPhotoMock.mockResolvedValue(null);
    const { view } = renderProfile();
    await view;

    await fireEvent.press(await screen.findByText(STUDENT_COPY.addPhoto));

    await waitFor(() => expect(pickPhotoMock).toHaveBeenCalled());
    expect(service.setPhoto).not.toHaveBeenCalled();
  });

  it("A5: explains a refused photo", async () => {
    pickPhotoMock.mockResolvedValue({ uri: "file:///tmp/big.jpg", mimeType: "image/jpeg", fileSize: 9e6 });
    service.setPhoto.mockRejectedValue(new StudentError("photo-too-large", "too big"));
    const { view } = renderProfile();
    await view;

    await fireEvent.press(await screen.findByText(STUDENT_COPY.addPhoto));

    expect(await screen.findByText(STUDENT_COPY.errors["photo-too-large"])).toBeTruthy();
  });

  it("S4: routes to editing and deletes after confirmation", async () => {
    service.deleteStudent.mockResolvedValue(undefined);
    const { props, view } = renderProfile();
    await view;

    await fireEvent.press(await screen.findByText(STUDENT_COPY.editStudent));
    expect(props.onEdit).toHaveBeenCalledWith(ANA);

    confirmNextAlert();
    await fireEvent.press(screen.getByText(STUDENT_COPY.deleteStudent));
    await waitFor(() => expect(props.onDeleted).toHaveBeenCalled());
    expect(service.deleteStudent).toHaveBeenCalledWith(ANA);
  });

  it("says so when the student no longer exists", async () => {
    service.getStudent.mockResolvedValue(null);
    const { view } = renderProfile();
    await view;

    expect(await screen.findByText(STUDENT_COPY.studentMissing)).toBeTruthy();
  });
});
