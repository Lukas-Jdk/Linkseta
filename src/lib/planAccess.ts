// src/lib/planAccess.ts
export type PlanSlug = "free-trial" | "basic" | "premium";

type PlanLike = {
  slug?: string | null;
  isTrial?: boolean | null;
  maxListings?: number | null;
  maxImagesPerListing?: number | null;
};

type ProfileLike = {
  lifetimeFree?: boolean | null;
  trialEndsAt?: Date | string | null;
  plan?: PlanLike | null;
  stripeSubscriptionId?: string | null;
  subscriptionStatus?: string | null;
};

export function isTrialActive(profile: ProfileLike | null | undefined) {
  if (!profile?.plan?.isTrial) return false;
  if (!profile.trialEndsAt) return false;

  return new Date(profile.trialEndsAt).getTime() > Date.now();
}

export function isStripeActive(status?: string | null) {
  return status === "active" || status === "trialing" || status === "past_due";
}

export function hasActiveProviderAccess(
  profile: ProfileLike | null | undefined,
) {
  if (!profile) return false;
  if (profile.lifetimeFree) return true;
  if (isTrialActive(profile)) return true;
  if (
    profile.stripeSubscriptionId &&
    isStripeActive(profile.subscriptionStatus)
  ) {
    return true;
  }

  return false;
}

export function hasPremiumAccess(profile: ProfileLike | null | undefined) {
  if (!profile) return false;
  if (profile.lifetimeFree) return true;
  if (isTrialActive(profile)) return true;

  return (
    profile.plan?.slug === "premium" &&
    Boolean(profile.stripeSubscriptionId) &&
    isStripeActive(profile.subscriptionStatus)
  );
}

export function getPlanLimits(profile: ProfileLike | null | undefined) {
  const premiumLike = hasPremiumAccess(profile);

  const basicLike =
    hasActiveProviderAccess(profile) &&
    !premiumLike &&
    profile?.plan?.slug === "basic";

  const trialLike =
    hasActiveProviderAccess(profile) && !premiumLike && profile?.plan?.isTrial;

  if (premiumLike) {
    return {
      maxListings: 5,
      maxImagesPerListing: 30,

      canUseChat: true,
      canCollectReviews: true,
      canBecomeTopRated: true,
    };
  }

  if (basicLike) {
    return {
      maxListings: 3,
      maxImagesPerListing: 15,

      canUseChat: false,
      canCollectReviews: true,
      canBecomeTopRated: true,
    };
  }

  if (trialLike) {
    return {
      maxListings: 3,
      maxImagesPerListing: 15,

      canUseChat: true,
      canCollectReviews: true,
      canBecomeTopRated: true,
    };
  }

  return {
    maxListings: 0,
    maxImagesPerListing: 0,

    canUseChat: false,
    canCollectReviews: false,
    canBecomeTopRated: false,
  };
}

export function getPublicPlanLabel(profile: ProfileLike | null | undefined) {
  if (!profile) return "No plan";
  if (profile.lifetimeFree) return "Lifetime";
  if (isTrialActive(profile)) return "Free Trial";
  if (profile.plan?.slug === "premium") return "Premium";
  if (profile.plan?.slug === "basic") return "Basic";
  return "No plan";
}
