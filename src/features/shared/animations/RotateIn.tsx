import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function RotateIn({ children }: Props) {
  return (
    <motion.div
      initial={{
        opacity: 0,
        rotate: -8,
        scale: 0.95,
      }}
      animate={{
        opacity: 1,
        rotate: 0,
        scale: 1,
      }}
      exit={{
        opacity: 0,
        rotate: 8,
        scale: 0.95,
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
