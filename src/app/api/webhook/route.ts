import { db } from "@/lib/db";
import { userSubscriptions } from "@/lib/db/schema";
import { stripe } from "@/lib/stripe";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request) {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("Stripe-Signature") as string;
    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SIGNING_SECRET as string
        );
    } catch (_error) {
        return new NextResponse("webhook error", { status: 400 });
    }

    if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
        ) as Stripe.Subscription;
        if (!session?.metadata?.userId) {
            return new NextResponse("no userid", { status: 400 });
        }
        await db.insert(userSubscriptions).values({
            userId: session.metadata.userId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            stripePriceId: subscription.items.data[0].price.id,
            stripeCurrentPeriodEnd: new Date(
                Date.now() + 30 * 24 * 60 * 60 * 1000
            ),
        });
    }

    if (event.type === "invoice.payment_succeeded") {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = (invoice as Stripe.Invoice & { subscription: string }).subscription;
        if (!subscriptionId) {
            return new NextResponse(null, { status: 200 });
        }
        const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
        ) as Stripe.Subscription;
        await db
            .update(userSubscriptions)
            .set({
                stripePriceId: subscription.items.data[0].price.id,
                stripeCurrentPeriodEnd: new Date(
                    Date.now() + 30 * 24 * 60 * 60 * 1000
                ),
            })
            .where(eq(userSubscriptions.stripeSubscriptionId, subscription.id));
    }

    return new NextResponse(null, { status: 200 });
}