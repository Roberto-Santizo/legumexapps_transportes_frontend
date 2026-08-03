import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function SlideInUp({ children }: Props) {
  return (
    <motion.div
      initial={{
        y: "100%",
      }}
      animate={{
        y: 0,
      }}
      exit={{
        y: "100%",
      }}
      transition={{
        duration: 0.5,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
