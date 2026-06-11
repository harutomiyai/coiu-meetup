export let students = [];
export let projects = [];
export let tagCategories = [];

export const setStudents = (data) => { students = data; };
export const setProjects = (data) => { projects = data; };
export const setTagCategories = (data) => { tagCategories = data; };

export const getParentTag = (childTag) => {
  const cat = tagCategories.find((c) => c.children.includes(childTag));
  return cat ? cat.label : null;
};

export const getParentTagsForStudent = (student) => {
  const tags = Array.isArray(student.tags) ? student.tags : [];
  const parents = [...new Set(tags.map(getParentTag).filter(Boolean))];
  return parents;
};

export const getProjectBySlug = (slug) => projects.find((p) => p.slug === slug);
export const getStudentBySlug = (slug) => students.find((s) => s.slug === slug);
export const getMemberStudents = (project) =>
  (project.members || []).map(getStudentBySlug).filter(Boolean);

export const state = {
  selectedTopics: [],
  searchQuery: "",
};

export const getAllTopics = () => [
  "すべて",
  ...tagCategories.map((c) => c.label),
];

export const getInterestTopics = () => tagCategories.map((c) => c.label);
