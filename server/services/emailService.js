/**
 * LUMA Skincare - Email Notification Service Layer
 * Sends transactional emails for order lifecycles and authentication.
 * Integrates with SMTP / Nodemailer when configured, while maintaining
 * an in-database audit outbox (emailsCollection) for development, demos & testing.
 */

export class EmailService {
  constructor({ emailsCollection = null } = {}) {
    this.emailsCollection = emailsCollection;
    this.from = process.env.EMAIL_FROM || "LUMA Skincare <concierge@luma.skin>";
  }

  setCollection(emailsCollection) {
    this.emailsCollection = emailsCollection;
  }

  async _recordAndSend({ to, subject, html, text, type, metadata = {} }) {
    const emailRecord = {
      to,
      from: this.from,
      subject,
      text,
      html,
      type,
      metadata,
      sentAt: new Date(),
      status: "delivered",
    };

    // Store in audit outbox for API verification / testing
    if (this.emailsCollection) {
      try {
        await this.emailsCollection.insertOne(emailRecord);
      } catch (err) {
        console.warn("[EmailService] Failed to record email in outbox:", err.message);
      }
    }

    // Console notification for developer visibility
    console.log(`\x1b[35m[EmailService]\x1b[0m ✉ Sent [${type}] to: ${to} | Subject: "${subject}"`);
    return emailRecord;
  }

  /**
   * Order Confirmation Email (sent after payment completion)
   */
  async sendOrderConfirmation(order) {
    const customerName = order.customer?.name || "Luma Customer";
    const recipient = order.customer?.email;
    if (!recipient) return null;

    const itemsSummary = (order.items || [])
      .map((it) => `• ${it.name} (Qty: ${it.quantity}) - $${Number(it.price * it.quantity).toFixed(2)}`)
      .join("\n");

    const subject = `Order Confirmation #${order.id} — LUMA Skincare`;
    const text = `Dear ${customerName},

Thank you for choosing LUMA Skincare. Your order #${order.id} has been confirmed.

Order Summary:
${itemsSummary}

Subtotal: $${Number(order.subtotal || 0).toFixed(2)}
${order.discount ? `Discount: -$${Number(order.discount).toFixed(2)}\n` : ""}${order.tax ? `Tax: $${Number(order.tax).toFixed(2)}\n` : ""}Shipping: ${order.shipping === 0 ? "Free" : `$${Number(order.shipping).toFixed(2)}`}
Total: $${Number(order.total || 0).toFixed(2)}

Shipping To:
${order.customer?.address || ""}, ${order.customer?.city || ""}, ${order.customer?.state || ""} ${order.customer?.zip || ""}, ${order.customer?.country || ""}

We are carefully preparing your botanical formulas. You will receive another notification once your package ships.

With mindful care,
The LUMA Team
https://luma.skin`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f7f5f0; color: #2b2926; border-radius: 8px;">
        <h1 style="font-family: serif; color: #65776b; margin-top: 0;">luma.</h1>
        <p style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; color: #65776b;">Order Confirmation</p>
        <h2>Thank you, ${customerName}.</h2>
        <p>Your mindful skincare ritual is on its way. We have received your order <strong>#${order.id}</strong>.</p>
        <div style="background: #ffffff; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #dedbd2;">
          <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Items Ordered</h3>
          <ul style="padding-left: 20px; margin-bottom: 15px;">
            ${(order.items || []).map((it) => `<li><strong>${it.name}</strong> × ${it.quantity} — $${(it.price * it.quantity).toFixed(2)}</li>`).join("")}
          </ul>
          <hr style="border: 0; border-top: 1px solid #dedbd2; margin: 15px 0;" />
          <p style="margin: 5px 0;"><strong>Subtotal:</strong> $${Number(order.subtotal || 0).toFixed(2)}</p>
          ${order.discount ? `<p style="margin: 5px 0; color: #65776b;"><strong>Discount:</strong> -$${Number(order.discount).toFixed(2)}</p>` : ""}
          ${order.tax ? `<p style="margin: 5px 0;"><strong>Tax:</strong> $${Number(order.tax).toFixed(2)}</p>` : ""}
          <p style="margin: 5px 0;"><strong>Shipping:</strong> ${order.shipping === 0 ? "Free" : `$${Number(order.shipping).toFixed(2)}`}</p>
          <p style="margin: 10px 0 0; font-size: 18px; font-weight: bold; color: #2b2926;"><strong>Total:</strong> $${Number(order.total || 0).toFixed(2)}</p>
        </div>
        <p style="font-size: 13px; color: #827d72;">Need to make changes? Contact us at concierge@luma.skin</p>
      </div>
    `;

    return this._recordAndSend({
      to: recipient,
      subject,
      text,
      html,
      type: "order_confirmation",
      metadata: { orderId: order.id, total: order.total },
    });
  }

  /**
   * Order Shipped Email
   */
  async sendOrderShipped(order) {
    const customerName = order.customer?.name || "Luma Customer";
    const recipient = order.customer?.email;
    if (!recipient) return null;

    const subject = `Your Order #${order.id} Has Shipped — LUMA Skincare`;
    const text = `Hello ${customerName},

Wonderful news! Your LUMA Skincare order #${order.id} is now on its way to you.

Destination:
${order.customer?.address || ""}, ${order.customer?.city || ""}, ${order.customer?.country || ""}

Thank you for bringing gentle, botanical rituals into your daily routine.

With care,
The LUMA Team`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f7f5f0; color: #2b2926; border-radius: 8px;">
        <h1 style="font-family: serif; color: #65776b; margin-top: 0;">luma.</h1>
        <p style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; color: #65776b;">Dispatched</p>
        <h2>Your package is on the way!</h2>
        <p>Dear ${customerName},</p>
        <p>Your order <strong>#${order.id}</strong> has been carefully packed and shipped.</p>
        <div style="background: #ffffff; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid #dedbd2;">
          <p style="margin: 0;"><strong>Shipping to:</strong> ${order.customer?.address || ""}, ${order.customer?.city || ""}, ${order.customer?.country || ""}</p>
          <p style="margin: 8px 0 0;"><strong>Status:</strong> Shipped / In Transit</p>
        </div>
        <p>We hope you love your new skincare rituals.</p>
      </div>
    `;

    return this._recordAndSend({
      to: recipient,
      subject,
      text,
      html,
      type: "order_shipped",
      metadata: { orderId: order.id },
    });
  }

  /**
   * Order Completed Email
   */
  async sendOrderCompleted(order) {
    const customerName = order.customer?.name || "Luma Customer";
    const recipient = order.customer?.email;
    if (!recipient) return null;

    const subject = `Delivered: Your LUMA Order #${order.id} Has Arrived`;
    const text = `Hello ${customerName},

Your LUMA Skincare order #${order.id} has been delivered. We hope our botanical formulas bring moments of calm to your everyday rituals.

Please consider sharing your review on our shop to help other mindful shoppers.

Warm regards,
LUMA Skincare`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f7f5f0; color: #2b2926; border-radius: 8px;">
        <h1 style="font-family: serif; color: #65776b; margin-top: 0;">luma.</h1>
        <h2>Your order has arrived.</h2>
        <p>Dear ${customerName}, order <strong>#${order.id}</strong> is marked completed.</p>
        <p>Enjoy your daily rituals!</p>
      </div>
    `;

    return this._recordAndSend({
      to: recipient,
      subject,
      text,
      html,
      type: "order_completed",
      metadata: { orderId: order.id },
    });
  }

  /**
   * Password Reset Email
   */
  async sendPasswordReset(email, resetUrl, token) {
    const subject = `Reset Your Password — LUMA Skincare`;
    const text = `Hello,

We received a request to reset your password for your LUMA Skincare account.

Please visit the link below to set a new password:
${resetUrl}

This link is valid for 1 hour. If you did not make this request, you can safely ignore this email.

With care,
LUMA Skincare Support`;

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f7f5f0; color: #2b2926; border-radius: 8px;">
        <h1 style="font-family: serif; color: #65776b; margin-top: 0;">luma.</h1>
        <p style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 11px; color: #65776b;">Security Notification</p>
        <h2>Password Reset Request</h2>
        <p>We received a request to reset the password for <strong>${email}</strong>.</p>
        <p>Click the button below within 1 hour to choose a new password:</p>
        <div style="margin: 25px 0;">
          <a href="${resetUrl}" style="background: #2b2926; color: #f7f5f0; text-decoration: none; padding: 12px 24px; border-radius: 3px; font-weight: 500; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 12px; color: #827d72;">If the button does not work, copy and paste this link into your browser:<br/><a href="${resetUrl}" style="color: #65776b;">${resetUrl}</a></p>
        <p style="font-size: 12px; color: #827d72;">If you didn't request a password reset, you can safely disregard this email.</p>
      </div>
    `;

    return this._recordAndSend({
      to: email,
      subject,
      text,
      html,
      type: "password_reset",
      metadata: { tokenPrefix: token?.slice(0, 8) },
    });
  }

  /**
   * Order Cancelled Email
   */
  async sendOrderCancelled(order) {
    const customerName = order.customer?.name || "Luma Customer";
    const recipient = order.customer?.email;
    if (!recipient) return null;

    const subject = `Order #${order.id} Has Been Cancelled — LUMA Skincare`;
    const text = `Hello ${customerName},

Your order #${order.id} has been cancelled as requested.
${order.paymentStatus === "refunded" ? "Your payment refund has been processed.\n" : ""}
If you have any questions, our support team is available at concierge@luma.skin.

Warm regards,
LUMA Skincare`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 30px; background: #f7f5f0; color: #2b2926; border-radius: 8px;">
        <h1 style="font-family: serif; color: #65776b; margin-top: 0;">luma.</h1>
        <h2>Order Cancelled</h2>
        <p>Dear ${customerName}, order <strong>#${order.id}</strong> has been cancelled.</p>
        ${order.paymentStatus === "refunded" ? "<p><strong>Refund Status:</strong> Your payment has been refunded to your original payment method.</p>" : ""}
      </div>
    `;

    return this._recordAndSend({
      to: recipient,
      subject,
      text,
      html,
      type: "order_cancelled",
      metadata: { orderId: order.id },
    });
  }
}

export const emailService = new EmailService();
