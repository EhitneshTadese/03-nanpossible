import type {
  CertificationDocument,
  CertificationRecertificationRule,
  CertificationTrack,
  CertificationTrackKey,
} from "@/lib/types";

type CertificationProgressionStep = {
  title: string;
  body: string;
};

export const certificationHero = {
  eyebrow: "Global certification hub",
  title: "Certification pathways, renewal expectations, and LMS access in one place.",
  intro:
    "WIAL certification remains one global standard. This hub lays out the four coaching levels, the progression path between them, the application packets WIAL uses today, the renewal requirements that keep credentials current, and the external LMS links coaches already rely on.",
  metrics: [
    { label: "Certification levels", value: "4" },
    { label: "Renewal cycle", value: "1–2 yrs" },
    { label: "Badge workflow", value: "Credly" },
  ],
  anchors: [
    { id: "calc", label: "CALC" },
    { id: "palc", label: "PALC" },
    { id: "salc", label: "SALC" },
    { id: "malc", label: "MALC" },
    { id: "progression", label: "Progression" },
    { id: "recertification", label: "Recertification" },
    { id: "forms", label: "Forms" },
    { id: "lms", label: "LMS" },
  ],
} as const;

export const certificationTracks: CertificationTrack[] = [
  {
    key: "calc",
    level: "CALC",
    anchor: "calc",
    title: "Certified Action Learning Coach",
    tagline: "The first formal WIAL coaching credential.",
    summary:
      "CALC is the entry point into formal WIAL certification. It focuses on practical team coaching proficiency, observed coaching, written reflection, and an understanding of the full Action Learning process.",
    eligibility: [
      "Complete the WIAL Foundations, CALC1, and CALC2 sequence, or an approved intensive that blends the full curriculum.",
      "Use the Foundations program as the pre-requisite for CALC1 and CALC2.",
      "Train with a SALC or MALC lead while progressively increasing coaching proficiency.",
    ],
    requirements: [
      "Participate in the Foundations program and both CALC workshops or the combined intensive track.",
      "Coach Action Learning sessions in CALC1 and CALC2 and receive feedback from peers and the lead.",
      "Submit the CALC certification paper and related reflections described in the current requirements packet.",
      "Use the WIAL portal route when recertifying after a lapse of more than two years, or arrange an audited session with a S/MALC as outlined in the current policy.",
    ],
    progressionLabel:
      "Start here, then build coaching hours and longer-term project experience before applying for PALC.",
    lmsSummary:
      "Use the LMS to access the CALC e-learning material, micro-learning modules, and recertification refresh options.",
  },
  {
    key: "palc",
    level: "PALC",
    anchor: "palc",
    title: "Professional Action Learning Coach",
    tagline: "For CALCs with documented practice and longer-term project depth.",
    summary:
      "PALC recognizes coaches who have already built a serious body of Action Learning work and can lead an introductory WIAL learning experience under senior observation.",
    eligibility: [
      "Be a Certified Action Learning Coach (CALC).",
      "Document one hundred (100) hours of Action Learning coaching, including at least one longer-term project that spans weeks or months.",
      "Count at least fifty (50) hours as WIAL Action Learning coaching; the remaining hours may include WIAL continuing education or volunteer participation.",
    ],
    requirements: [
      "Submit an engagement list and a report documenting the challenges and learnings from the longer-term Action Learning project.",
      "Lead a Leading with Questions or Introduction to Action Learning session observed by a SALC or MALC.",
      "Complete the PALC application packet and committee review process.",
    ],
    progressionLabel:
      "PALC is the bridge from coached participation to independently leading introductory Action Learning experiences.",
    lmsSummary:
      "Use the LMS as the launch point for the PALC-related learning path, prerequisite refreshers, and supporting course access.",
  },
  {
    key: "salc",
    level: "SALC",
    anchor: "salc",
    title: "Senior Action Learning Coach",
    tagline: "For experienced coaches ready to lead core WIAL certification programs.",
    summary:
      "SALC marks the move into senior coaching leadership. The current WIAL requirements focus on observed program leadership, critique of participant work, and committee-level review.",
    eligibility: [
      "Hold the documented coaching-hour threshold described in the current SALC requirements packet, including at least one longer-term project with a minimum of four 90-minute sessions.",
      "Count a minimum of fifty (50) hours as coaching; the balance may include WIAL-sponsored or organized continuing education activity.",
      "PALCs typically satisfy part of this project requirement through their PALC application work.",
    ],
    requirements: [
      "Secure sponsorship from a MALC who has recently observed the candidate's CALC-level coaching ability.",
      "Lead certification coursework while observed and submit the required critique of written participant reports.",
      "Complete the SALC application and committee review process.",
    ],
    progressionLabel:
      "SALC is the step that clears a coach to lead core certification experiences and mentor developing coaches.",
    lmsSummary:
      "The LMS remains the external launch point for senior-level WIAL learning pathways and program access; the website does not duplicate those courses.",
  },
  {
    key: "malc",
    level: "MALC",
    anchor: "malc",
    title: "Master Action Learning Coach",
    tagline: "The highest WIAL certification level and thought-leadership track.",
    summary:
      "MALC is designed for seasoned SALCs who combine significant coaching volume with published thought leadership, conference presence, and continued service to the WIAL method.",
    eligibility: [
      "Be a Senior Action Learning Coach for at least three years.",
      "Document five hundred (500) hours of Action Learning coaching, training, and/or consulting across diverse clients and projects.",
      "Demonstrate thought leadership through conference presentation, external publication, and steady contribution to the WIAL community.",
    ],
    requirements: [
      "Secure sponsorship from a MALC and complete the MALC review process.",
      "Provide evidence of publishing, presenting, and broader contribution to Action Learning outside routine delivery work.",
      "Submit the MALC application packet used by WIAL today.",
    ],
    progressionLabel:
      "MALC is the capstone path for senior coaches who also contribute as visible thought leaders in the wider Action Learning field.",
    lmsSummary:
      "The website links outward to WIAL's existing LMS and does not duplicate advanced learning modules or credential-management workflows.",
  },
];

export const certificationProgression: CertificationProgressionStep[] = [
  {
    title: "CALC",
    body: "Build core Action Learning coaching proficiency through Foundations, CALC1, CALC2, and written reflection.",
  },
  {
    title: "PALC",
    body: "Add documented coaching hours, a longer-term project, and observed delivery of an introductory WIAL learning experience.",
  },
  {
    title: "SALC",
    body: "Lead certification experiences under MALC sponsorship, critique participant work, and demonstrate readiness for senior program leadership.",
  },
  {
    title: "MALC",
    body: "Combine senior-level experience with publication, presenting, mentoring, and broad contribution to the WIAL method.",
  },
];

export const certificationRecertificationRules: CertificationRecertificationRule[] = [
  {
    track: "calc",
    validity: "2 years",
    annualRequirements: [
      "Document at least 5 hours of Action Learning coaching during the prior two years.",
      "Submit a short project write-up or testimonial to the Director of Certification.",
      "Complete at least one WIAL volunteer or continuing education activity from the current renewal categories.",
    ],
    expiredPolicy: [
      "If the credential expired within two years, renew by meeting the standard CALC renewal requirements.",
      "If the credential expired for more than two years, complete the WIAL portal e-learning assessments or arrange an audited session with a S/MALC as described in the CALC packet.",
    ],
  },
  {
    track: "palc",
    validity: "2 years",
    annualRequirements: [
      "Document at least 10 hours of Action Learning coaching during the prior two years.",
      "Submit a brief project description that may be used in WIAL newsletter, website, or social content.",
      "Complete at least two WIAL volunteer or continuing education activities from the current renewal categories.",
    ],
  },
  {
    track: "salc",
    validity: "2 years",
    annualRequirements: [
      "Document at least 10 hours of WIAL Action Learning during the prior two years.",
      "Complete at least three WIAL volunteer and/or continuing education activities.",
      "Lead at least one program, mentor two qualified CALCs or certify one CALC candidate successfully, and review certification papers when requested.",
    ],
  },
  {
    track: "malc",
    validity: "1 year",
    annualRequirements: [
      "Document at least 10 hours of WIAL Action Learning during the prior two years.",
      "Participate in an annual WIAL conference or other sanctioned event, or actively volunteer with a local affiliate or WIAL committee.",
      "Lead at least one WIAL program, help certify a CALC candidate, publish and present, contribute a newsletter article, and review certification papers in a timely manner.",
    ],
  },
];

export const certificationDocuments: CertificationDocument[] = [
  {
    id: "calc-requirements",
    track: "calc",
    kind: "requirements",
    label: "CALC requirements PDF",
    href: "https://wial.org/wp-content/uploads/CALC_Certification_Requirements_V2023.pdf",
    sourceUrl: "https://wial.org/wp-content/uploads/CALC_Certification_Requirements_V2023.pdf",
    mirrored: false,
    fileType: "pdf",
    updatedLabel: "Current requirements packet",
  },
  {
    id: "calc-application",
    track: "calc",
    kind: "application",
    label: "CALC application form",
    href: "/downloads/certification/calc-application.doc",
    sourceUrl: "https://wial.org/wp-content/uploads/CALC_Application_2020_Oct.doc",
    mirrored: true,
    fileType: "doc",
    updatedLabel: "Mirrored from the current WIAL application form",
  },
  {
    id: "calc-sample-paper",
    track: "calc",
    kind: "sample",
    label: "CALC sample paper",
    href: "https://wial.org/wp-content/uploads/WIAL-CALC-Sample-Paper-V2020.pdf",
    sourceUrl: "https://wial.org/wp-content/uploads/WIAL-CALC-Sample-Paper-V2020.pdf",
    mirrored: false,
    fileType: "pdf",
    updatedLabel: "Current sample paper download",
  },
  {
    id: "calc-renewal",
    track: "calc",
    kind: "recertification",
    label: "CALC renewal and lapse policy",
    href: "https://wial.org/wp-content/uploads/CALC_Certification_Requirements_V2023.pdf",
    sourceUrl: "https://wial.org/wp-content/uploads/CALC_Certification_Requirements_V2023.pdf",
    mirrored: false,
    fileType: "pdf",
    updatedLabel: "Renewal rules are included in the current CALC packet",
  },
  {
    id: "palc-requirements",
    track: "palc",
    kind: "requirements",
    label: "PALC requirements PDF",
    href: "https://wial.org/wp-content/uploads/PALC_Certification_Requirements_V2022.pdf",
    sourceUrl: "https://wial.org/wp-content/uploads/PALC_Certification_Requirements_V2022.pdf",
    mirrored: false,
    fileType: "pdf",
    updatedLabel: "Current requirements packet",
  },
  {
    id: "palc-application",
    track: "palc",
    kind: "application",
    label: "PALC application form",
    href: "/downloads/certification/palc-application.doc",
    sourceUrl: "https://wial.org/wp-content/uploads/PALC_Application_2020_Oct.doc",
    mirrored: true,
    fileType: "doc",
    updatedLabel: "Mirrored from the current WIAL application form",
  },
  {
    id: "palc-renewal",
    track: "palc",
    kind: "recertification",
    label: "PALC renewal requirements",
    href: "https://wial.org/wp-content/uploads/PALC_Certification_Requirements_V2022.pdf",
    sourceUrl: "https://wial.org/wp-content/uploads/PALC_Certification_Requirements_V2022.pdf",
    mirrored: false,
    fileType: "pdf",
    updatedLabel: "Renewal rules are included in the current PALC packet",
  },
  {
    id: "salc-requirements",
    track: "salc",
    kind: "requirements",
    label: "SALC requirements PDF",
    href: "https://wial.org/wp-content/uploads/SALC_Certification_Requirements_V2022.pdf",
    sourceUrl: "https://wial.org/wp-content/uploads/SALC_Certification_Requirements_V2022.pdf",
    mirrored: false,
    fileType: "pdf",
    updatedLabel: "Current requirements packet",
  },
  {
    id: "salc-application",
    track: "salc",
    kind: "application",
    label: "SALC application form",
    href: "/downloads/certification/salc-application.doc",
    sourceUrl: "https://wial.org/wp-content/uploads/SALC_Application_2020_Oct.doc",
    mirrored: true,
    fileType: "doc",
    updatedLabel: "Mirrored from the current WIAL application form",
  },
  {
    id: "salc-renewal",
    track: "salc",
    kind: "recertification",
    label: "SALC renewal requirements",
    href: "https://wial.org/wp-content/uploads/SALC_Certification_Requirements_V2022.pdf",
    sourceUrl: "https://wial.org/wp-content/uploads/SALC_Certification_Requirements_V2022.pdf",
    mirrored: false,
    fileType: "pdf",
    updatedLabel: "Renewal rules are included in the current SALC packet",
  },
  {
    id: "malc-requirements",
    track: "malc",
    kind: "requirements",
    label: "MALC requirements PDF",
    href: "https://wial.org/wp-content/uploads/MALC-CertificationRequirements-202006.pdf",
    sourceUrl: "https://wial.org/wp-content/uploads/MALC-CertificationRequirements-202006.pdf",
    mirrored: false,
    fileType: "pdf",
    updatedLabel: "Current requirements packet",
  },
  {
    id: "malc-application",
    track: "malc",
    kind: "application",
    label: "MALC application form",
    href: "/downloads/certification/malc-application.doc",
    sourceUrl: "https://wial.org/wp-content/uploads/MALC_Application_2020_Oct.doc",
    mirrored: true,
    fileType: "doc",
    updatedLabel: "Mirrored from the current WIAL application form",
  },
  {
    id: "malc-renewal",
    track: "malc",
    kind: "recertification",
    label: "MALC renewal requirements",
    href: "https://wial.org/wp-content/uploads/MALC-CertificationRequirements-202006.pdf",
    sourceUrl: "https://wial.org/wp-content/uploads/MALC-CertificationRequirements-202006.pdf",
    mirrored: false,
    fileType: "pdf",
    updatedLabel: "Renewal rules are included in the current MALC packet",
  },
  {
    id: "badge-faq",
    track: "global",
    kind: "faq",
    label: "Digital badging FAQ",
    href: "https://wial.org/wp-content/uploads/WIAL-Certification-Digital-Badging-FAQs.pdf",
    sourceUrl: "https://wial.org/wp-content/uploads/WIAL-Certification-Digital-Badging-FAQs.pdf",
    mirrored: false,
    fileType: "pdf",
    updatedLabel: "Current Credly and badging FAQ",
  },
];

export function getCertificationDocumentsForTrack(
  track: CertificationTrackKey,
  kind?: CertificationDocument["kind"],
) {
  return certificationDocuments.filter((document) => {
    if (document.track !== track) {
      return false;
    }

    return kind ? document.kind === kind : true;
  });
}

