export const CURRENT_USER_STORAGE_KEY = "lalendarCurrentUser";

export const USERS = [
  {
    id: "sumin",
    password: "sumin",
    name: "한수민",
    displayName: "한수민님",
    role: "member",
  },
  {
    id: "jea",
    password: "jea",
    name: "최재혁",
    displayName: "최재혁님",
    role: "member",
  },
  {
    id: "dada",
    password: "dada",
    name: "김다빈",
    displayName: "김다빈님",
    role: "member",
  },
];

export const MASTER_USERS = [
  {
    id: "seo",
    password: "seo",
    name: "서 관리자",
    displayName: "서 관리자",
    role: "master",
  },
  {
    id: "hyun",
    password: "hyun",
    name: "현 관리자",
    displayName: "현 관리자",
    role: "master",
  },
];

const LOGIN_USERS = [...USERS, ...MASTER_USERS];

export function findLoginUser(id, password) {
  return LOGIN_USERS.find((user) => user.id === id && user.password === password) || null;
}

export function findUserById(id) {
  return LOGIN_USERS.find((user) => user.id === id) || null;
}

export function isMasterUser(user) {
  return user?.role === "master";
}
