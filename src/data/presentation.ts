type Social = {
  label: string;
  link: string;
};

type Presentation = {
  mail: string;
  title: string;
  description: string;
  socials: Social[];
  profile?: string;
};

const presentation: Presentation = {
  mail: "sylsec@pm.me",
  title: "Hi, I'm Dimitar",
  description:
    "I am a offensive security consultant and a CTF player.",
  socials: [
    {
      label: "X",
      link: "https://x.com/5yrull",
    },
    {
      label: "Github",
      link: "https://github.com/syrull",
    },
  ],
};

export default presentation;
