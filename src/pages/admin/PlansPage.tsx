import { useEffect, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  getBillingStatus,
  getCurrentSubscription,
  listActivePlans,
  openBillingPortal,
  requestPlanUpgrade,
  startCardCheckout,
  subscribeToPlan,
  type Subscription,
} from "@/services/plans.service";
import { extractErrorMessage } from "@/services/api-client";
import { formatDate } from "@/utils/format";
import { CHANNEL_LABELS, extraPlanFeatures } from "@/utils/plans";
import type { Plan } from "@/types/api";

const DURATION_KEYS: Record<Plan["duration"], string> = {
  MONTHLY: "platformPlans.monthly",
  YEARLY: "platformPlans.yearly",
  LIFETIME: "platformPlans.lifetime",
};

export function PlansPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [manualPlanId, setManualPlanId] = useState<string | null>(null);
  const [paymentReference, setPaymentReference] = useState("");
  const { data: plans, isLoading } = useQuery({
    queryKey: ["plans"],
    queryFn: listActivePlans,
  });
  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: getCurrentSubscription,
  });
  const { data: billing } = useQuery({
    queryKey: ["billing-status"],
    queryFn: getBillingStatus,
  });
  const cardBillingEnabled = billing?.cardBillingEnabled ?? false;

  // Stripe sends the owner back here with ?billing=success|cancelled. The plan
  // itself changes when Stripe's webhook lands, usually within seconds.
  useEffect(() => {
    const result = searchParams.get("billing");
    if (!result) return;
    if (result === "success") {
      toast.success(t("plans.cardPaymentReceived"));
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
      void queryClient.invalidateQueries({ queryKey: ["plan-entitlements"] });
    } else {
      toast(t("plans.cardPaymentCancelled"));
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams, queryClient, t]);

  // Free is the one plan a store can switch to by itself, and it takes effect
  // at once: whatever was paid for beyond today is not refunded or carried over.
  const switchToFree = (planId: string) => {
    if (
      subscription &&
      Number(subscription.plan.price) > 0 &&
      !subscription.lapsed
    ) {
      const message = subscription.expiresAt
        ? t("plans.confirmDowngradeUntil", {
            plan: subscription.plan.name,
            date: formatDate(subscription.expiresAt),
          })
        : t("plans.confirmDowngrade", { plan: subscription.plan.name });
      if (!confirm(message)) return;
    }
    subscribeMutation.mutate(planId);
  };

  const onError = (error: unknown) =>
    toast.error(extractErrorMessage(error, t("errors.generic")));

  const subscribeMutation = useMutation({
    mutationFn: subscribeToPlan,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
      void queryClient.invalidateQueries({ queryKey: ["plan-entitlements"] });
      toast.success(t("common.save"));
    },
    onError,
  });

  const requestUpgradeMutation = useMutation({
    mutationFn: requestPlanUpgrade,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["subscription"] });
      setManualPlanId(null);
      setPaymentReference("");
      toast.success(t("plans.upgradeRequested"));
    },
    onError,
  });

  const redirectTo = ({ url }: { url: string }) => window.location.assign(url);
  const checkoutMutation = useMutation({
    mutationFn: startCardCheckout,
    onSuccess: redirectTo,
    onError,
  });
  const portalMutation = useMutation({
    mutationFn: openBillingPortal,
    onSuccess: redirectTo,
    onError,
  });

  if (isLoading)
    return <p className="text-sm text-gray-500">{t("common.loading")}</p>;

  const busy =
    requestUpgradeMutation.isPending ||
    subscribeMutation.isPending ||
    checkoutMutation.isPending ||
    portalMutation.isPending;
  const paysByCard = !!subscription?.stripeSubscriptionId;
  const hasPendingRequest = subscription?.status === "PENDING_UPGRADE";

  function manualForm(planId: string) {
    return (
      <form
        className="mt-3 flex flex-col gap-2 rounded-lg bg-gray-50 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          requestUpgradeMutation.mutate({ planId, paymentReference });
        }}
      >
        <p className="text-xs text-gray-600">{t("plans.manualInstructions")}</p>
        <Input
          label={t("plans.paymentReference")}
          placeholder={t("plans.paymentReferencePlaceholder")}
          value={paymentReference}
          maxLength={200}
          onChange={(e) => setPaymentReference(e.target.value)}
        />
        <div className="flex gap-2">
          <Button
            type="submit"
            loading={requestUpgradeMutation.isPending}
            className="flex-1"
          >
            {t("plans.sendRequest")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setManualPlanId(null)}
          >
            {t("common.cancel")}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold text-gray-900">
        {t("nav.plans")}
      </h1>

      {subscription && (
        <SubscriptionStatus
          subscription={subscription}
          plans={plans ?? []}
          busy={busy}
          onManageBilling={() => portalMutation.mutate()}
          onRenew={() => setManualPlanId(subscription.planId)}
          renewForm={
            manualPlanId === subscription.planId
              ? manualForm(subscription.planId)
              : null
          }
        />
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {plans?.map((plan) => {
          const isCurrent =
            subscription?.planId === plan.id && !subscription.lapsed;
          const isPending =
            hasPendingRequest && subscription?.requestedPlanId === plan.id;
          const isFree = Number(plan.price) === 0;
          // A card subscriber changes plan through a new checkout (the old
          // subscription is cancelled, unused time credited); manual requests
          // are for stores not paying by card.
          const canRequestManually = !isFree && !paysByCard;

          return (
            <Card
              key={plan.id}
              className={isCurrent ? "ring-2 ring-brand-600" : ""}
            >
              <h2 className="text-lg font-semibold text-gray-900">
                {plan.name}
              </h2>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                ${plan.price}{" "}
                <span className="text-sm font-normal text-gray-500">
                  /{t(DURATION_KEYS[plan.duration]).toLowerCase()}
                </span>
              </p>
              <ul className="mt-3 flex flex-col gap-1 text-sm text-gray-600">
                <li>
                  •{" "}
                  {plan.maxStores === -1
                    ? t("platformPlans.unlimitedStores")
                    : t("platformPlans.storesCount", { count: plan.maxStores })}
                </li>
                <li>
                  •{" "}
                  {plan.maxProducts === -1
                    ? t("platformPlans.unlimitedProducts")
                    : t("platformPlans.productsCount", {
                        count: plan.maxProducts,
                      })}
                </li>
                <li>
                  • {t("plans.checkoutChannels")}:{" "}
                  {plan.fulfillmentMethods
                    .map((m) => CHANNEL_LABELS[m])
                    .join(", ")}
                </li>
                {extraPlanFeatures(plan).map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>

              {isCurrent || isPending ? (
                <Button className="mt-4 w-full" variant="secondary" disabled>
                  {isCurrent
                    ? t("plans.currentPlan")
                    : t("plans.pendingApproval")}
                </Button>
              ) : isFree ? (
                <Button
                  className="mt-4 w-full"
                  disabled={busy || paysByCard}
                  onClick={() => switchToFree(plan.id)}
                >
                  {t("plans.subscribe")}
                </Button>
              ) : (
                <div className="mt-4 flex flex-col gap-2">
                  {cardBillingEnabled && (
                    <Button
                      className="w-full"
                      loading={
                        checkoutMutation.isPending &&
                        checkoutMutation.variables === plan.id
                      }
                      disabled={busy}
                      onClick={() => checkoutMutation.mutate(plan.id)}
                    >
                      {t("plans.payByCard")}
                    </Button>
                  )}
                  {canRequestManually && manualPlanId !== plan.id && (
                    <Button
                      className="w-full"
                      variant={cardBillingEnabled ? "secondary" : "primary"}
                      disabled={busy || hasPendingRequest}
                      onClick={() => setManualPlanId(plan.id)}
                    >
                      {cardBillingEnabled
                        ? t("plans.payManually")
                        : t("plans.requestUpgrade")}
                    </Button>
                  )}
                </div>
              )}
              {canRequestManually &&
                manualPlanId === plan.id &&
                !isCurrent &&
                manualForm(plan.id)}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function SubscriptionStatus({
  subscription,
  plans,
  busy,
  onManageBilling,
  onRenew,
  renewForm,
}: {
  subscription: Subscription;
  plans: Plan[];
  busy: boolean;
  onManageBilling: () => void;
  onRenew: () => void;
  renewForm: ReactNode;
}) {
  const { t } = useTranslation();
  const {
    expiresAt,
    graceEndsAt,
    lapsed,
    cancelAtPeriodEnd,
    stripeSubscriptionId,
    stripeCustomerId,
  } = subscription;
  const plan = subscription.plan.name;
  const paid = Number(subscription.plan.price) > 0;
  const expired = !!expiresAt && new Date(expiresAt) <= new Date();
  const requestedPlan = plans.find(
    (p) => p.id === subscription.requestedPlanId,
  );

  let message: string;
  let tone = "bg-gray-50 text-gray-700";
  if (!paid || !expiresAt) {
    message = t("plans.statusNoExpiry", { plan });
  } else if (lapsed) {
    message = t("plans.statusLapsed", { plan });
    tone = "bg-red-50 text-red-800";
  } else if (expired) {
    message = t("plans.statusGrace", {
      plan,
      date: formatDate(expiresAt),
      graceDate: graceEndsAt ? formatDate(graceEndsAt) : "",
    });
    tone = "bg-amber-50 text-amber-800";
  } else if (stripeSubscriptionId && !cancelAtPeriodEnd) {
    message = t("plans.statusAutoRenews", {
      plan,
      date: formatDate(expiresAt),
    });
  } else if (stripeSubscriptionId) {
    message = t("plans.statusCancelled", { plan, date: formatDate(expiresAt) });
    tone = "bg-amber-50 text-amber-800";
  } else {
    message = t("plans.statusActiveUntil", {
      plan,
      date: formatDate(expiresAt),
    });
  }

  const canRenewManually =
    paid &&
    !!expiresAt &&
    !lapsed &&
    !stripeSubscriptionId &&
    subscription.status !== "PENDING_UPGRADE";

  return (
    <Card className={`mb-6 ${tone}`}>
      <p className="text-sm">{message}</p>
      {subscription.status === "PENDING_UPGRADE" && requestedPlan && (
        <p className="mt-1 text-sm">
          {t("plans.statusPendingRequest", { plan: requestedPlan.name })}
          {subscription.requestedPaymentReference &&
            ` (${subscription.requestedPaymentReference})`}
        </p>
      )}
      {(stripeCustomerId || (canRenewManually && !renewForm)) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {stripeCustomerId && (
            <Button
              variant="secondary"
              disabled={busy}
              onClick={onManageBilling}
            >
              {t("plans.manageBilling")}
            </Button>
          )}
          {canRenewManually && !renewForm && (
            <Button variant="secondary" disabled={busy} onClick={onRenew}>
              {t("plans.renewManually")}
            </Button>
          )}
        </div>
      )}
      {renewForm}
    </Card>
  );
}
