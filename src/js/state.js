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

export const featureCards = [
  {
    title: "教育に関心がある人",
    topic: "教育",
    copy: "学びの面白さ、場づくり、問いの立て方に向き合う学生。",
    image: "/images/students/mao.jpg",
  },
  {
    title: "AIで何か作っている人",
    topic: "AI",
    copy: "生成AI、アプリ制作、プロトタイプづくりに取り組む学生。",
    image: "/images/students/nagi.jpg",
  },
  {
    title: "地域で動いている人",
    topic: "地域",
    copy: "まち歩き、聞き書き、地域プロジェクトの入口を持つ学生。",
    image: "/images/students/tsumugi.jpg",
  },
  {
    title: "デザインが得意な人",
    topic: "デザイン",
    copy: "伝え方、見せ方、ポスターやUIに取り組む学生。",
    image: "/images/students/aoi.jpg",
  },
  {
    title: "起業の種を持つ人",
    topic: "起業",
    copy: "小さな検証から事業の芽を育てている学生。",
    image: "/images/students/yu.jpg",
  },
];

export const getAllTopics = () => [
  "すべて",
  ...new Set([...fixedTopics, ...students.flatMap((student) => student.tags)]),
];
