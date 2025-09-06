export const CLASSES_REPO = Symbol('ClassesRepositoryPort');
export const COURSE_REPO = Symbol('CourseRepostoryPort')
export const STUDENT_REPO = Symbol('StudentRepositoryPort');
export const TEACHER_REPO = Symbol('TeacherRepositoryPort')
export const ENROLLMENT_REPO = Symbol('EnrollmentRepositoryPort');

export { USER_REPO, HASHER } from "../identity/tokens";
export { ROLE_REPO } from "../rbac/tokens";