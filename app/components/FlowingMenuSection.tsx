"use client";

import FlowingMenu from "@/components/FlowingMenu";

const menuItems = [
  {
    link: "#booking",
    text: "Book a Court",
    image: "/hero.png",
  },
  {
    link: "#services",
    text: "Court Rentals",
    image: "/hero.png",
  },
  {
    link: "#community",
    text: "Join the Community",
    image: "/hero.png",
  },
  {
    link: "#facility",
    text: "Our Facility",
    image: "/hero.png",
  },
];

export default function FlowingMenuSection() {
  return (
    <section className="h-[60vh] md:h-[70vh]">
      <FlowingMenu
        items={menuItems}
        speed={12}
        textColor="#ffffff"
        bgColor="#182916"
        marqueeBgColor="#b7cdb0"
        marqueeTextColor="#182916"
        borderColor="rgba(255,255,255,0.1)"
      />
    </section>
  );
}
