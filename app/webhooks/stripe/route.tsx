import db from "@/dev/dev";
import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { Resend } from "resend";

// This page listens to Stripe API
// Have not created it as I had to download Stripe CLI

const stripe = new Stripe(process.env.STRIPE_WEBHOOK_SECRET as string);

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const event = stripe.webhooks.constructEvent(
    await req.text(),
    req.headers.get("stripe-signature") as string,
    process.env.STRIPE_WEBHOOK_SECRET as string
  );

  if (event.type === "charge.succeeded") {
    const charge = event.data.object;
    const productId = charge.metadata.productId;
    const email = charge.billing_details.email;
    const pricePaid = charge.amount;

    const product = await db.product.findUnique({ where: { id: productId } });
    if (product == null || email == null)
      return new NextResponse("Bad Request", { status: 400 });

    const userFields = {
      email,
      orders: { create: { productId, pricePaid } },
    };
    const {
      Order: [order],
    } = await db.user.upsert({
      where: { email },
      create: userFields,
      update: userFields,
      select: { Order: { orderBy: { createdAt: "desc" }, take: 1 } },
    });

    const downloadVerification = await db.downloadVerification.create({
      data: {
        productId,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });

    await resend.emails.send({
      from: `Support<${process.env.SENDER_EMAIL}>`,
      to: email,
      subject: "Order Confirmation",
      react: <h1>Hi</h1>,
    });

    return new NextResponse();
  }
}
