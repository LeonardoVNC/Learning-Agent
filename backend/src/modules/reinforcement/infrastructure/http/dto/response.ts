export interface AdviceResponse {
  generated_question: string;
  user_response: string;
  coaching_advice: string;
}

export interface QuestionResponse {
  question: string;
}

export interface ChatResponse {
  question?: string;
  answer: string;
  explanatio?: string;
}
export interface MultipleSelectionResponse {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface TitleAndOption {
  label: string;
  answer: string;
}
export interface DoubleOptionResponse {
  question: string;
  options: TitleAndOption[];
  correctAnswer: number;
  explanation: string;
}
