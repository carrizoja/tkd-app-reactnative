import type { School } from "../../school-management/model/types";
import { StudentError, type Student, type StudentGroup } from "../model/types";
import { createStudentService, type PhotoStore, type StudentStore } from "./student-service";

// `./repository` pulls in the Firebase SDK, which the jest-expo preset cannot
// transform. Every test injects in-memory stores, so this stub only keeps the
// SDK out of the module graph.
jest.mock("./repository", () => ({}));

const SCHOOL: School = { id: "a1", associationId: "assocA", name: "Escuela Centro" };
const OTHER_SCHOOL: School = { id: "b1", associationId: "assocB", name: "Escuela Norte" };

const ana: Student = {
  id: "stu-ana",
  schoolId: "a1",
  associationId: "assocA",
  firstName: "Ana",
  lastName: "Pérez",
  lastNameLower: "pérez",
};
const beto: Student = { ...ana, id: "stu-beto", firstName: "Beto", lastName: "Bravo", lastNameLower: "bravo" };
const foreign: Student = { ...ana, id: "stu-x", schoolId: "b1", associationId: "assocB" };

/** In-memory stores; ids are sequential so tests stay deterministic. */
function memory(seed: { students?: Student[]; groups?: StudentGroup[]; photos?: string[] } = {}) {
  const students = new Map((seed.students ?? []).map((s) => [s.id, s]));
  const groups = new Map((seed.groups ?? []).map((g) => [g.id, g]));
  const photos = new Set(seed.photos ?? []);
  const uploadedTypes: string[] = [];
  const failures = { removePhoto: false, removeStudent: false };
  let next = 0;

  const store: StudentStore = {
    listStudentsBySchool: async (schoolId) =>
      [...students.values()]
        .filter((s) => s.schoolId === schoolId)
        .sort((a, b) => a.lastNameLower.localeCompare(b.lastNameLower)),
    getStudent: async (id) => students.get(id) ?? null,
    createStudent: async (data) => {
      const student = { id: `stu-${++next}`, ...data };
      students.set(student.id, student);
      return student;
    },
    updateStudent: async (id, patch) => {
      const updated: Record<string, unknown> = { ...students.get(id)! };
      for (const [key, value] of Object.entries(patch)) {
        if (value === null) delete updated[key];
        else updated[key] = value;
      }
      students.set(id, updated as unknown as Student);
    },
    removeStudent: async (id) => {
      if (failures.removeStudent) throw new Error("permission-denied");
      students.delete(id);
    },
    listGroupsBySchool: async (schoolId) => [...groups.values()].filter((g) => g.schoolId === schoolId),
    createGroup: async (data) => {
      const group = { id: `grp-${++next}`, ...data };
      groups.set(group.id, group);
      return group;
    },
    renameGroup: async (id, name) => {
      groups.set(id, { ...groups.get(id)!, name });
    },
    addGroupMembers: async (id, studentIds) => {
      const group = groups.get(id)!;
      groups.set(id, { ...group, memberIds: [...new Set([...group.memberIds, ...studentIds])] });
    },
    removeGroupMember: async (id, studentId) => {
      const group = groups.get(id)!;
      groups.set(id, { ...group, memberIds: group.memberIds.filter((m) => m !== studentId) });
    },
    removeGroup: async (id) => {
      groups.delete(id);
    },
  };

  const photoStore: PhotoStore = {
    upload: async (path, _uri, contentType) => {
      uploadedTypes.push(contentType);
      photos.add(path);
      return `https://photos.test/${path}`;
    },
    remove: async (path) => {
      if (failures.removePhoto) throw new Error("storage/unavailable");
      photos.delete(path);
    },
  };

  return {
    store,
    photoStore,
    students,
    groups,
    photos,
    uploadedTypes,
    failures,
    service: createStudentService(store, photoStore),
  };
}

async function expectStudentError(promise: Promise<unknown>, code: StudentError["code"]) {
  await expect(promise).rejects.toBeInstanceOf(StudentError);
  await expect(promise).rejects.toMatchObject({ code });
}

describe("students", () => {
  it("S1: stores a student under the school and lists them by surname", async () => {
    const { service } = memory({ students: [beto] });

    const created = await service.createStudent(SCHOOL, { firstName: " Ana ", lastName: " Pérez " });

    expect(created).toEqual({
      id: "stu-1",
      schoolId: "a1",
      associationId: "assocA",
      firstName: "Ana",
      lastName: "Pérez",
      lastNameLower: "pérez",
    });
    expect((await service.listStudents(SCHOOL)).map((s) => s.id)).toEqual(["stu-beto", "stu-1"]);
  });

  it("S1: requires a first name and a last name", async () => {
    const { service, students } = memory();
    await expectStudentError(service.createStudent(SCHOOL, { firstName: "", lastName: "Pérez" }), "invalid-input");
    await expectStudentError(service.createStudent(SCHOOL, { firstName: "Ana", lastName: "  " }), "invalid-input");
    expect(students.size).toBe(0);
  });

  it("S1: stores the optional belt/grade and birth date when given", async () => {
    const { service } = memory();
    const created = await service.createStudent(SCHOOL, {
      firstName: "Ana",
      lastName: "Pérez",
      beltGrade: " 8° Gup ",
      birthDate: "2015-03-09",
    });
    expect(created).toMatchObject({ beltGrade: "8° Gup", birthDate: "2015-03-09" });
  });

  it("S3: accepts only ITF grades for the belt/grade", async () => {
    const { service, students } = memory({ students: [ana] });
    await expectStudentError(
      service.createStudent(SCHOOL, { firstName: "Ana", lastName: "Pérez", beltGrade: "8 gup" }),
      "invalid-input",
    );
    await expectStudentError(
      service.updateStudent(ana, { firstName: "Ana", lastName: "Pérez", beltGrade: "cinturón amarillo" }),
      "invalid-input",
    );
    expect(students.get("stu-ana")).toEqual(ana);
  });

  it("rejects a birth date that does not exist on the calendar", async () => {
    const { service } = memory();
    for (const birthDate of ["2015-02-31", "2015-13-01", "2015-00-10"]) {
      await expectStudentError(
        service.createStudent(SCHOOL, { firstName: "Ana", lastName: "Pérez", birthDate }),
        "invalid-input",
      );
    }
    await expect(
      service.createStudent(SCHOOL, { firstName: "Ana", lastName: "Pérez", birthDate: "2016-02-29" }),
    ).resolves.toMatchObject({ birthDate: "2016-02-29" });
  });

  it("rejects a birth date that is not YYYY-MM-DD", async () => {
    const { service } = memory();
    await expectStudentError(
      service.createStudent(SCHOOL, { firstName: "Ana", lastName: "Pérez", birthDate: "09/03/2015" }),
      "invalid-input",
    );
  });

  it("S3/S4: persists edits, including the belt/grade, and keeps the sort key in sync", async () => {
    const { service, students } = memory({ students: [ana] });

    await service.updateStudent(ana, { firstName: "Ana", lastName: "Álvarez", beltGrade: "1° Dan" });

    expect(students.get("stu-ana")).toMatchObject({
      lastName: "Álvarez",
      lastNameLower: "álvarez",
      beltGrade: "1° Dan",
    });
  });

  it("S4: clears the belt/grade and birth date when they are emptied", async () => {
    const { service, students } = memory({ students: [{ ...ana, beltGrade: "8° Gup", birthDate: "2015-03-09" }] });

    await service.updateStudent(ana, { firstName: "Ana", lastName: "Pérez", beltGrade: " ", birthDate: "" });

    expect(students.get("stu-ana")).not.toHaveProperty("beltGrade");
    expect(students.get("stu-ana")).not.toHaveProperty("birthDate");
  });

  it("S4: returns one student by id, or null when it no longer exists", async () => {
    const { service } = memory({ students: [ana] });
    await expect(service.getStudent("stu-ana")).resolves.toEqual(ana);
    await expect(service.getStudent("gone")).resolves.toBeNull();
  });

  it("S4/A4: deleting a student removes its photo and its group memberships", async () => {
    const path = "students/a1/stu-ana/photo";
    const { service, students, groups, photos } = memory({
      students: [{ ...ana, photoUrl: "https://photos.test/x" }, beto],
      groups: [
        { id: "g1", schoolId: "a1", name: "Competidores", memberIds: ["stu-ana", "stu-beto"] },
        { id: "g2", schoolId: "a1", name: "Infantiles", memberIds: ["stu-beto"] },
      ],
      photos: [path],
    });

    await service.deleteStudent(ana);

    expect(students.has("stu-ana")).toBe(false);
    expect(photos.has(path)).toBe(false);
    expect(groups.get("g1")!.memberIds).toEqual(["stu-beto"]);
    expect(groups.get("g2")!.memberIds).toEqual(["stu-beto"]);
  });
});

describe("deleting a student when a step fails", () => {
  const seed = () => ({
    students: [ana],
    groups: [{ id: "g1", schoolId: "a1", name: "G", memberIds: ["stu-ana"] }],
    photos: ["students/a1/stu-ana/photo"],
  });

  it("A4: still deletes the student and cleans its groups when the photo cannot be removed", async () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    const { service, students, groups, failures } = memory(seed());
    failures.removePhoto = true;
    try {
      await service.deleteStudent(ana);
      expect(students.has("stu-ana")).toBe(false);
      expect(groups.get("g1")!.memberIds).toEqual([]);
      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });

  it("A4: leaves the student, its groups and its photo intact when the student cannot be deleted", async () => {
    const { service, students, groups, photos, failures } = memory(seed());
    failures.removeStudent = true;

    await expect(service.deleteStudent(ana)).rejects.toThrow("permission-denied");

    expect(students.has("stu-ana")).toBe(true);
    expect(groups.get("g1")!.memberIds).toEqual(["stu-ana"]);
    expect(photos.has("students/a1/stu-ana/photo")).toBe(true);
  });
});

describe("photos", () => {
  it("S2: uploads the photo under the student's school and stores its URL on the profile", async () => {
    const { service, students, photos } = memory({ students: [ana] });

    const url = await service.setPhoto(ana, { uri: "file:///tmp/pic.jpg", mimeType: "image/jpeg" });

    expect(photos.has("students/a1/stu-ana/photo")).toBe(true);
    expect(url).toBe("https://photos.test/students/a1/stu-ana/photo");
    expect(students.get("stu-ana")!.photoUrl).toBe(url);
  });

  it("A5: uploads with a lower-cased content type, which the Storage rules expect", async () => {
    const { service, uploadedTypes } = memory({ students: [ana] });
    await service.setPhoto(ana, { uri: "file:///tmp/P.JPG", mimeType: "image/JPEG" });
    expect(uploadedTypes).toEqual(["image/jpeg"]);
  });

  it("A5: refuses images of 5 MB or more before uploading", async () => {
    const { service, photos } = memory({ students: [ana] });
    await expectStudentError(
      service.setPhoto(ana, { uri: "file:///tmp/big.jpg", mimeType: "image/jpeg", fileSize: 5 * 1024 * 1024 }),
      "photo-too-large",
    );
    expect(photos.size).toBe(0);
  });

  it("A5: refuses files that are not images before uploading", async () => {
    const { service, photos } = memory({ students: [ana] });
    await expectStudentError(
      service.setPhoto(ana, { uri: "file:///tmp/doc.pdf", mimeType: "application/pdf" }),
      "invalid-photo",
    );
    expect(photos.size).toBe(0);
  });

  it("A5: refuses SVG, which can carry scripts, but accepts common photo formats", async () => {
    const { service, photos } = memory({ students: [ana] });
    await expectStudentError(
      service.setPhoto(ana, { uri: "file:///tmp/x.svg", mimeType: "image/svg+xml" }),
      "invalid-photo",
    );
    expect(photos.size).toBe(0);
    await service.setPhoto(ana, { uri: "file:///tmp/p.heic", mimeType: "image/heic", fileSize: 1024 });
    expect(photos.size).toBe(1);
  });
});

describe("groups", () => {
  it("S8: creates a group with the chosen students of the school", async () => {
    const { service, groups } = memory({ students: [ana, beto] });

    const group = await service.createGroup(SCHOOL, { name: " Competidores " }, [ana, beto]);

    expect(group).toEqual({ id: "grp-1", schoolId: "a1", name: "Competidores", memberIds: ["stu-ana", "stu-beto"] });
    expect(groups.get("grp-1")).toEqual(group);
    await expect(service.listGroups(SCHOOL)).resolves.toEqual([group]);
  });

  it("S8: requires a group name", async () => {
    const { service, groups } = memory();
    await expectStudentError(service.createGroup(SCHOOL, { name: " " }, []), "invalid-input");
    expect(groups.size).toBe(0);
  });

  it("S8/A6: adds members, but only students of the group's school", async () => {
    const { service, groups } = memory({ groups: [{ id: "g1", schoolId: "a1", name: "G", memberIds: [] }] });
    const group = groups.get("g1")!;

    await service.addMembers(group, [ana]);
    expect(groups.get("g1")!.memberIds).toEqual(["stu-ana"]);

    await expectStudentError(service.addMembers(group, [foreign]), "not-same-school");
    await expectStudentError(service.createGroup(OTHER_SCHOOL, { name: "X" }, [ana]), "not-same-school");
    expect(groups.get("g1")!.memberIds).toEqual(["stu-ana"]);
  });

  it("S9: removing a member keeps the student in the school", async () => {
    const { service, groups, students } = memory({
      students: [ana],
      groups: [{ id: "g1", schoolId: "a1", name: "G", memberIds: ["stu-ana"] }],
    });

    await service.removeMember(groups.get("g1")!, ana);

    expect(groups.get("g1")!.memberIds).toEqual([]);
    expect(students.has("stu-ana")).toBe(true);
  });

  it("renames and deletes a group without touching its students", async () => {
    const { service, groups, students } = memory({
      students: [ana],
      groups: [{ id: "g1", schoolId: "a1", name: "G", memberIds: ["stu-ana"] }],
    });

    await service.renameGroup(groups.get("g1")!, { name: "Avanzados" });
    expect(groups.get("g1")!.name).toBe("Avanzados");

    await service.deleteGroup(groups.get("g1")!);
    expect(groups.has("g1")).toBe(false);
    expect(students.has("stu-ana")).toBe(true);
  });
});
