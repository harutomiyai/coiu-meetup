import { setStudents } from "./state.js";

const STUDENTS_DATA_URL = "/data/students.json";

export const loadStudents = async () => {
  const response = await fetch(STUDENTS_DATA_URL);

  if (!response.ok) {
    throw new Error(`Failed to load ${STUDENTS_DATA_URL}: ${response.status}`);
  }

  const data = await response.json();

  if (!Array.isArray(data)) {
    throw new Error(`${STUDENTS_DATA_URL} must contain an array of students.`);
  }

  setStudents(data);
};
