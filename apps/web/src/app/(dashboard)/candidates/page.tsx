import { SiteHeader } from "~/components/layout";
import { CandidatesList } from "./candidates-list";

export default function CandidatesPage() {
  return (
    <>
      <SiteHeader title="Кандидаты" />
      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
              <CandidatesList />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
