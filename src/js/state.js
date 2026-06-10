export let students = [];

export const setStudents = (data) => {
  students = data;
};

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
