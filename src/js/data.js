import { setStudents } from "./state.js";

const STUDENTS_INDEX_URL = "/data/students/index.json";

const fetchJson = async (url) => {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load ${url}: ${response.status}`);
  }

  return response.json();
};

export const loadStudents = async () => {
  const index = await fetchJson(STUDENTS_INDEX_URL);

  if (!Array.isArray(index)) {
    throw new Error(`${STUDENTS_INDEX_URL} must contain an array of student file entries.`);
  }

  const data = await Promise.all(
    index.map(async (entry) => {
      if (!entry?.path) {
        throw new Error(`${STUDENTS_INDEX_URL} entries must include a path.`);
      }

      return fetchJson(entry.path);
    }),
  );

  setStudents(data);
};
