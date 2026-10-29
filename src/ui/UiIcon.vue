<script setup lang="ts">
defineProps<{
  name:
    | "arrow"
    | "back"
    | "check"
    | "close"
    | "settings"
    | "translate"
    | "book"
    | "people"
    | "robot"
    | "door"
    | "copy"
    | "log"
    | "menu";
}>();
const paths = {
  arrow: "M4 12h16m-6-6 6 6-6 6",
  back: "M20 12H4m6-6-6 6 6 6",
  check: "m5 12 4 4L19 6",
  close: "m6 6 12 12M6 18 18 6",
  settings: "M4 7h16M4 17h16M8 4v6m8 4v6",
  translate: "M3 5h12M9 3v2M5 5c.7 4.6 3.5 8 8 10M13 5c-.7 4.6-3.5 8-8 10M13 21l4-10 4 10m-6.5-4h5",
  book: "M12 5v15M12 5C8 2 3 4 3 4v14s5-2 9 2c4-4 9-2 9-2V4s-5-2-9 1Z",
  people:
    "M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2m18 0v-2a4 4 0 0 0-3-3.87M16 3a4 4 0 0 1 0 8M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  robot: "M12 3v3M9 3h6M5 7h14v13H5ZM2 11v5m20-5v5M8 11h1m6 0h1m-7 5h6",
  door: "M3 21h18M5 21V3h14v18M9 21V7l8-2v16m-5-7h1",
  copy: "M9 9h12v12H9ZM15 5V3H3v12h2",
  log: "M8 5h13M8 12h13M8 19h13M3 5h.01M3 12h.01M3 19h.01",
  menu: "M4 6h16M4 12h16M4 18h16",
};
</script>
<template>
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name]" />
  </svg>
</template>
