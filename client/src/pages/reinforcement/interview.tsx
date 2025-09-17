import { useState } from "react";
import { useNavigate, useParams, generatePath } from "react-router-dom";
import { Button, theme } from "antd";
import PageTemplate from "../../components/PageTemplate";
import InterviewModal from "../../components/interview/InterviewModal";
import InterviewSummaryModal from "../../components/interview/InterviewFeedbackModal";
import OpenQuestion from "../../components/interview/OpenQuestion";
import TeoricQuestion from "../../components/interview/TeoricQuestion";
import MultipleQuestion from "../../components/interview/MultipleQuestion";
import useInterview from "../../hooks/useInterview";

export default function InterviewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { token } = theme.useToken();

  const [isInterviewStarted, setIsInterviewStarted] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const {
    isModalOpen,
    questionCount,
    currentQuestion,
    currentType,
    startExam,
    nextQuestion,
  } = useInterview(["multiple", "teoric", "open"], () => setShowSummary(true));

  const goToReinforcement = () => {
    if (!id) return;
    navigate(generatePath("/student/classes/:id/reinforcement", { id }));
  };

  const handleStartInterview = (count: number) => {
    startExam(count);
    setIsInterviewStarted(true);
  };

  const handleNextQuestion = () => {
    if (currentQuestion < questionCount) nextQuestion();
    else setShowSummary(true);
  };

  const renderQuestion = () => {
    switch (currentType) {
      case "multiple":
        return <MultipleQuestion onNext={handleNextQuestion} />;
      case "teoric":
        return <TeoricQuestion onNext={handleNextQuestion} />;
      case "open":
      default:
        return <OpenQuestion onNext={handleNextQuestion} />;
    }
  };

  return (
    <PageTemplate
      title="Interview"
      subtitle={
        isInterviewStarted && questionCount
          ? `Question ${currentQuestion} of ${questionCount}`
          : "Soon you will find interview practice"
      }
      breadcrumbs={[
        { label: "Home", href: "/" },
        { label: "Classes", href: "/student/classes" },
        { label: "Reinforcement", href: id ? generatePath("/student/classes/:id/reinforcement", { id }) : "#" },
        { label: "Interview" },
      ]}
      actions={
        isInterviewStarted && (
          <Button
            style={{ backgroundColor: token.colorPrimary, color: token.colorTextLightSolid }}
            onClick={() => setShowSummary(true)}
          >
            Finalizar
          </Button>
        )
      }
    >
      {!isInterviewStarted && (
        <InterviewModal
          open={isModalOpen}
          onClose={goToReinforcement}
          onSelectDifficulty={handleStartInterview}
        />
      )}

      {isInterviewStarted && renderQuestion()}

      <InterviewSummaryModal
        open={showSummary}
        onClose={goToReinforcement}
        onDownload={() => {}}
      />
    </PageTemplate>
  );
}
