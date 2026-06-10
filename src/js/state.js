export let students = [];
export let projects = [];

export const setStudents = (data) => { students = data; };
export const setProjects = (data) => { projects = data; };

export const getProjectBySlug = (slug) => projects.find((p) => p.slug === slug);
export const getStudentBySlug = (slug) => students.find((s) => s.slug === slug);
export const getMemberStudents = (project) =>
  (project.members || []).map(getStudentBySlug).filter(Boolean);

export const state = {
  selectedTopics: [],
  searchQuery: "",
};

export const fixedTopics = [
  "教育",
  "AI",
  "地域",
  "デザイン",
  "起業",
  "プログラミング",
  "問い",
  "活動公開",
  "Podcast",
  "Web制作",
  "N高",
];

export const interestTopics = [
  "教育",
  "AI",
  "地域",
  "デザイン",
  "起業",
  "プログラミング",
  "活動公開",
  "Web制作",
];

export const getAllTopics = () => [
  "すべて",
  ...new Set([...fixedTopics, ...students.flatMap((student) => student.tags)]),
];
