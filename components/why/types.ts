export type StoryPerson = { name: string; role: string; headline: string; quote: string };

/** One employee story: a 2:1 template image for desktop, a 4:3 photo for phones. */
export type Story = {
  srcDesktop: string;
  srcMobile: string;
  title: string;
  desc: string;
  badge: string;
  person?: StoryPerson;
};

/** What the story popup shows. */
export type ModalItem = {
  src: string;
  title: string;
  desc?: string;
  badge?: string;
  name?: string;
  role?: string;
  headline?: string;
};

export type LifeCategory = { key: string; title: string; cover: string; images: string[] };
