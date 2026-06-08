export type BlogSection = {
  heading: string;
  body: string[];
};

export type BlogFaq = {
  question: string;
  answer: string;
};

export type BlogPost = {
  slug: string;
  title: string;
  seoTitle: string;
  description: string;
  excerpt: string;
  publishedAt: string;
  readingTime: string;
  author: string;
  primaryKeyword: string;
  secondaryKeywords: string[];
  areas: string[];
  sections: BlogSection[];
  faqs: BlogFaq[];
};

export const blogPosts: BlogPost[] = [
  {
    slug: "zoot-launch-first-100-homes-johannesburg",
    title: "Zoot is opening for the first 100 founding homes in Johannesburg",
    seoTitle: "Zoot Launch: Premium Cleaning Services In Johannesburg",
    description:
      "Zoot is launching carefully in Johannesburg with vetted Zooters, premium home care, Care+, and trusted cleaning for homes, offices, Airbnb hosts, and landlords.",
    excerpt:
      "We are opening Zoot carefully in Johannesburg because great home care needs trust, not chaos. Here is what the first 100 founding homes can expect.",
    publishedAt: "2026-06-08",
    readingTime: "4 min read",
    author: "Zoot Team",
    primaryKeyword: "cleaning services Johannesburg",
    secondaryKeywords: [
      "premium home cleaning Johannesburg",
      "trusted cleaners Johannesburg",
      "on demand cleaning services",
      "Airbnb cleaning Johannesburg",
      "office cleaning Johannesburg",
    ],
    areas: ["Sandton", "Bryanston", "Rosebank", "Midrand", "Fourways"],
    sections: [
      {
        heading: "Why we are not launching everywhere at once",
        body: [
          "Most people do not wake up excited to manage cleaning. They want the home ready, the office reset, the guest suite handled, and the person arriving at the door to feel professional and trustworthy. That is the problem Zoot is built around.",
          "We are opening Zoot to the first 100 founding homes in Johannesburg because trust should be built carefully. A home-care platform should not race ahead of its own quality controls. It should learn the area, support the Zooters doing the work, and make every booking feel handled from start to finish.",
        ],
      },
      {
        heading: "What Zoot does differently",
        body: [
          "Zoot connects clients with vetted independent cleaning contractors called Zooters. The product is built for once-off home cleaning, recurring home care, deep cleaning, moving cleans, Airbnb turnover cleaning, landlord handovers, and quick office resets.",
          "The goal is not to be the cheapest name in cleaning. The goal is to make quality easier to book, easier to repeat, and easier to trust. That means saved home preferences, safer in-app communication, support workflows, favourite Zooter rebooking, and Care+ for households and hosts who want their home remembered.",
        ],
      },
      {
        heading: "Launch areas we are prioritising",
        body: [
          "Our first focus is dense Johannesburg demand around Sandton, Bryanston, Rosebank, Midrand, Fourways, Hyde Park, Parkhurst, Melville, Waterfall, Dainfern, Bedfordview, and nearby approved launch suburbs.",
          "That means if you are searching for cleaning in Bryanston, a cleaner in Rosebank, on demand cleaning for a business in Sandton, or a fast reset before guests arrive, Zoot is being shaped around exactly those real-world moments.",
        ],
      },
      {
        heading: "For busy homes, hosts, landlords, and offices",
        body: [
          "A homeowner might need the house reset before family arrives. An Airbnb host might need a turnover clean between checkout and check-in. A landlord might need a move-out clean with photo proof. A small office might need a quick cleaning team before clients walk in.",
          "Those are different jobs, but the same promise matters in all of them: book clearly, know what is happening, keep private details inside the app, and get a service that respects the space.",
        ],
      },
      {
        heading: "What founding homes get to shape",
        body: [
          "The first homes help us sharpen the details that matter: service timing, suburb coverage, Care+ reminders, favourite Zooter rebooking, support response flows, property profiles, and how Zoot should feel on a busy week when the home simply needs to be handled.",
          "If you want premium cleaning services in Johannesburg with a more careful, trust-first approach, Zoot is being built for you.",
        ],
      },
    ],
    faqs: [
      {
        question: "Where is Zoot launching first?",
        answer:
          "Zoot is prioritising approved Johannesburg launch areas including Sandton, Bryanston, Rosebank, Midrand, Fourways, Hyde Park, Parkhurst, Melville, Waterfall, Dainfern, Bedfordview, and nearby suburbs.",
      },
      {
        question: "Is Zoot only for homes?",
        answer:
          "No. Zoot is designed for homes, Airbnb hosts, landlords, property managers, and small office clients who need trusted cleaning and home-care workflows.",
      },
      {
        question: "Is Zoot a cheap cleaning app?",
        answer:
          "Zoot is positioned as premium home-care infrastructure. The focus is trust, quality, saved preferences, safer communication, and repeatable convenience rather than the cheapest possible booking.",
      },
    ],
  },
  {
    slug: "cleaning-in-bryanston-rosebank-sandton-guide",
    title: "Cleaning in Bryanston, Rosebank or Sandton: how to book without chasing WhatsApps",
    seoTitle: "Cleaning In Bryanston, Rosebank And Sandton | Zoot Guide",
    description:
      "A practical guide for finding trusted cleaning in Bryanston, Rosebank, Sandton and nearby Johannesburg areas, including home, office, Airbnb and urgent cleaning needs.",
    excerpt:
      "If your search history says cleaning in Bryanston, cleaner in Rosebank, or quick office cleaning in Sandton, this guide is for the exact moment before things get messy.",
    publishedAt: "2026-06-08",
    readingTime: "5 min read",
    author: "Zoot Team",
    primaryKeyword: "cleaning in Bryanston",
    secondaryKeywords: [
      "cleaner in Rosebank",
      "cleaning services Sandton",
      "quick cleaning for my office",
      "on demand cleaning services for business",
      "Airbnb turnover cleaning Johannesburg",
    ],
    areas: ["Bryanston", "Rosebank", "Sandton", "Hyde Park", "Parkhurst"],
    sections: [
      {
        heading: "The real reason people search for cleaners nearby",
        body: [
          "Nobody types cleaner in Rosebank because they want another admin task. They search because something needs to be ready: a home after a long week, a boardroom before a client visit, a flat before a new tenant arrives, or an Airbnb before guests check in.",
          "The best cleaning service is not only about the clean. It is about reducing the mental load around the clean. Who is coming? What time? Do they understand the space? Can I book the same trusted person again? What happens if something changes?",
        ],
      },
      {
        heading: "What to check before booking a cleaner",
        body: [
          "For Bryanston, Rosebank, Sandton, Hyde Park and nearby premium-home areas, the right cleaning setup should answer four questions before anyone arrives: what service is needed, what access details are sensitive, what products or room priorities matter, and how support works if plans change.",
          "That is why Zoot is built around profiles, booking status, saved preferences, safer in-app communication, and support escalation. A cleaner should not need gate codes in a random chat thread. A host should not rebuild turnover instructions every week. An office manager should not chase updates while preparing for meetings.",
        ],
      },
      {
        heading: "Common searches Zoot is built around",
        body: [
          "Cleaning in Bryanston usually means a premium home reset, recurring domestic cleaning, deep cleaning, or moving clean. Where can I find a cleaner in Rosebank often means someone needs trusted help quickly without giving up quality. On demand cleaning services for business points to offices, studios, clinics, salons, and teams that need reliable cleaning without hiring full-time staff.",
          "Quick cleaning for my office is a different intent again. It is time-sensitive, practical, and usually connected to a meeting, inspection, event, or Monday morning reset. Zoot content and service pages should continue to answer these exact use cases suburb by suburb as coverage expands.",
        ],
      },
      {
        heading: "Why premium does not have to feel complicated",
        body: [
          "A premium cleaning experience should feel calm. You choose the service, confirm the area, save the important home or office notes, and keep communication inside the app. For repeat clients, Care+ is designed to make that even smoother with home memory, favourite Zooter rebooking, smart reminders, and member benefits.",
          "That matters in high-trust spaces. Homes, offices, short-term rentals, and landlord handovers all carry private details. The process should respect that from the first booking to the final review.",
        ],
      },
      {
        heading: "What happens as Zoot expands",
        body: [
          "The first local priority is Johannesburg launch density. After that, expansion should move carefully into more of Gauteng, including Pretoria, and then into Cape Town once supply, support, and quality controls are ready.",
          "That slower approach is deliberate. Cleaning is local. Trust is local. A good platform should win one area properly before promising the whole country overnight.",
        ],
      },
    ],
    faqs: [
      {
        question: "Can I book cleaning in Bryanston with Zoot?",
        answer:
          "Bryanston is one of Zoot's priority launch areas. Coverage still depends on live availability and final launch approvals at the time of booking.",
      },
      {
        question: "Does Zoot support office cleaning?",
        answer:
          "Yes. Zoot includes office-cleaning workflows for quick resets, recurring cleaning, and business spaces that need trusted on-demand help.",
      },
      {
        question: "Can Airbnb hosts use Zoot?",
        answer:
          "Yes. Zoot is designed to support Airbnb turnover cleaning, landlord handovers, property profiles, saved instructions, and repeat booking workflows.",
      },
    ],
  },
];

export const getBlogPost = (slug: string | undefined) => blogPosts.find((post) => post.slug === slug) ?? null;
