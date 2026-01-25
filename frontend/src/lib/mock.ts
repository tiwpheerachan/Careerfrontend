import type { Job } from "./types";

export const MOCK_JOBS: Job[] = [
  {
    job_id: "SHD-TH-OPS-LEAD-001",
    title: "CS Team Lead (Shopee)",
    department: "Operations",
    level: "Experienced",
    country: "Thailand",
    city: "Bangkok",
    location: "Bangkok, Thailand",
    description:
      "Lead and coach the customer service team to deliver excellent customer experience. Manage KPIs, quality, and escalation handling.",
    qualifications:
      "3+ years in customer service operations. Strong leadership and communication skills. Familiar with e-commerce is a plus.",
    responsibilities:
      "Manage daily operations, coach agents, monitor performance metrics, and drive continuous improvement.",
    benefits:
      "Competitive compensation, health benefits, learning budget, and global growth opportunities.",
    status: "published",
  },
  {
    job_id: "SHD-PH-CS-SENIOR-002",
    title: "Customer Service Supervisor",
    department: "Customer Service",
    level: "Senior",
    country: "Philippines",
    city: "Manila",
    location: "Manila, Philippines",
    description:
      "Supervise CS operations, ensure service levels, and coordinate cross-functional teams for issue resolution.",
    qualifications:
      "2+ years as team supervisor. Strong analytical skills and stakeholder management.",
    status: "published",
  },
  {
    job_id: "SHD-VN-ENG-JUNIOR-003",
    title: "Frontend Engineer",
    department: "Engineering and Technology",
    level: "Entry Level",
    country: "Vietnam",
    city: "Ho Chi Minh City",
    location: "Ho Chi Minh City, Vietnam",
    description:
      "Build responsive web experiences. Work with product and design to ship features quickly and reliably.",
    qualifications:
      "React/TypeScript experience. Good fundamentals in HTML/CSS. Bonus: Next.js, TailwindCSS.",
    status: "published",
  }
];
