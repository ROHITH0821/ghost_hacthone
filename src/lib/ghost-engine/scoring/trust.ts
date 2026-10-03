import type { ContextPack } from "../types";
import type { DimensionScore, ScoreCheck } from "./types";
import {
  applyChecklist,
  hasNavItem,
  hasPhone,
  hasWhatsApp,
  isLocationStated,
  normalize,
  pageText,
} from "./utils";

export function scoreTrust(pack: ContextPack): DimensionScore {
  const checks: ScoreCheck[] = [];
  const text = pageText(pack);

  const reviewsVisible = !!pack.reviews?.visible;
  checks.push({
    id: "reviews_visible",
    label: "Reviews or testimonials are visible on the site.",
    passed: reviewsVisible,
    points: reviewsVisible ? 8 : -6,
    evidence: pack.reviews?.notes ?? (reviewsVisible ? "Context Pack: reviews.visible=true" : "Context Pack: reviews.visible=false"),
  });

  const phone = hasPhone(pack);
  checks.push({
    id: "phone_present",
    label: "A phone number is visible as a contact option.",
    passed: phone,
    points: phone ? 6 : -8,
    evidence: pack.contact_paths.join(" | ") || "No contact paths listed.",
  });

  const wa = hasWhatsApp(pack);
  checks.push({
    id: "whatsapp_present",
    label: "WhatsApp is available as a contact path.",
    passed: wa,
    points: wa ? 5 : 0,
    evidence: pack.contact_paths.join(" | ") || "No contact paths listed.",
  });

  const locStated = isLocationStated(pack);
  checks.push({
    id: "address_or_location",
    label: "Business location/address is stated.",
    passed: locStated,
    points: locStated ? 6 : -5,
    evidence: pack.business.location || "Location missing from Context Pack.",
  });

  const about = hasNavItem(pack, [/about/, /our story/, /who we are/, /team/]) || /about us|our team|who we are/i.test(text);
  checks.push({
    id: "about_or_team",
    label: "An About/Team page or equivalent trust section is present.",
    passed: about,
    points: about ? 5 : 0,
    evidence: about ? "Nav/pages indicate About/Team content." : "No About/Team content detected in nav/pages.",
  });

  const credentials = /award|certif|licensed|iso|years of experience|since \d{4}/i.test(text);
  checks.push({
    id: "credentials",
    label: "Credentials/awards/experience claims are present (as trust signals).",
    passed: credentials,
    points: credentials ? 4 : 0,
    evidence: credentials ? "Trust signals mention credentials/awards/experience." : "No credentials/awards signals detected.",
  });

  const realPhotos = /photo|gallery|our work|portfolio|inside|team photo|shopfront/i.test(normalize(text));
  checks.push({
    id: "real_images",
    label: "Real photos (team, shopfront, work/portfolio) are indicated.",
    passed: realPhotos,
    points: realPhotos ? 4 : 0,
    evidence: realPhotos ? "Visual notes/trust signals suggest real imagery." : "No strong evidence of real imagery detected.",
  });

  const { value } = applyChecklist(55, checks);
  return {
    id: "trust",
    label: "Trust & Credibility",
    weight: 0.2,
    value,
    contribution: Math.round(value * 0.2),
    checks,
  };
}

