export type PublicLink = {
  id: string;
  name: string;
  href: string;
  summary: string;
};

export type PublicFaq = {
  id: string;
  question: string;
  answer: string;
};

export type SitemapEntry = {
  path: string;
  updatedAt: Date;
};
