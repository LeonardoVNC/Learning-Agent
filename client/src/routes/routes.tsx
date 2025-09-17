import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import PublicRoute from "./PublicRoute";
import PrivateRoute from "./PrivateRoute";
import RoleRoute from "./RoleRoute";
import AppLayout from "../layouts/AppLayout";
import StudentClasses from "../pages/periods-classes/StudentClasses";;
import PeriodDetailPage from "../pages/periods-classes/PeriodDetailPage";
import CoursePeriodsPage from "../pages/courses/CoursePeriodsPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import ExamsCreatePage from "../pages/exams/ExamCreatePage";
import ExamManagementPage from "../pages/exams/ExamManagementPage";
import ForgotPasswordPage from "../pages/ForgotPassword";
import Interview from "../pages/reinforcement/interview";
import Login from "../pages/Login";
import { Reinforcement } from "../pages/reinforcement/reinforcement";
import SettingsPage from "../pages/settings/SettingsPage";
import CoursesPage from "../pages/courses/CoursesPage";
import Test from "../pages/reinforcement/test";
import UploadDocumentPage from "../pages/documents/UploadDocumentPage";

export const AppRoutes = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PublicRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/forgot" element={<ForgotPasswordPage />} />
          {/* <Route path="/register" element={<Register />} /> */}
        </Route>

        <Route element={<PrivateRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="settings" element={<SettingsPage />} />

            {/* Professor */}
            <Route path="/professor" element={<RoleRoute allowed={["docente"]} />}>
              <Route path="courses" element={<CoursesPage />} />
              <Route path="courses/:courseId/documents" element={<UploadDocumentPage />} />
              <Route path="courses/:courseId/exams" element={<ExamManagementPage />} />
              <Route path="courses/:courseId/periods" element={<CoursePeriodsPage />} />
              <Route path="courses/:courseId/periods/:id" element={<PeriodDetailPage />} />
              <Route path="courses/:courseId/periods/:id/documents" element={<UploadDocumentPage />} />
              <Route path="courses/:courseId/students/documents" element={<UploadDocumentPage />} />
              <Route path="exams/create" element={<ExamsCreatePage />} />
            </Route>

            {/* Students */}
            <Route path="/student" element={<RoleRoute allowed={["estudiante"]} />}>
              <Route path="classes" element={<StudentClasses />} />
              <Route path="classes/:id/reinforcement" element={<Reinforcement />} />
              <Route path="classes/:id/reinforcement/test" element={<Test />} />
              <Route path="classes/:id/reinforcement/interview" element={<Interview />} />
              <Route path="classes/:id/reinforcement/documents" element={<UploadDocumentPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}; 