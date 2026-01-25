import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function ScrollRevealHeading() {
  const ref = useRef<HTMLDivElement | null>(null);
  const isInView = useInView(ref, {
    margin: "-120px",
    once: true,
  });

  const words = ["Discover", "Opportunities"];

  return (
    <div
      ref={ref}
      className="pointer-events-none flex min-h-[50vh] items-center justify-center"
    >
      <motion.h2
        className="text-center text-5xl font-black tracking-tight text-[#6f5730] md:text-6xl"
        initial="hidden"
        animate={isInView ? "visible" : "hidden"}
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.18 },
          },
        }}
      >
        {words.map((word, i) => (
          <motion.span
            key={i}
            className="mr-4 inline-block"
            variants={{
              hidden: {
                opacity: 0,
                y: 40,
                filter: "blur(8px)",
              },
              visible: {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                transition: {
                  duration: 0.8,
                  ease: "easeOut",
                },
              },
            }}
          >
            {word}
          </motion.span>
        ))}
      </motion.h2>
    </div>
  );
}