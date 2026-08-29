// Starter data shared by the sqlite bootstrap and the firebase seed script.
// Kept free of any Next.js-specific imports so plain Node/bun scripts can use it.

export const STARTER_EMAIL = "demo@copyplaybook.app";
export const STARTER_PASSWORD = "demo1234";

export const STARTER_SCRIPTS: {
  title: string;
  type: string;
  tags: string;
  body: string;
}[] = [
  {
    title: "Direct Offer",
    type: "initial",
    tags: "LinkedIn,Instagram",
    body: `Hi {{name}} — I came across your {{platform}} and noticed you're actively selling {{offer}}, but your emails don't seem to match the quality of what you teach.

I write email copy for coaches and creators in the {{niche}} space. Recent result: a 3-email sequence that brought in $4.2k in five days (happy to share the breakdown).

If I rewrote one of your launch emails for free — no strings — would you want to see it? If you like it, we can talk about a bigger project.

Either way, keep up the great work.
— {{sender}}`,
  },
  {
    title: "Curiosity-Led",
    type: "initial",
    tags: "cold email",
    body: `Subject: quick question about your emails

Hi {{name}},

Odd question: do you know which of your emails makes you the most money?

Most {{niche}} creators I audit can't answer that — usually because the copy is doing a different job than the offer needs.

I fix that. I've been studying {{niche}} sales emails for a while now, and I put together 3 quick observations about your current funnel (took me 20 minutes, no catch).

Want me to send them over?
— {{sender}}`,
  },
];
