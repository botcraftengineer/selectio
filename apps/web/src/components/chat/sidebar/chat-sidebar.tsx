import { CandidateInfo } from "./candidate-info";
import { ResumePdfLink } from "./resume-pdf-link";
import { ScreeningInfo } from "./screening-info";
import { StatusInfo } from "./status-info";
import { VacancyInfo } from "./vacancy-info";

interface ChatSidebarProps {
  candidateName: string | null;
  chatId: string;
  responseData?: {
    status?: string | null;
    createdAt?: Date | null;
    resumePdfFile?: {
      key: string;
      fileName: string;
    } | null;
    screening?: {
      score: number | null;
      detailedScore?: number | null;
      analysis?: string | null;
    } | null;
    vacancy?: {
      title: string;
      description?: string | null;
    } | null;
  } | null;
}

export function ChatSidebar({
  candidateName,
  chatId,
  responseData,
}: ChatSidebarProps) {
  return (
    <div className="w-80 border-l overflow-y-auto">
      <div className="p-6 space-y-6">
        <CandidateInfo candidateName={candidateName} chatId={chatId} />

        {responseData?.resumePdfFile && (
          <div>
            <h2 className="text-lg font-semibold mb-4">Резюме</h2>
            <ResumePdfLink
              fileKey={responseData.resumePdfFile.key}
              fileName={responseData.resumePdfFile.fileName}
            />
          </div>
        )}

        {responseData?.screening && (
          <ScreeningInfo
            score={responseData.screening.score}
            detailedScore={responseData.screening.detailedScore}
            analysis={responseData.screening.analysis}
          />
        )}

        {responseData?.vacancy && (
          <VacancyInfo title={responseData.vacancy.title} />
        )}

        <StatusInfo
          status={responseData?.status}
          createdAt={responseData?.createdAt}
        />
      </div>
    </div>
  );
}
