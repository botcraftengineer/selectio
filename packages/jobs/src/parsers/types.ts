export interface VacancyData {
  id: string;
  title: string;
  url: string | null;
  views: string;
  responses: string;
  responsesUrl: string | null;
  newResponses: string;
  resumesInProgress: string;
  suitableResumes: string;
  region: string;
  description: string;
}

export interface ResponseData {
  name: string;
  url: string;
}

export interface ResumeExperience {
  experience: string;
  contacts: unknown;
}

export interface SaveResponseData {
  vacancyId: string;
  resumeUrl: string;
  candidateName: string;
  experience: string;
  contacts: unknown;
}
