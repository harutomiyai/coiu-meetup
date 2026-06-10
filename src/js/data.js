import { setStudents, setProjects } from "./state.js";

const STUDENTS_INDEX_URL = "/data/students/index.json";
const PROJECTS_INDEX_URL = "/data/projects/index.json";

const fetchJson = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  return response.json();
};

const loadIndex = async (indexUrl) => {
  const index = await fetchJson(indexUrl);
  if (!Array.isArray(index)) throw new Error(`${indexUrl} must be an array.`);
  return Promise.all(
    index.map((entry) => {
      if (!entry?.path) throw new Error(`${indexUrl} entries must include a path.`);
      return fetchJson(entry.path);
    })
  );
};

export const loadStudents = async () => {
  const data = await loadIndex(STUDENTS_INDEX_URL);
  setStudents(data);
};

export const loadProjects = async () => {
  const data = await loadIndex(PROJECTS_INDEX_URL);
  setProjects(data);
};

export const loadAll = async () => {
  await Promise.all([loadStudents(), loadProjects()]);
};
