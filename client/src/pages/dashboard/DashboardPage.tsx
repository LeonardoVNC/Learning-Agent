import PageTemplate from "../../components/PageTemplate";
import { formatTodayEs } from "../../utils/date";
import ProfessorHome from "./ProfessorHome";
import StudentHome from "./StudentHome";
import { useUserStore } from "../../store/userStore";

export default function DashboardPage() {
  const user = useUserStore((s) => s.user); 
  const isTeacher = user?.roles?.includes("docente");
  // const isStudent = user?.roles?.includes("estudiante");
  return (
    <PageTemplate
      title="Dashboard"
      subtitle={
        "Welcome back — focus on what moves the needle. " + formatTodayEs()
      }
      breadcrumbs={[{ label: "Inicio", href: "/" }, { label: "Tablero" }]}
    >
      {isTeacher ? <ProfessorHome /> : <StudentHome />}
    </PageTemplate>
  );
}
