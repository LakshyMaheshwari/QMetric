import React from "react";
import { TestimonialsColumn, Testimonial } from "./testimonials-columns-1";
import { motion } from "motion/react";

const testimonials: Testimonial[] = [
  {
    text: "This platform transformed how our department validates exam papers. Automated CO-PO mapping saves weeks of manual effort.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
    name: "Dr. Briana Patton",
    role: "Dean of Academic Affairs",
  },
  {
    text: "Implementing QPQA was smooth and immediate. The automated Bloom's level distribution metrics are accurate and transparent.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    name: "Prof. Bilal Ahmed",
    role: "Controller of Examinations",
  },
  {
    text: "The support and documentation are exceptional. Our NBA and NAAC accreditation preparation became effortless.",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    name: "Dr. Saman Malik",
    role: "Head of Quality Assurance",
  },
  {
    text: "Zero subjective bias in paper evaluation. Every faculty member gets consistent and actionable feedback instantly.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
    name: "Prof. Omar Raza",
    role: "Director of Engineering",
  },
  {
    text: "Its robust module coverage detection and question difficulty scoring have elevated the academic standard of our university.",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    name: "Dr. Zainab Hussain",
    role: "HOD Computer Engineering",
  },
  {
    text: "The deterministic rule engine exceeded our expectations. It identified curriculum coverage gaps we missed for years.",
    image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    name: "Prof. Aliza Khan",
    role: "Academic Coordinator",
  },
  {
    text: "Our examination review board relies on these metrics for auditing every semester. It has standardized quality checks.",
    image: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80",
    name: "Dr. Farhan Siddiqui",
    role: "NBA Accreditation Officer",
  },
  {
    text: "A truly remarkable solution for outcome-based education. Seamless integration with our institutional evaluation workflow.",
    image: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80",
    name: "Dr. Sana Sheikh",
    role: "Dean of Faculty Development",
  },
  {
    text: "Using QPQA, our university standardized question paper balance across all engineering disciplines in one semester.",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80",
    name: "Prof. Hassan Ali",
    role: "Vice Principal Academics",
  },
];

const firstColumn = testimonials.slice(0, 3);
const secondColumn = testimonials.slice(3, 6);
const thirdColumn = testimonials.slice(6, 9);

export const Testimonials = () => {
  return (
    <section className="relative my-8">
      <div className="container z-10 mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-[540px] mx-auto text-center"
        >
          <div className="flex justify-center">
            <div className="border border-[#E8E2D7] py-1 px-4 rounded-full bg-white text-xs font-bold text-orange-600 shadow-sm">
              Testimonials
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight mt-4 text-[#111827]">
            What Educators Say
          </h2>
          <p className="text-center mt-3 text-sm text-[#57534E] leading-relaxed">
            See how professors, deans, and academic controllers across institutions evaluate QPQA.
          </p>
        </motion.div>

        <div className="flex justify-center gap-6 mt-10 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)] max-h-[700px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={16} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={20} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={18} />
        </div>
      </div>
    </section>
  );
};

export default { Testimonials };
