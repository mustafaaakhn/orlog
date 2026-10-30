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
    | "monitor"
    | "room-add"
    | "heart-plus"
    | "heart-minus"
    | "dice"
    | "reroll"
    | "ban"
    | "shield"
    | "bolt"
    | "coins"
    | "arrow-up"
    | "arrow-down"
    | "pierce"
    | "copy"
    | "exit";
}>();
const paths = {
  monitor: "M3 4h18v13H3ZM8 21h8m-4-4v4",
  "room-add": "M3 21h18M5 21V3h12v6m-8 5h1m10-1v8m-4-4h8",
  "heart-plus": "M12 20 3.5 11.5a5 5 0 0 1 7-7L12 6l1.5-1.5a5 5 0 0 1 7 7Zm-3-9h6m-3-3v6",
  "heart-minus": "M12 20 3.5 11.5a5 5 0 0 1 7-7L12 6l1.5-1.5a5 5 0 0 1 7 7Zm-3-9h6",
  dice: "M4 4h16v16H4Zm4 4h.01M12 12h.01M16 16h.01",
  reroll: "M20 10a8 8 0 0 0-14-5L3 8m0-5v5h5m-4 6a8 8 0 0 0 14 5l3-3m0 5v-5h-5",
  ban: "M20 12a8 8 0 1 1-16 0 8 8 0 0 1 16 0ZM6.5 6.5l11 11",
  shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Zm-4 9h8m-4-4v8",
  bolt: "m14 2-10 12h7l-1 8L20 9h-7Z",
  coins: "M15 8c0 2-3 3-6 3S3 10 3 8s3-3 6-3 6 1 6 3ZM3 8v5c0 2 3 3 6 3m0-5v5m6-6c3 0 6 1 6 3s-3 3-6 3-6-1-6-3m0 0v5c0 2 3 3 6 3s6-1 6-3v-5",
  "arrow-up": "M12 21V3m-6 6 6-6 6 6",
  "arrow-down": "M12 3v18m-6-6 6 6 6-6",
  pierce: "M3 12h18m-6-6 6 6-6 6M9 4v5m0 6v5",

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
  exit: "M10 4H4v16h6m4-12 4 4-4 4m-6-4h10",
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
