export const CURRENT_USER_STORAGE_KEY = "lalendarCurrentUser";

export const USERS = [
  {
    id: "sumin",
    password: "sumin",
    name: "한수민",
    displayName: "한수민님",
  },
  {
    id: "jea",
    password: "jea",
    name: "최재혁",
    displayName: "최재혁님",
  },
  {
    id: "dada",
    password: "dada",
    name: "김다빈",
    displayName: "김다빈님",
  },
];

export function findLoginUser(id, password) {
  return USERS.find((user) => user.id === id && user.password === password) || null;
}

export function findUserById(id) {
  return USERS.find((user) => user.id === id) || null;
}
