import type { Metadata } from 'next';
import PageClient from './PageClient';

export const metadata: Metadata = {
  title: "Spirit in Physics",
  description: "Measuring and quantifying the structure of spirituality using physical methods / Kawasaki Model",
  authors: [{ name: "Jun Kawasaki", url: "mailto:root@junkawasaki.com" }, { name: "Kazuki Tainaka" }, { name: "Tomonori Takeuchi" }],
  openGraph: {
    title: "Spirit in Physics",
    description: "Measuring and quantifying the structure of spirituality using physical methods / Kawasaki Model",
    images: [
      {
        url: "/assets/posts/spirit-in-physics/cover.jpg",
      },
    ],
  },
};

export default function Page() {
  return <PageClient />;
} 