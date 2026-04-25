import * as XLSX from "xlsx";

export const TEMPLATE_COLUMNS = [
  "Name",
  "Title",
  "Company",
  "Skills",
  "Experience",
  "Education",
  "Location",
  "Salary Expectation",
  "Summary",
  "Email",
  "Availability",
];

const EXAMPLE_ROWS = [
  {
    Name: "Jordan Blake",
    Title: "Senior Backend Engineer",
    Company: "Stripe",
    Skills: "Python, Node.js, AWS, PostgreSQL, Docker",
    Experience: 6,
    Education: "BS Computer Science, Stanford",
    Location: "San Francisco, CA",
    "Salary Expectation": "$160,000 - $190,000",
    Summary: "Backend engineer specializing in payment systems and distributed architectures.",
    Email: "jordan.blake@example.com",
    Availability: "actively looking",
  },
  {
    Name: "Maya Patel",
    Title: "Full Stack Developer",
    Company: "Atlassian",
    Skills: "TypeScript, React, Node.js, AWS, MongoDB",
    Experience: 4,
    Education: "BE Computer Engineering, IIT Bombay",
    Location: "Remote",
    "Salary Expectation": "$130,000 - $155,000",
    Summary: "Full stack developer with strong backend focus. Built real-time collaboration features.",
    Email: "maya.patel@example.com",
    Availability: "open to opportunities",
  },
  {
    Name: "Sam Rivera",
    Title: "Product Designer",
    Company: "Airbnb",
    Skills: "Figma, User Research, Design Systems, Prototyping",
    Experience: 5,
    Education: "MFA Interaction Design, SVA",
    Location: "New York, NY",
    "Salary Expectation": "$120,000 - $145,000",
    Summary: "Product designer with expertise in design systems and accessibility.",
    Email: "sam.rivera@example.com",
    Availability: "open to opportunities",
  },
];

export function generateSampleTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(EXAMPLE_ROWS, { header: TEMPLATE_COLUMNS });

  // Set column widths for readability
  ws["!cols"] = [
    { wch: 20 }, // Name
    { wch: 28 }, // Title
    { wch: 20 }, // Company
    { wch: 45 }, // Skills
    { wch: 12 }, // Experience
    { wch: 35 }, // Education
    { wch: 25 }, // Location
    { wch: 25 }, // Salary Expectation
    { wch: 55 }, // Summary
    { wch: 30 }, // Email
    { wch: 22 }, // Availability
  ];

  XLSX.utils.book_append_sheet(wb, ws, "Candidates");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
}
