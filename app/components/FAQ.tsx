"use client";

import { useRef } from "react";
import { motion, useInView } from "motion/react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const ease = [0.16, 1, 0.3, 1] as const;

const FAQS = [
  {
    question: "Do I need to create an account to book a court?",
    answer:
      "No! We keep it simple. Just pick your preferred time slot, enter your name, email, and phone number, and you're all set. No sign-up or login required.",
  },
  {
    question: "What are your operating hours?",
    answer:
      "We're open daily from 7:00 AM to 12:00 AM, including weekends and most holidays. Check our booking page for real-time availability.",
  },
  {
    question: "How much does it cost to rent a court?",
    answer:
      "Court rental ranges from ₱500–₱600 per hour depending on the time slot and day. We also offer monthly membership packages with discounted rates.",
  },
  {
    question: "Is there parking available?",
    answer:
      "Yes, parking is available on a first come, first served basis.",
  },
];

export default function FAQ() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      id="faq"
      ref={ref}
      className="relative bg-surface py-28 md:py-36 lg:py-44 overflow-hidden"
    >
      {/* Subtle background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(183,205,176,0.08)_0%,transparent_60%)]" />

      <div className="relative z-10 px-6 sm:px-10 lg:px-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left: Header */}
          <div className="lg:sticky lg:top-32 lg:self-start">
            <motion.div
              className="flex items-center gap-3 mb-8"
              initial={{ opacity: 0, x: -20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.8, ease }}
            >
              <div className="w-12 h-px bg-primary" />
              <span className="font-[Poppins] text-[11px] uppercase tracking-[0.5em] text-primary font-bold">
                FAQ
              </span>
            </motion.div>

            <motion.h2
              className="font-['Clash_Display'] text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[0.9] tracking-tight text-primary mb-6"
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 1, delay: 0.1, ease }}
            >
              Got{" "}
              <span className="text-primary-fixed-dim italic">questions?</span>
            </motion.h2>

            <motion.p
              className="font-[Poppins] text-base md:text-lg text-primary/40 font-light leading-relaxed max-w-md"
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.25, ease }}
            >
              Everything you need to know about booking courts, memberships, and
              playing at Velocity.
            </motion.p>

            <motion.div
              className="mt-10 flex items-center gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.4, ease }}
            >
              <span className="material-symbols-outlined text-primary-fixed-dim text-xl">
                help_center
              </span>
              <p className="font-[Poppins] text-sm text-primary/30">
                Still need help?{" "}
                <a
                  href="#"
                  className="text-primary font-semibold hover:text-primary-fixed-dim transition-colors"
                >
                  Contact us
                </a>
              </p>
            </motion.div>
          </div>

          {/* Right: Accordion */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 1, delay: 0.3, ease }}
          >
            <Accordion>
              {FAQS.map((faq, i) => (
                <AccordionItem
                  key={i}
                  className="border-b border-primary/8 !border-transparent-none"
                >
                  <AccordionTrigger className="py-6 text-base md:text-lg font-['Clash_Display'] font-semibold text-primary hover:no-underline hover:text-primary-fixed-dim transition-colors cursor-pointer gap-4">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="font-[Poppins] text-primary/50 font-light leading-relaxed text-sm md:text-base">
                    <p>{faq.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
