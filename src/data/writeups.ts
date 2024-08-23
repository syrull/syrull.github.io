export type Writeups = {
  title: string;
  techs: string[];
  link: string;
  isComingSoon?: boolean;
};

const writeups: Writeups[] = [
  {
    title: "Vulnlab - Kaiju Chain [Hard]",
    techs: ["FileZilla", "Active Directory", "Windows", "ESC8"],
    link: "/posts/2024-02-19-vulnlab-kaiju/",
  },
  {
    title: "Vulnlab - Control (Chain)",
    techs: ["CVE 2023-32749", "PostgreSQL", "Linux", "nginx"],
    link: "/posts/vulnlab-control-chain",
  },
];

export default writeups;
