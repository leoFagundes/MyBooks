import { createCn } from "cn/config";

// Ensina o merge de classes sobre os tokens próprios do app/globals.css,
// senão `rounded-md rounded-control` ficaria com as duas classes.
export const cn = createCn({
  extend: {
    theme: {
      radius: ["control", "card", "cover"],
      ease: ["standard"],
      animate: ["shimmer"],
    },
  },
});
